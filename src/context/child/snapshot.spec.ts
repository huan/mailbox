#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }                     from 'tstest'
import { createMachine, actions, interpret, AnyEventObject }   from 'xstate'

import { snapshot }   from './snapshot.js'

test('snapshot() smoke testing', async t => {
  const CHILD_ID = 'child-id'
  const child = createMachine({
    id: CHILD_ID,
    context: {
      child: true,
    },
    initial: 'idle',
    states: {
      idle: {},
    },
  })

  const PARENT_ID = 'parent-id'
  const parent = createMachine<any, any>({
    id: PARENT_ID,
    invoke: {
      id: CHILD_ID,
      src: child,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          TEST: {
            actions: actions.choose<any, any>([
              {
                cond: (_, __, meta) => !!snapshot(CHILD_ID)(meta.state),
                actions: actions.send('SNAPSHOT_GOT'),
              },
            ]),
          },
        },
      },
    },
  })

  const eventList: AnyEventObject[] = []
  const interpreter = interpret(parent)
    .onEvent(e => {
      eventList.push(e)
    })
    .start()

  eventList.length = 0
  interpreter.send('TEST')
  await new Promise(setImmediate)

  t.same(eventList, [
    { type: 'TEST' },
    { type: 'SNAPSHOT_GOT' },
  ], 'should be able to get snapshot of CHILD_ID in actions.choose of PARENT_ID')
})
