#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }    from 'tstest'

import { address }   from './address.js'

test('tbw', async t => {
  t.ok(address, 'tbw')
})
