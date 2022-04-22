#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */
/* eslint-disable no-redeclare */

import { test, AssertEqual } from 'tstest'

import * as duck from '../duck/mod.js'

import type { DuckularizeOptions } from './duckularize-options.js'

const FIXTURE = {

  ID: 'duckula-id',

  Event: {
    ACTOR_IDLE: duck.Event.ACTOR_IDLE,
    ACTOR_REPLY: duck.Event.ACTOR_REPLY,
  },

  State: {
    Idle: duck.State.Idle,
    Busy: duck.State.Busy,
  },

  Type: {
    ACTOR_IDLE: duck.Type.ACTOR_IDLE,
    ACTOR_REPLY: duck.Type.ACTOR_REPLY,
  },

  initialContext: () => ({ n: 42 }),
} as const

test('DuckularizeOptions typing inference smoke testing', async t => {

  const options = {
    id: FIXTURE.ID,
    events: FIXTURE.Event,
    states: FIXTURE.State,
    initialContext: FIXTURE.initialContext(),
  } as const

  type Actual = typeof options extends DuckularizeOptions<any, any, any, infer TEvent, any, any, any, any>
    ? TEvent
    : never

  type Expected = keyof typeof FIXTURE.Event

  const typingTest: AssertEqual<keyof Actual, Expected> = true
  t.ok(typingTest, 'should match typing')
})
