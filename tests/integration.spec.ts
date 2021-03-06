#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  test,
  sinon,
}                   from 'tstest'

import {
  AnyEventObject,
  interpret,
  createMachine,
  actions,
  // spawn,
}                   from 'xstate'

import * as Mailbox   from '../src/mods/mod.js'

import DingDong    from './machine-behaviors/ding-dong-machine.js'
import CoffeeMaker from './machine-behaviors/coffee-maker-machine.js'
import { isActionOf } from 'typesafe-actions'

test('Mailbox.from(DingDong.machine) as an actor should enforce process messages one by one', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const ITEM_NUMBERS = [ ...Array(3).keys() ]
  const DING_EVENT_LIST = ITEM_NUMBERS.map(i => DingDong.Event.DING(i))
  const DONG_EVENT_LIST = ITEM_NUMBERS.map(i => DingDong.Event.DONG(i))

  const mailbox = Mailbox.from(DingDong.machine.withContext(DingDong.initialContext())) as Mailbox.impls.Mailbox
  mailbox.open()

  const TEST_ID = 'TestMachine'
  const testMachine = createMachine({
    id: TEST_ID,
    on: {
      '*': {
        actions: Mailbox.actions.proxy(TEST_ID)(mailbox),
      },
    },
  })

  const eventList: AnyEventObject[] = []
  const interpreter = interpret(testMachine)
    .onTransition(s => eventList.push(s.event))
    .start()

  DING_EVENT_LIST.forEach(e => interpreter.send(e))

  await sandbox.clock.runAllAsync()
  eventList.forEach(e => console.info(e))

  t.same(
    eventList.filter(isActionOf(DingDong.Event.DONG)),
    DONG_EVENT_LIST,
    `should reply total ${DONG_EVENT_LIST.length} DONG events to ${DING_EVENT_LIST.length} DING events`,
  )

  interpreter.stop()
  sandbox.restore()
})

test('parentMachine with invoke.src=Mailbox.address(DingDong.machine) should proxy events', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const ITEM_NUMBERS = [ ...Array(3).keys() ]

  const DING_EVENT_LIST = ITEM_NUMBERS.map(i =>
    DingDong.Event.DING(i),
  )
  const DONG_EVENT_LIST = ITEM_NUMBERS.map(i =>
    DingDong.Event.DONG(i),
  )

  const mailbox = Mailbox.from(DingDong.machine.withContext(DingDong.initialContext())) as Mailbox.impls.Mailbox
  const machine = mailbox.internal.machine

  const CHILD_ID = 'mailbox-child-id'

  const parentMachine = createMachine({
    invoke: {
      id: CHILD_ID,
      src: machine,
      /**
       * Huan(202112): autoForward event will not set `origin` to the forwarder.
       *  think it like a SNAT/DNAT in iptables?
       */
      // autoForward: true,
    },
    initial: 'testing',
    states: {
      testing: {
        on: {
          [DingDong.Type.DING]: {
            actions: actions.send(
              (_, e) => e,
              { to: CHILD_ID },
            ),
          },
        },
      },
    },
  })

  const interpreter = interpret(
    parentMachine,
  )

  const eventList: AnyEventObject[] = []
  interpreter
    .onTransition(s => eventList.push(s.event))
    .start()

  DING_EVENT_LIST.forEach(e => interpreter.send(e))

  await sandbox.clock.runAllAsync()

  t.same(
    eventList.filter(e => e.type === DingDong.Type.DONG),
    DONG_EVENT_LIST,
    `should get replied DONG events from all(${DONG_EVENT_LIST.length}) DING events`,
  )

  interpreter.stop()
  sandbox.restore()
})

test('Mailbox.from(CoffeeMaker.machine) as an actor should enforce process messages one by one', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const ITEM_NUMBERS = [ ...Array(3).keys() ]

  const MAKE_ME_COFFEE_EVENT_LIST = ITEM_NUMBERS.map(i =>
    CoffeeMaker.Event.MAKE_ME_COFFEE(String(i)),
  )
  const EXPECTED_COFFEE_EVENT_LIST = ITEM_NUMBERS.map(i =>
    CoffeeMaker.Event.COFFEE(String(i)),
  )

  const mailbox = Mailbox.from(CoffeeMaker.machine.withContext(CoffeeMaker.initialContext())) as Mailbox.impls.Mailbox
  mailbox.open()

  const TEST_ID = 'TestMachine'
  const testMachine = createMachine({
    id: TEST_ID,
    on: {
      '*': {
        actions: Mailbox.actions.proxy(TEST_ID)(mailbox),
      },
    },
  })

  const eventList: AnyEventObject[] = []
  const interpreter = interpret(testMachine)
    .onTransition(s => eventList.push(s.event))
    .start()

  /**
   * XState machine behavior different with interpreter.send(eventList) and eventList.forEach(e => interpreter.send(e)) #8
   *  @link https://github.com/wechaty/bot5-assistant/issues/8
   */
  MAKE_ME_COFFEE_EVENT_LIST.forEach(e => interpreter.send(e))
  // Bug: wechaty/bot5-assistant#8
  // interpreter.send(MAKE_ME_COFFEE_EVENT_LIST)

  await sandbox.clock.runAllAsync()
  // eventList.forEach(e => console.info(e))

  t.same(
    eventList
      .filter(isActionOf(CoffeeMaker.Event.COFFEE)),
    EXPECTED_COFFEE_EVENT_LIST,
    `should reply dead letter of total ${EXPECTED_COFFEE_EVENT_LIST.length} COFFEE events to ${MAKE_ME_COFFEE_EVENT_LIST.length} MAKE_ME_COFFEE events`,
  )

  interpreter.stop()
  sandbox.restore()
})
