#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  test,
}                   from 'tstest'

import * as MailboxActions  from './mod.js'

test('proxy()', async t => {
  t.ok(MailboxActions.proxy, 'tbw')
})
