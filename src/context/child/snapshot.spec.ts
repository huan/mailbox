#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }    from 'tstest'

import { snapshot }   from './snapshot.js'

test('snapshot() smoke testing', async t => {
  t.ok(snapshot, 'tbw')
})
