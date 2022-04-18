#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }    from 'tstest'

import { initialContext } from './initial-context.js'

import * as queue   from './queue.js'

test('queueSize()', async t => {
  const EMPTY_CONTEXT = initialContext()

  const NONEMPTY_CONTEXT = initialContext()
  NONEMPTY_CONTEXT.queue = [ {} as any ]

  t.equal(queue.size(EMPTY_CONTEXT), 0, 'should be empty when queue is empty')
  t.equal(queue.size(NONEMPTY_CONTEXT), 1, 'should be not empty when queue has one message')

  NONEMPTY_CONTEXT.index = 1
  t.equal(queue.size(NONEMPTY_CONTEXT), 0, 'should be empty when index set to 1')
})
