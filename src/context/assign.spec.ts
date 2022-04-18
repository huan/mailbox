#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }    from 'tstest'

import * as origin        from './origin.js'
import { initialContext } from './initial-context.js'

import * as assign        from './assign.js'

test('assignEnqueue', async t => {
  const CONTEXT = initialContext()
  const EVENT = {
    type: 'test-type',
    [origin.metaSymKey]: {
      origin: 'test-origin',
    },
  }

  t.equal(assign.assignEnqueue.type, 'xstate.assign', 'should be in `assign` type')

  const queue = (assign.assignEnqueue.assignment as any).queue(CONTEXT, EVENT, { _event: { origin: 'test-origin' } })
  t.same(queue, [ EVENT ], 'should enqueue event to context.queue')
})

test('assignEmptyQueue()', async t => {
  const queue = assign.assignEmptyQueue.assignment.queue({} as any)
  t.same(queue, [], 'should be empty queue')
  const index = assign.assignEmptyQueue.assignment.index({} as any)
  t.equal(index, 0, 'should be index 0')
})

test('assignDequeue()', async t => {
  const EVENT = {
    type: 'test-type',
    [origin.metaSymKey]: {
      origin: 'test-origin',
    },
  }

  const CONTEXT = initialContext()
  CONTEXT.queue = [ EVENT ]

  t.same(CONTEXT.queue, [ EVENT ], 'should be one EVENT before dequeue event')
  const index = assign.assignDequeue.assignment.index(CONTEXT, undefined, { _event: {} })
  t.same(CONTEXT.queue, [ EVENT ], 'should be one EVENT after dequeue event')
  t.equal(index, 1, 'should be at index 1 after dequeue event')
})
