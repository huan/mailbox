#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */
/* eslint-disable no-redeclare */

import { test, AssertEqual } from 'tstest'

import * as duck from '../duck/mod.js'

import { selector } from './selector.js'

test('selector() smoke testing', async t => {

  const EXPECTED_EVENT = {
    IDLE: duck.Event.IDLE,
    NEXT: duck.Event.NEXT,
  }

  const Event = selector([
    duck.Event,
    [
      'IDLE',
      'NEXT',
    ],
  ])

  t.same(Event, EXPECTED_EVENT, 'should get the expected Event')
})

test('selector() array typing smoke testing', async t => {

  const EXPECTED_EVENT = {
    IDLE: duck.Event.IDLE,
    NEXT: duck.Event.NEXT,
  }

  const Event = selector([
    duck.Event,
    [
      'IDLE',
      'NEXT',
    ],
  ])

  type Event = typeof Event
  type Expected = typeof EXPECTED_EVENT

  const typingTest: AssertEqual<Event, Expected> = true
  t.ok(typingTest, 'should match typing')
})

test('selector() object typing smoke testing', async t => {

  const EXPECTED_EVENT = {
    IDLE: duck.Event.IDLE,
    NEXT: duck.Event.NEXT,
  }

  const Event = selector(EXPECTED_EVENT)

  type Event = typeof Event
  type Expected = typeof EXPECTED_EVENT

  const typingTest: AssertEqual<Event, Expected> = true
  t.ok(typingTest, 'should match typing')
})

test('selector() with union arg', async t => {

  const EXPECTED_EVENT_OBJECT = {
    IDLE: 'IDLE',
  } as const

  const ARG_ARRAY = [ EXPECTED_EVENT_OBJECT, [
    'IDLE',
  ] ] as const

  const ARG = Math.random() > 0.5
    ? ARG_ARRAY
    : EXPECTED_EVENT_OBJECT

  const Event = ARG instanceof Array ? selector(ARG) : selector(ARG)

  type Event = typeof Event
  type Expected = typeof EXPECTED_EVENT_OBJECT

  const typingTest: AssertEqual<Event, Expected> = true
  t.ok(typingTest, 'should match typing')
})
