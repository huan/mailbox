#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }    from 'tstest'

import * as request   from './request.js'

test('tbw', async t => {
  t.ok(request, 'tbw')
})
