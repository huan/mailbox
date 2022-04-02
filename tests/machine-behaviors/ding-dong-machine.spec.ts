#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  test,
  sinon,
}                   from 'tstest'

import {
  AnyEventObject,
  createMachine,
  interpret,
}                   from 'xstate'

import * as Mailbox   from '../../src/mods/mod.js'

import * as DingDong  from './ding-dong-machine.js'

test('DingDong.machine process one DING event', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const CHILD_ID = 'child'

  const parentMachine = createMachine({
    id: 'parent',
    initial: 'testing',
    invoke: {
      id: CHILD_ID,
      src: DingDong.machine,
      autoForward: true,
    },
    states: {
      testing: {},
    },
  })

  const interpreter = interpret(parentMachine)

  const eventList: AnyEventObject[] = []
  interpreter.onTransition(s => {
    eventList.push(s.event)

    // console.info('onTransition: ')
    // console.info('  - states:', s.value)
    // console.info('  - event:', s.event.type)
    // console.info()
  })

  interpreter.start()
  interpreter.send(DingDong.events.DING(1))
  t.same(
    eventList.map(e => e.type),
    [
      'xstate.init',
      Mailbox.types.CHILD_IDLE,
      DingDong.types.DING,
    ],
    'should have received init/RECEIVE/DING events after initializing',
  )

  eventList.length = 0
  await sandbox.clock.runAllAsync()
  // eventList.forEach(e => console.info(e))
  t.same(
    eventList,
    [
      Mailbox.events.CHILD_IDLE('idle'),
      Mailbox.events.CHILD_REPLY(DingDong.events.DONG(1)),
    ],
    'should have received DONG/RECEIVE events after runAllAsync',
  )

  interpreter.stop()

  sandbox.restore()
})

test('DingDong.machine process 2+ message at once: only be able to process the first message when receiving multiple events at the same time', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const containerMachine = createMachine({
    invoke: {
      src: DingDong.machine,
      autoForward: true,
    },
    states: {},
  })

  const interpreter = interpret(
    containerMachine,
  )

  const eventList: AnyEventObject[] = []
  interpreter
    .onTransition(s => eventList.push(s.event))
    .start()

  interpreter.send([
    DingDong.events.DING(0),
    DingDong.events.DING(1),
  ])

  await sandbox.clock.runAllAsync()
  eventList.forEach(e => console.info(e))
  t.same(
    eventList
      .filter(e => e.type === Mailbox.types.CHILD_REPLY),
    [
      Mailbox.events.CHILD_REPLY(DingDong.events.DONG(0)),
    ],
    'should reply DONG to the first DING event',
  )

  interpreter.stop()
  sandbox.restore()
})
