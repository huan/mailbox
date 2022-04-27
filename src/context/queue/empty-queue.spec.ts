#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }    from 'tstest'

import { emptyQueue }   from './empty-queue.js'

test('emptyQueue()', async t => {
  const queue = (emptyQueue.assignment as any).queue({} as any)
  t.same(queue, [], 'should be empty queue')
  const index = (emptyQueue.assignment as any).index({} as any)
  t.equal(index, 0, 'should be index 0')
})
