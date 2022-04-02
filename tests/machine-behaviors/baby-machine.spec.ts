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
  Interpreter,
}                   from 'xstate'

import * as Mailbox   from '../../src/mods/mod.js'

import * as Baby    from './baby-machine.js'

test('babyMachine smoke testing with asleep under mock clock', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const CHILD_ID = 'testing-child-id'

  const proxyMachine = createMachine({
    id: 'parent',
    initial: 'testing',
    invoke: {
      id: CHILD_ID,
      src: Baby.machine,
      // autoForward: true,
    },
    states: {
      testing: {},
    },
  })

  const proxyEventList: AnyEventObject[] = []
  const proxyInterpreter = interpret(proxyMachine)
    .onTransition(s => {
      proxyEventList.push(s.event)

      console.info('onTransition (Parent): ')
      console.info('  - states:', s.value)
      console.info('  - event:', s.event.type)
      console.info()
    })
    .start()

  await sandbox.clock.runAllAsync()

  const babyEventList: AnyEventObject[] = []
  const babyRef = () => proxyInterpreter.getSnapshot().children[CHILD_ID] as Interpreter<any>
  babyRef().onTransition(s => {
    babyEventList.push(s.event)

    console.info('onTransition (Baby): ')
    console.info('  - states:', s.value)
    console.info('  - event:', s.event.type)
    console.info()
  })

  const babyState   = () => babyRef().getSnapshot().value
  const babyContext = () => babyRef().getSnapshot().context as Baby.Context

  const SLEEP_MS = 10
  /**
   * summary of the below ms should be equal to SLEEP_MS:
   */
  const BEFORE_CRY_MS  = 3
  const AFTER_CRY_MS   = 4
  const AFTER_SLEEP_MS = 3

  t.equal(babyState(), Baby.states.awake, 'babyMachine initial state should be awake')
  t.same(babyEventList, [
    { type: 'xstate.init' },
  ], 'should have initial event list from child')
  t.same(
    proxyEventList,
    [
      { type: 'xstate.init' },
      Mailbox.events.CHILD_IDLE('awake'),
      Mailbox.events.CHILD_REPLY(
        Baby.events.PLAY(),
      ),
    ],
    'should have initial event CHILD_IDLE & CHILD_REPLY(PLAY) sent',
  )

  /**
   * SLEEP
   */
  proxyEventList.length = 0
  babyEventList.length = 0
  babyRef().send(Baby.events.SLEEP(SLEEP_MS))
  t.equal(babyState(), Baby.states.asleep, 'babyMachine state should be asleep')
  t.equal(babyContext().ms, SLEEP_MS, `babyMachine context.ms should be ${SLEEP_MS}`)
  t.same(babyEventList.map(e => e.type), [
    Baby.types.SLEEP,
  ], 'should have SLEEP event on child')
  await sandbox.clock.tickAsync(0)
  // proxyEventList.forEach(e => console.info(e))
  t.same(
    proxyEventList, [
      Baby.events.EAT(),
      Baby.events.REST(),
      Baby.events.DREAM(),
    ].map(Mailbox.events.CHILD_REPLY),
    'should have CHILD_IDLE & CHILD_REPLY event list for parent',
  )

  /**
   * 2nd SLEEP (with concurrency)
   */
  proxyEventList.length = 0
  babyEventList.length = 0
  babyRef().send(Baby.events.SLEEP(SLEEP_MS * 1e9)) // a very long time
  t.equal(babyState(), Baby.states.asleep, 'babyMachine state should be asleep')
  t.equal(babyContext().ms, SLEEP_MS, `babyMachine context.ms should still be ${SLEEP_MS} (new event has been dropped by machine)`)
  t.same(proxyEventList, [], 'should no more response when asleep for parent')
  t.same(babyEventList, [
    Baby.events.SLEEP(SLEEP_MS * 1e9),
  ], 'should has SLEEP event on child')

  /**
   * BEFORE_CRY_MS
   */
  proxyEventList.length = 0
  babyEventList.length = 0
  await sandbox.clock.tickAsync(BEFORE_CRY_MS)
  t.equal(babyState(), Baby.states.asleep, `babyMachine state should be asleep after 1st ${BEFORE_CRY_MS} ms`)
  t.equal(babyContext().ms, SLEEP_MS, `babyMachine context.ms should be ${SLEEP_MS} (new event has been dropped) after 1st ${BEFORE_CRY_MS} ms`)
  t.same(proxyEventList, [], `should no more response after 1st ${BEFORE_CRY_MS} ms for parent`)
  t.same(babyEventList, [], `should no more response after 1st ${BEFORE_CRY_MS} ms for parent`)

  /**
   * AFTER_CRY_MS
   */
  proxyEventList.length = 0
  babyEventList.length = 0
  await sandbox.clock.tickAsync(AFTER_CRY_MS)
  t.equal(babyState(), Baby.states.asleep, `babyMachine state should be asleep after 2nd ${AFTER_CRY_MS} ms`)
  t.equal(babyContext().ms, SLEEP_MS, `babyMachine context.ms should be ${SLEEP_MS} (new event has been dropped) after 2nd ${AFTER_CRY_MS} ms`)
  t.same(
    proxyEventList,
    [
      Mailbox.events.CHILD_REPLY(Baby.events.CRY()),
    ],
    'should cry in middle night (after 2nd 4 ms) for parent',
  )
  t.same(
    babyEventList,
    [
      { type: 'xstate.after(cryMs)#baby.baby/asleep' },
    ],
    'should cry in middle night (after 2nd 4 ms) for child',
  )

  /**
   * AFTER_SLEEP_MS
   */
  proxyEventList.length = 0
  babyEventList.length  = 0
  await sandbox.clock.tickAsync(AFTER_SLEEP_MS)
  t.equal(babyState(), Baby.states.awake, 'babyMachine state should be awake after sleep')
  t.equal(babyContext().ms, undefined, 'babyMachine context.ms should be cleared after sleep')
  t.same(proxyEventList.map(e => e.type), [
    Mailbox.types.CHILD_IDLE,
  ], 'should be IDLE after night')

  /**
   * Final +1 (??? why? Huan(202201))
   */
  await sandbox.clock.tickAsync(1)
  t.same(proxyEventList.map(e => e.type), [
    Mailbox.types.CHILD_IDLE,
    Mailbox.types.CHILD_REPLY,
    Mailbox.types.CHILD_REPLY,
  ], 'should pee after night and start paly in the morning, sent to parent')
  t.same(babyEventList.map(e => e.type), [
    'xstate.after(ms)#baby.baby/asleep',
  ], 'should received after(ms) event for child')

  proxyInterpreter.stop()

  sandbox.restore()
})
