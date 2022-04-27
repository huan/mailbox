#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }    from 'tstest'

import * as origin        from '../origin/mod.js'
import { initialContext } from '../initial-context.js'

import { enqueue }        from './enqueue.js'

test('enqueue', async t => {
  const CONTEXT = initialContext()
  const EVENT = {
    type: 'test-type',
    [origin.metaSymKey]: {
      origin: 'test-origin',
    },
  }

  t.equal(enqueue.type, 'xstate.assign', 'should be in `assign` type')

  const queue = (enqueue.assignment as any).queue(CONTEXT, EVENT, { _event: { origin: 'test-origin' } })
  t.same(queue, [ EVENT ], 'should enqueue event to context.queue')
})
