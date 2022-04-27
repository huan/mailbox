#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }    from 'tstest'

import { message }   from './message.js'

test('tbw', async t => {
  t.ok(message, 'tbw')
})
