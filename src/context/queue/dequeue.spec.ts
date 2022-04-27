#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }    from 'tstest'

import * as origin        from '../origin/mod.js'

import { initialContext } from '../initial-context.js'

import { dequeue }    from './dequeue.js'

test('dequeue()', async t => {
  const EVENT = {
    type: 'test-type',
    [origin.metaSymKey]: {
      origin: 'test-origin',
    },
  }

  const CONTEXT = initialContext()
  CONTEXT.queue = [ EVENT ]

  t.same(CONTEXT.queue, [ EVENT ], 'should be one EVENT before dequeue event')
  const index = (dequeue.assignment as any).index(CONTEXT, undefined, { _event: {} })
  t.same(CONTEXT.queue, [ EVENT ], 'should be one EVENT after dequeue event')
  t.equal(index, 1, 'should be at index 1 after dequeue event')
})
