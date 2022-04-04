#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }             from 'tstest'
import { createMachine }    from 'xstate'

import { AddressImpl }    from '../impls/mod.js'
import { from }           from '../from.js'

import { isMailbox }    from './is-mailbox.js'
test('isMailbox() true', async t => {
  const machine = createMachine({})
  const mailbox = from(machine)

  t.ok(isMailbox(mailbox), 'should recognize mailbox instance')
})

test('isMailbox() false', async t => {
  t.notOk(isMailbox({}), 'should recognize non-mailbox object')
})

test('isMailbox with Address', async t => {
  const ID = 'id'
  const address = AddressImpl.from(ID)

  t.notOk(isMailbox(address), 'should identify an address instance is not Mailbox')
})
