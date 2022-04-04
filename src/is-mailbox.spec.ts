#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }             from 'tstest'
import { createMachine }    from 'xstate'

import * as Mailbox   from './mods/mod.js'

import { isMailbox }  from './is-mailbox.js'

test('isMailbox() true', async t => {
  const machine = createMachine({})
  const mailbox = Mailbox.from(machine)

  t.ok(isMailbox(mailbox), 'should recognize mailbox instance')
})

test('isMailbox() false', async t => {
  t.notOk(isMailbox({}), 'should recognize non-mailbox object')
})
