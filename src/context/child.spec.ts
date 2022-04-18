#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }    from 'tstest'

import * as child   from './child.js'

test('tbw', async t => {
  t.ok(child, 'tbw')
})
