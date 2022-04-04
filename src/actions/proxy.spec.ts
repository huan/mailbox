#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import {
  test,
}                   from 'tstest'

import { proxy }  from './proxy.js'

test('proxy()', async t => {
  t.ok(proxy, 'tbw')
})
