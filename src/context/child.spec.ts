#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }    from 'tstest'

import * as child   from './child.js'

test('child.* smoke testing', async t => {
  t.ok(child, 'tbw')
})
