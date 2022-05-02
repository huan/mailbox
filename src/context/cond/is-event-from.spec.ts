#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }                               from 'tstest'
import type { ActorRef, GuardMeta, SCXML }    from 'xstate'

import { isEventFrom } from './is-event-from.js'

test('isEventFrom()', async t => {
  const SESSION_ID = 'session-id'

  const _EVENT = {
    origin: SESSION_ID,
  } as any as SCXML.Event<any>

  const WRAPPED_ACTOR_ID = 'wrapped-id'

  const CHILDREN: Record<string, ActorRef<any, any>> = {
    [WRAPPED_ACTOR_ID]: {
      sessionId: SESSION_ID,
    } as any as ActorRef<any, any>,
  }

  const META = {
    _event: _EVENT,
    state: { children: CHILDREN },
  } as GuardMeta<any, any>

  t.ok(isEventFrom(WRAPPED_ACTOR_ID)({}, _EVENT, META), 'should return true if the event origin is the child session id')

  META._event.origin = undefined
  t.notOk(isEventFrom(WRAPPED_ACTOR_ID)({}, _EVENT, META), 'should return false if the event origin is undefined')

  t.notOk(
    isEventFrom(WRAPPED_ACTOR_ID)({}, _EVENT, { _event: {} } as any),
    'should return false for undefined origin',
  )
})
