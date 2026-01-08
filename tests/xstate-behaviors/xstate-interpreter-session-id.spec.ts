#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * XState v5 Behavior: Actor Session ID
 *
 * Tests that actor IDs are consistent throughout the actor lifecycle.
 */
/* eslint-disable sort-keys */

import { test } from '#test-helpers'

// Standard ESM imports from XState v5
import { setup, createActor } from 'xstate'

test('XState v5: actor should have consistent sessionId', async t => {
  const machine = setup({}).createMachine({
    id: 'test',
  })

  const actor = createActor(machine)

  const sessionId = actor.sessionId
  t.ok(sessionId, 'should get a valid sessionId before start')

  actor.start()
  t.equal(actor.sessionId, sessionId, 'should be consistent sessionId after start')

  actor.stop()
  t.equal(actor.sessionId, sessionId, 'should be consistent sessionId after stop')
})
