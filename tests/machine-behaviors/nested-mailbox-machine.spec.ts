#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable sort-keys */
import {
  AnyEventObject,
  createMachine,
  interpret,
}                                       from 'xstate'
import { test }                         from 'tstest'
import { isActionOf }                   from 'typesafe-actions'

import * as Mailbox   from '../../src/mods/mod.js'

import parentMachine, { duckula }    from './nested-mailbox-machine.js'

test('actor smoke testing', async t => {
  const TEST_ID = 'TestMachine'

  const wrappedMachine = Mailbox.wrap(parentMachine)
  const testMachine = createMachine<any, any>({
    id: TEST_ID,
    invoke: {
      id: wrappedMachine.id,
      src: wrappedMachine,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          '*': {
            actions: Mailbox.actions.proxy(TEST_ID)(wrappedMachine.id),
          },
        },
      },
    },
  })

  const eventList: AnyEventObject[] = []
  const interpreter = interpret(testMachine)
    .onEvent(e => {
      console.info(TEST_ID, 'EVENT:', e.type, JSON.stringify(e))
      eventList.push(e)
    })
    .start()

  eventList.length = 0

  const future = new Promise(resolve =>
    interpreter.onEvent(e =>
      isActionOf(duckula.Event.COMPLETE, e) && resolve(e),
    ),
  )

  interpreter.send(duckula.Event.NEXT())
  // await new Promise(resolve => setTimeout(resolve, 0))
  await future

  // eventList.forEach(e => console.info(TEST_ID, 'final event list:', e.type, JSON.stringify(e)))

  t.same(eventList, [
    duckula.Event.NEXT(),
    duckula.Event.COMPLETE(),
  ], 'should get NEXT then COMPLETE events')

  await new Promise(setImmediate)
  interpreter.stop()
})
