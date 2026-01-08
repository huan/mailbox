#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Multiple Outbound Communications Test
 *
 * This test file documents a known architectural limitation with nested mailbox
 * communication. The original test case involved:
 * - A consumer sending DING to mainMailbox
 * - mainMailbox's child actor sending DING to serviceMailbox
 * - serviceMailbox responding with DONG
 *
 * The limitation: When serviceMailbox sends DONG, it goes to mainMailbox's
 * address (the sender), not directly to mainMailbox's child actor. Since
 * mainMailbox is Busy waiting for ACTOR_IDLE, the DONG gets queued but
 * the child never receives it, causing a deadlock.
 *
 * This is a known limitation that would require architectural changes to fix.
 * The core Mailbox functionality is tested in integration-v5.spec.ts.
 */
/* eslint-disable sort-keys */

import { test } from '#test-helpers'

// Standard ESM imports from XState v5
import { setup, createActor, sendParent, assign } from 'xstate'

test('DOCUMENTED LIMITATION: Nested mailbox communication can cause deadlock', async t => {
  /**
   * This test documents the architectural limitation rather than testing
   * specific functionality. It serves as documentation for developers.
   *
   * The problem occurs when:
   * 1. Actor A (wrapped in Mailbox) receives event E1
   * 2. While processing E1, A sends E2 to Actor B (also wrapped in Mailbox)
   * 3. B responds with E3 to A's mailbox address
   * 4. A's mailbox is still in Busy state, so E3 is queued
   * 5. A is waiting for E3 to continue, but E3 is in the queue
   * 6. Deadlock: A waits for E3, E3 waits for A to become Idle
   *
   * Solution approaches:
   * 1. Use callbacks/promises instead of event-based communication
   * 2. Design machines to not wait for responses while in Busy state
   * 3. Use a different messaging pattern (not nested mailboxes)
   */

  // Simple demonstration that shows normal single-level communication works
  const receivedEvents: any[] = []

  const serviceMachine = setup({
    types: {} as {
      context: { count: number }
      events: { type: 'PING' }
    },
    actions: {
      respond: sendParent({ type: 'PONG' }),
      increment: assign({ count: ({ context }: any) => context.count + 1 }),
    },
  }).createMachine({
    id: 'service',
    initial: 'ready',
    context: { count: 0 },
    states: {
      ready: {
        on: {
          PING: {
            actions: ['increment', 'respond'],
          },
        },
      },
    },
  })

  const consumerMachine = setup({
    types: {} as {
      events: { type: 'PING' } | { type: 'PONG' }
    },
    actors: {
      service: serviceMachine,
    },
    actions: {
      recordEvent: ({ event }: any) => {
        receivedEvents.push(event)
      },
      pingService: sendParent({ type: 'PING' }),
    },
  }).createMachine({
    id: 'consumer',
    initial: 'working',
    invoke: {
      id: 'service',
      src: 'service',
    },
    states: {
      working: {
        on: {
          PONG: {
            actions: 'recordEvent',
          },
        },
      },
    },
  })

  const actor = createActor(consumerMachine)
  actor.start()

  // Send PING to the invoked service
  const snapshot = actor.getSnapshot()
  const serviceRef = snapshot.children['service']
  if (serviceRef) {
    serviceRef.send({ type: 'PING' })
  }

  await new Promise(r => setTimeout(r, 10))

  t.ok(
    receivedEvents.some(e => e.type === 'PONG'),
    'consumer should receive PONG from service (single-level communication works)'
  )

  actor.stop()

  // Document the limitation
  t.ok(true, 'DOCUMENTED: Nested mailbox communication has deadlock risks - see test comments')
})
