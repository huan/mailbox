#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  test,
  sinon,
}                   from 'tstest'
import {
  actions,
  ActorRef,
  createMachine,
  GuardMeta,
  interpret,
  SCXML,
}                 from 'xstate'

import * as contexts                  from './contexts.js'
import { MAILBOX_TARGET_MACHINE_ID }  from './options.js'

test('assignEnqueue', async t => {
  const CONTEXT = contexts.initialContext()
  const EVENT = {
    type: 'test-type',
    [contexts.metaSymKey]: {
      origin: 'test-origin',
    },
  }

  t.equal(contexts.assignEnqueue.type, 'xstate.assign', 'should be in `assign` type')

  const queue = (contexts.assignEnqueue.assignment as any).queue(CONTEXT, EVENT, { _event: { origin: 'test-origin' } })
  t.same(queue, [EVENT], 'should enqueue event to context.queue')
})

test('queueSize()', async t => {
  const EMPTY_CONTEXT = contexts.initialContext()

  const NONEMPTY_CONTEXT = contexts.initialContext()
  NONEMPTY_CONTEXT.queue = [{} as any]

  t.equal(contexts.queueSize(EMPTY_CONTEXT), 0, 'should be empty when queue is empty')
  t.equal(contexts.queueSize(NONEMPTY_CONTEXT), 1, 'should be not empty when queue has one message')

  NONEMPTY_CONTEXT.index = 1
  t.equal(contexts.queueSize(NONEMPTY_CONTEXT), 0, 'should be empty when index set to 1')
})

test('assignEmptyQueue()', async t => {
  const queue = contexts.assignEmptyQueue.assignment.queue({} as any)
  t.same(queue, [], 'should be empty queue')
  const index = contexts.assignEmptyQueue.assignment.index({} as any)
  t.equal(index, 0, 'should be index 0')
})

test('assignDequeue()', async t => {
  const EVENT = {
    type: 'test-type',
    [contexts.metaSymKey]: {
      origin: 'test-origin',
    },
  }

  const CONTEXT = contexts.initialContext()
  CONTEXT.queue = [EVENT]

  t.same(CONTEXT.queue, [EVENT], 'should be one EVENT before dequeue event')
  const index = contexts.assignDequeue.assignment.index(CONTEXT, undefined, { _event: {} })
  t.same(CONTEXT.queue, [EVENT], 'should be one EVENT after dequeue event')
  t.equal(index, 1, 'should be at index 1 after dequeue event')
})

test('condEventSentFromChildOf', async t => {
  const SESSION_ID = 'session-id'

  const _EVENT = {
    origin: SESSION_ID,
  } as any as SCXML.Event<any>

  const CHILDREN: Record<string, ActorRef<any, any>> = {
    [MAILBOX_TARGET_MACHINE_ID]: {
      sessionId: SESSION_ID,
    } as any as ActorRef<any, any>,
  }

  const META = {
    _event: _EVENT,
    state: { children: CHILDREN },
  } as GuardMeta<any, any>

  t.ok(contexts.condEventSentFromChildOf(MAILBOX_TARGET_MACHINE_ID)(META), 'should return true if the event origin is the child session id')

  META._event.origin = undefined
  t.notOk(contexts.condEventSentFromChildOf(MAILBOX_TARGET_MACHINE_ID)(META), 'should return false if the event origin is undefined')
})

test('condEventCanBeAcceptedByChildOf()', async t => {
  const CHILD_ID = 'child-id-testing'

  const childMachine = createMachine({
    on: {
      CHILD_TEST: {
        actions: actions.log('EVENT:CHILD_TEST'),
      },
      // '*': {
      //   actions: actions.log('EVENT:*')
      // }
    },
  })

  const spy = sinon.spy()
  const parentMachine = createMachine({
    invoke: {
      src: childMachine,
      id: CHILD_ID,
    },
    on: {
      PARENT_TEST: {
        actions: actions.choose([
          {
            cond: (_, __, { state }) => contexts.condEventCanBeAcceptedByChildOf(CHILD_ID)(state, 'UNKNOWN'),
            actions: () => spy('UNKONWN'),
          },
          {
            cond: (_, __, { state }) => contexts.condEventCanBeAcceptedByChildOf(CHILD_ID)(state, 'CHILD_TEST'),
            actions: () => spy('CHILD_TEST'),
          },
        ]),
      },
    },
  })

  const interpreter = interpret(parentMachine)

  interpreter.start()
  interpreter.send('PARENT_TEST')

  t.ok(spy.calledOnce, 'should be called once')
  t.equal(spy.args[0]![0], 'CHILD_TEST', 'should choose the CHILD_TEST')
})
