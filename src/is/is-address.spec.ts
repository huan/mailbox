#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }           from 'tstest'
import { createMachine }  from 'xstate'

import { AddressImpl }  from '../impls/address-implementation.js'
import { from }         from '../from.js'

import { isAddress }    from './is-address.js'

test('isAddress() true', async t => {
  const ID = 'id'
  const address = AddressImpl.from(ID)

  t.ok(isAddress(address), 'should recognize address instance')
})

test('isAddress() false', async t => {
  t.notOk(isAddress({}), 'should recognize non-address object')
})

test('isAddress() with Mailbox', async t => {
  const machine = createMachine({})
  const mailbox = from(machine)
  t.notOk(isAddress(mailbox), 'should identify that the mailbox instance not an address')
})
