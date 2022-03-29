#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import {
  test,
}                   from 'tstest'

import {
  createMachine,
}                   from 'xstate'

import * as DingDong  from '../tests/fixtures/ding-dong-machine.js'
import * as Baby      from '../tests/fixtures/baby-machine.js'

import { validate } from './validate.js'

test('validate() DingDong & Baby machines', async t => {
  t.ok(validate(DingDong.machine), 'should be valid for DingDong.machine')
  t.ok(validate(Baby.machine), 'should be valid for Baby.machine')
})

test('validate() empty machine', async t => {
  const emptyMachine = createMachine({})
  t.throws(() => validate(emptyMachine), 'should not valid for an empty machine')
})
