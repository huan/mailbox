#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }    from 'tstest'

import { actorReply }   from './actor-reply.js'

test('actorReply() smoke testing', async t => {
  t.ok(actorReply, 'tbw')
})
