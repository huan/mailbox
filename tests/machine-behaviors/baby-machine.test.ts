#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Baby Machine Tests - v4 Tests Removed
 *
 * The original Baby machine tests used XState v4 patterns that are
 * incompatible with XState v5.
 *
 * The Baby machine module (baby-machine.js) is still used by:
 * - src/validate.spec.ts - Tests that validate() works with Baby.machine
 * - src/impls/get-actor-machine.spec.ts - Tests getActorMachine()
 *
 * Educational machine behavior tests are now in:
 * - tests/machine-behaviors/ding-dong-machine.spec.ts - Message loss without Mailbox
 * - tests/machine-behaviors/coffee-maker-machine.spec.ts - Message loss without Mailbox
 */
import { test } from '#test-helpers'
import Baby from './baby-machine.js'

test('Baby machine is exported', async (t) => {
  t.ok(Baby, 'Baby module should be exported')
  t.ok(Baby.machine, 'Baby.machine should exist')
})
