#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Proxy Action Test
 *
 * This test was previously for Mailbox.actions.proxy() with a Mailbox target.
 * The functionality is now covered by integration-v5.spec.ts which tests
 * proxy actions with the v5 Mailbox implementation.
 *
 * See: tests/integration-v5.spec.ts - 'Mailbox.actions.proxy() forwards events'
 */
/* eslint-disable sort-keys */

import { test } from '#test-helpers'

// Standard ESM imports from XState v5
import { setup, createActor, sendTo } from 'xstate'

test('proxy() action forwards events to target actor', async t => {
  /**
   * Test that proxy() action forwards incoming events to a target actor.
   * This tests the basic proxy pattern where one machine forwards events.
   */
  const receivedEvents: any[] = []

  // Target machine that receives proxied events
  const targetMachine = setup({
    actions: {
      recordEvent: ({ event }: any) => {
        receivedEvents.push(event)
      },
    },
  }).createMachine({
    id: 'target',
    initial: 'listening',
    states: {
      listening: {
        on: {
          PING: { actions: 'recordEvent' },
          PONG: { actions: 'recordEvent' },
        },
      },
    },
  })

  // Proxy machine that forwards all events to target
  const proxyMachine = setup({
    actors: {
      target: targetMachine,
    },
    actions: {
      forwardToTarget: sendTo('target', ({ event }: any) => event),
    },
  }).createMachine({
    id: 'proxy',
    initial: 'active',
    invoke: {
      id: 'target',
      src: 'target',
    },
    states: {
      active: {
        on: {
          '*': {
            actions: 'forwardToTarget',
          },
        },
      },
    },
  })

  const actor = createActor(proxyMachine)
  actor.start()

  actor.send({ type: 'PING' })
  actor.send({ type: 'PONG' })

  await new Promise(r => setTimeout(r, 10))

  t.ok(
    receivedEvents.some(e => e.type === 'PING'),
    'target should receive PING'
  )
  t.ok(
    receivedEvents.some(e => e.type === 'PONG'),
    'target should receive PONG'
  )

  actor.stop()
})
