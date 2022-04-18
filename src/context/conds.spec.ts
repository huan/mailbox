#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test, sinon }    from 'tstest'
import {
  actions,
  ActorRef,
  createMachine,
  GuardMeta,
  interpret,
  SCXML,
}                         from 'xstate'

import { MAILBOX_TARGET_MACHINE_ID }  from '../impls/constants.js'

import * as conds   from './conds.js'

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

  t.ok(conds.condEventSentFrom(MAILBOX_TARGET_MACHINE_ID)(META), 'should return true if the event origin is the child session id')

  META._event.origin = undefined
  t.notOk(conds.condEventSentFrom(MAILBOX_TARGET_MACHINE_ID)(META), 'should return false if the event origin is undefined')
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
            cond: (_, __, { state }) => conds.condEventCanBeAcceptedByChildOf(CHILD_ID)(state, 'UNKNOWN'),
            actions: () => spy('UNKONWN'),
          },
          {
            cond: (_, __, { state }) => conds.condEventCanBeAcceptedByChildOf(CHILD_ID)(state, 'CHILD_TEST'),
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
