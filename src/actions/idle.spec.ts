#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  test,
}                   from 'tstest'

import * as MailboxActions  from './mod.js'

test('idle()', async t => {
  t.ok(MailboxActions.idle, 'tbw')
})
