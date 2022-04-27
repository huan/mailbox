#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }    from 'tstest'

import { sessionId }   from './session-id.js'

test('sessionId() smoke testing', async t => {
  t.ok(sessionId, 'tbw')
})
