#!/usr/bin/env -S npx ts-node --esm
/**
 * Tests for the validate() function
 *
 * The validate() function checks that a machine satisfies the Mailbox protocol:
 * - Sends ACTOR_IDLE to parent on initialization
 */

import { createMachine } from 'xstate'
import { test } from '#test-helpers'

import * as Mailbox from './mods/mod.js'

test('validate() passes for valid mailbox-addressable machine', async (t) => {
  // A properly structured machine that signals idle
  const validMachine = createMachine({
    id: 'valid-machine',
    initial: 'idle',
    states: {
      idle: {
        entry: Mailbox.actions.idle('valid-machine'),
        on: {
          WORK: 'working',
        },
      },
      working: {
        always: 'idle',
      },
    },
  })

  t.ok(Mailbox.validate(validMachine), 'should pass validation for valid machine')
})

test('validate() throws for machine without ACTOR_IDLE on init', async (t) => {
  // Machine that doesn't signal idle on initialization
  const invalidMachine = createMachine({
    id: 'invalid-machine',
    initial: 'idle',
    states: {
      idle: {
        // Missing: Mailbox.actions.idle('invalid-machine')
        on: {
          WORK: 'working',
        },
      },
      working: {
        always: 'idle',
      },
    },
  })

  let threw = false
  let caughtError: Error | undefined

  try {
    Mailbox.validate(invalidMachine)
  } catch (error) {
    threw = true
    caughtError = error as Error
  }

  t.ok(threw, 'should throw an error')
  t.ok(caughtError instanceof Mailbox.MailboxValidationError, 'should throw MailboxValidationError')
  t.ok(caughtError?.message.includes('ACTOR_IDLE'), 'error message should mention ACTOR_IDLE')
})

test('validate() works with DingDong-style machine', async (t) => {
  // A machine similar to DingDong that responds to events with delays
  const dingDongMachine = createMachine({
    id: 'ding-dong',
    initial: 'idle',
    states: {
      idle: {
        entry: Mailbox.actions.idle('ding-dong'),
        on: {
          DING: 'responding',
        },
      },
      responding: {
        after: {
          10: {
            target: 'idle',
            actions: Mailbox.actions.reply({ type: 'DONG' }),
          },
        },
      },
    },
  })

  t.ok(Mailbox.validate(dingDongMachine), 'should pass validation for DingDong-style machine')
})

test('validate() works with immediate response machine', async (t) => {
  // A machine that responds immediately and returns to idle
  const workerMachine = createMachine({
    id: 'worker',
    initial: 'idle',
    states: {
      idle: {
        entry: Mailbox.actions.idle('worker'),
        on: {
          WORK: 'working',
        },
      },
      working: {
        entry: Mailbox.actions.reply({ type: 'DONE' }),
        always: 'idle',
      },
    },
  })

  t.ok(Mailbox.validate(workerMachine), 'should pass validation for immediate response machine')
})

test('MailboxValidationError has correct name and message', async (t) => {
  const error = new Mailbox.MailboxValidationError('test message')
  t.equal(error.name, 'MailboxValidationError', 'should have correct error name')
  t.ok(error.message.includes('test message'), 'should include the message')
  t.ok(error.message.includes('Mailbox Validation Error'), 'should include error prefix')
})
