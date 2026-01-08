#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Educational Tests: Why Mailbox Exists
 *
 * These tests demonstrate the problem that Mailbox solves:
 * When a state machine is busy processing one message, additional incoming
 * messages are LOST because XState doesn't queue them automatically.
 *
 * Mailbox wraps a machine to provide:
 * 1. Message queuing - messages are buffered when the machine is busy
 * 2. Sequential processing - messages are processed one at a time
 * 3. No message loss - all messages are eventually processed
 */
/* eslint-disable sort-keys */

import { test } from '#test-helpers'

// Standard ESM imports from XState v5
import { setup, createActor, sendTo, sendParent, assign } from 'xstate'

// Note: We intentionally DON'T use Mailbox here to demonstrate the problem it solves

// Simple DingDong machine WITHOUT mailbox wrapping
// This demonstrates message loss when multiple events arrive
const createDingDongMachine = (delayMs: number = 10) => setup({
  types: {} as {
    context: { lastValue: number | null }
    events: { type: 'DING', value: number }
  },
  actions: {
    storeValue: assign({
      lastValue: ({ event }: any) => event.value,
    }),
    sendDongToParent: sendParent(({ context }: any) => ({
      type: 'DONG',
      value: context.lastValue,
    })),
  },
}).createMachine({
  id: 'DingDong',
  initial: 'idle',
  context: { lastValue: null },
  states: {
    idle: {
      on: {
        DING: {
          target: 'busy',
          actions: 'storeValue',
        },
      },
    },
    busy: {
      after: {
        [delayMs]: {
          target: 'idle',
          actions: 'sendDongToParent',
        },
      },
      // NOTE: While in 'busy' state, additional DING events are IGNORED
      // This is the problem Mailbox solves!
    },
  },
})

test('EDUCATIONAL: DingDong processes one DING event correctly', async t => {
  /**
   * This test shows the happy path - a single DING event is processed correctly.
   * The machine receives DING, transitions to busy, waits, then sends DONG.
   */
  const replies: Array<{ type: string, value: number }> = []

  // Create a parent machine that invokes DingDong and collects replies
  const parentMachine = setup({
    types: {} as {
      context: Record<string, never>
      events: { type: 'DING', value: number } | { type: 'DONG', value: number }
    },
    actors: {
      dingDong: createDingDongMachine(5),
    },
  }).createMachine({
    id: 'Parent',
    initial: 'testing',
    context: {},
    invoke: {
      id: 'child',
      src: 'dingDong',
    },
    states: {
      testing: {
        on: {
          DING: {
            actions: sendTo('child', ({ event }: any) => event),
          },
          DONG: {
            actions: ({ event }: any) => {
              replies.push({ type: 'DONG', value: event.value })
            },
          },
        },
      },
    },
  })

  const actor = createActor(parentMachine)
  actor.start()

  // Send one DING
  actor.send({ type: 'DING', value: 42 })

  // Wait for processing
  await new Promise(r => setTimeout(r, 50))

  t.equal(replies.length, 1, 'should receive exactly 1 DONG reply')
  t.equal(replies[0]?.value, 42, 'should receive DONG with correct value')

  actor.stop()
})

test('EDUCATIONAL: Without Mailbox, messages are LOST when machine is busy', async t => {
  /**
   * THIS TEST DEMONSTRATES THE PROBLEM MAILBOX SOLVES!
   *
   * When we send multiple DING events rapidly:
   * - First DING: Machine transitions to 'busy', starts processing
   * - Second DING: Machine is in 'busy' state, event is IGNORED (no handler)
   * - Third DING: Same - IGNORED
   *
   * Result: Only 1 DONG reply, 2 messages LOST!
   *
   * With Mailbox.from(machine):
   * - All 3 DINGs would be queued
   * - Processed sequentially
   * - All 3 DONGs would be received
   */
  const replies: Array<{ type: string, value: number }> = []

  const parentMachine = setup({
    types: {} as {
      context: Record<string, never>
      events: { type: 'DING', value: number } | { type: 'DONG', value: number }
    },
    actors: {
      dingDong: createDingDongMachine(10),
    },
  }).createMachine({
    id: 'Parent',
    initial: 'testing',
    context: {},
    invoke: {
      id: 'child',
      src: 'dingDong',
    },
    states: {
      testing: {
        on: {
          DING: {
            actions: sendTo('child', ({ event }: any) => event),
          },
          DONG: {
            actions: ({ event }: any) => {
              replies.push({ type: 'DONG', value: event.value })
            },
          },
        },
      },
    },
  })

  const actor = createActor(parentMachine)
  actor.start()

  // Send 3 DING events rapidly (before first one finishes processing)
  actor.send({ type: 'DING', value: 0 })
  actor.send({ type: 'DING', value: 1 })
  actor.send({ type: 'DING', value: 2 })

  // Wait long enough for all processing to complete
  await new Promise(r => setTimeout(r, 100))

  // WITHOUT MAILBOX: Only the first message is processed!
  t.equal(
    replies.length,
    1,
    'WITHOUT MAILBOX: Only 1 of 3 messages processed (2 LOST!)'
  )
  t.equal(
    replies[0]?.value,
    0,
    'Only the first DING (value=0) was processed'
  )

  // This is why Mailbox exists - to queue messages and process them sequentially
  // See integration-v5.spec.ts for the Mailbox solution that processes all 3 messages.

  actor.stop()
})
