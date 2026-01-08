#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * XState v5 Behavior: snapshot.can() Method
 *
 * Tests the snapshot.can() method which checks if an event can trigger a transition.
 * This works the same in v5 as v4, but uses createActor instead of interpret.
 */
/* eslint-disable sort-keys */

import { test } from '#test-helpers'

// Standard ESM imports from XState v5
import { setup, createActor } from 'xstate'

test('XState v5: snapshot.can() with specific event handler', async t => {
  const testMachine = setup({
    actions: {
      logTest: () => console.log('EVENT:TEST'),
    },
  }).createMachine({
    id: 'TestMachine',
    initial: 'ready',
    states: {
      ready: {
        on: {
          TEST: {
            actions: 'logTest',
          },
        },
      },
    },
  })

  const actor = createActor(testMachine)
  actor.start()

  const snapshot = actor.getSnapshot()

  t.ok(snapshot.can({ type: 'TEST' }), 'should be able to send event TEST')
  t.notOk(snapshot.can({ type: 'XXX' }), 'should not be able to send event XXX')

  actor.stop()
})

test('XState v5: snapshot.can() with wildcard (*) event handler', async t => {
  const testMachine = setup({
    actions: {
      logAny: () => console.log('EVENT:*'),
    },
  }).createMachine({
    id: 'WildcardMachine',
    initial: 'ready',
    states: {
      ready: {
        on: {
          '*': {
            actions: 'logAny',
          },
        },
      },
    },
  })

  const actor = createActor(testMachine)
  actor.start()

  const snapshot = actor.getSnapshot()

  t.ok(snapshot.can({ type: 'TEST' }), 'should be able to send event TEST')
  t.ok(snapshot.can({ type: 'XXX' }), 'should be able to send event XXX')

  actor.stop()
})
