#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import {
  test,
}                   from 'tstest'

import { idle }  from './mod.js'

test('idle()', async t => {
  t.ok(idle, 'tbw')
})
