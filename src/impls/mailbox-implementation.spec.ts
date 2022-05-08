#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 *   Mailbox - https://github.com/huan/mailbox
 *    author: Huan LI (李卓桓) <zixia@zixia.net>
 *    Dec 2021
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */
/* eslint-disable sort-keys */

import { test, sinon }    from 'tstest'
import {
  AnyEventObject,
  createMachine,
  actions,
  interpret,
}                         from 'xstate'
import { from }           from 'rxjs'

import Baby      from '../../tests/machine-behaviors/baby-machine.js'
import DingDong  from '../../tests/machine-behaviors/ding-dong-machine.js'

import * as Mailbox   from '../mods/mod.js'

test('Mailbox.from() smoke testing (w/BabyMachine)', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const mailbox = Mailbox.from(Baby.machine.withContext(Baby.initialContext()))
  mailbox.open()

  const testMachine = createMachine({
    on: {
      '*': {
        actions: actions.choose([
          {
            cond: (_, __, { _event }) => _event.origin !== String(mailbox.address),
            actions: [
              mailbox.address.send((_, e) => e),
            ],
          },
        ]),
      },
    },
  })

  const eventList: AnyEventObject[] = []
  const interpreter = interpret(testMachine)
  interpreter
    .onEvent(e => eventList.push(e))
    .start()

  const SLEEP_EVENT = Baby.Event.SLEEP(10)
  eventList.length = 0
  interpreter.send(SLEEP_EVENT)
  t.same(
    eventList,
    [
      SLEEP_EVENT,
      // Baby.Event.REST(),
      // Baby.Event.DREAM(),
    ],
    // 'should receive DEAD_LETTER with REST and DREAM event after received the 1st EVENT sleep',
    'should receive the 1st EVENT sleep',
  )

  // // console.info(
  // //   eventList
  // //     .filter(e => e.type === Types.DEAD_LETTER)
  // //     .map(e => (e as any).payload.event)
  // // )
  eventList.length = 0
  await sandbox.clock.tickAsync(9)
  t.same(
    eventList,
    [
      Baby.Event.EAT(),
      Baby.Event.REST(),
      Baby.Event.DREAM(),
      Baby.Event.CRY(),
    ],
    'should receive baby events before wakeup',
  )

  eventList.length = 0
  await sandbox.clock.tickAsync(2)
  t.same(
    eventList,
    [
      Baby.Event.PEE(),
      Baby.Event.PLAY(),
    ],
    'should get one dead letter with PEE&PLAY event after sleep',
  )
  mailbox.close()
  sandbox.restore()
})

test('mailbox address interpret smoke testing: 3 parallel EVENTs (w/BabyMachine)', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const mailbox = Mailbox.from(Baby.machine.withContext(Baby.initialContext()))
  mailbox.open()

  const testMachine = createMachine({
    on: {
      '*': {
        actions: actions.choose([
          {
            cond: (_, __, { _event }) => _event.origin !== String(mailbox.address),
            actions: [
              mailbox.address.send((_, e) => e),
            ],
          },
        ]),
      },
    },
  })

  const eventList: AnyEventObject[] = []
  const interpreter = interpret(testMachine)
  interpreter
    .onEvent(e => eventList.push(e))
    .start()

  eventList.length = 0
  interpreter.send(Baby.Event.SLEEP(10))
  t.same(
    eventList,
    [
      Baby.Event.SLEEP(10),
    ],
    'should received SLEEP event',
  )

  eventList.length = 0
  interpreter.send(Baby.Event.SLEEP(20))
  t.same(eventList, [ Baby.Event.SLEEP(20) ], 'should received SLEEP event')

  /**
   * Finish 1st (will right enter the 2nd)
   */
  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  t.same(
    eventList,
    [
      Baby.Event.EAT(),
      Baby.Event.REST(),
      Baby.Event.DREAM(),
      Baby.Event.CRY(),
    ],
    'should before enter 2nd SLEEP after 10 ms',
  )
  // console.info('#### queue:', snapshot.context.queue)

  /**
   * Finish 2nd
   */
  eventList.length = 0
  await sandbox.clock.tickAsync(20)
  t.same(
    eventList,
    [
      Baby.Event.PEE(),
      Baby.Event.PLAY(),
      Baby.Event.EAT(),
      Baby.Event.REST(),
      Baby.Event.DREAM(),
      Baby.Event.CRY(),
    ],
    'should before enter 3rd SLEEP after another 20 ms',
  )

  /**
   * Finish 3rd
   */
  eventList.length = 0
  await sandbox.clock.tickAsync(30)
  t.same(eventList, [
    Baby.Event.PEE(),
    Baby.Event.PLAY(),
  ], 'should enter wakeup state')

  mailbox.close()
  sandbox.restore()
})

test('mailbox address interpret smoke testing: 3 EVENTs with respond (w/BabyMachine)', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const mailbox = Mailbox.from(Baby.machine.withContext(Baby.initialContext()))
  mailbox.open()

  const testMachine = createMachine({
    on: {
      '*': {
        actions: actions.choose([
          {
            cond: (_, __, { _event }) => _event.origin !== String(mailbox.address),
            actions: [
              mailbox.address.send((_, e) => e),
            ],
          },
        ]),
      },
    },
  })

  const eventList: AnyEventObject[] = []
  const interpreter = interpret(testMachine)
  interpreter
    .onEvent(e => eventList.push(e))
    .start()

  Array.from({ length: 3 }).forEach(_ => {
    // console.info('EVENT: sleep sending...')
    interpreter.send(Baby.Event.SLEEP(10))
    // console.info('EVENT: sleep sending... done')
  })

  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  t.same(
    eventList
      .map(e => e.type)
      .filter(t => Object.values<string>(Baby.Type).includes(t)),
    [
      Baby.Type.EAT,
      Baby.Type.REST,
      Baby.Type.DREAM,
      Baby.Type.CRY,
    ],
    'should enter next SLEEP(DREAM) after 1st 10 ms',
  )

  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  t.same(
    eventList
      .map(e => e.type)
      .filter(t => Object.values<string>(Baby.Type).includes(t)),
    [
      Baby.Type.PEE,
      Baby.Type.PLAY,
      Baby.Type.EAT,
      Baby.Type.REST,
      Baby.Type.DREAM,
      Baby.Type.CRY,
    ],
    'should enter next SLEEP(DREAM) after 2nd 10 ms',
  )

  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  t.same(
    eventList
      .map(e => e.type)
      .filter(t => Object.values<string>(Baby.Type).includes(t)),
    [
      Baby.Type.PEE,
      Baby.Type.PLAY,
      Baby.Type.EAT,
      Baby.Type.REST,
      Baby.Type.DREAM,
      Baby.Type.CRY,
    ],
    'should receive event child.events.PLAY after 3rd 10 ms',
  )

  mailbox.close()
  sandbox.restore()
})

test('Mailbox Address smoke testing (w/DingDongMachine)', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })
  const spy = sandbox.spy()

  const dingDong = Mailbox.from(DingDong.machine.withContext(DingDong.initialContext()))

  const ADDRESS = String(dingDong.address)

  const testMachine = createMachine({
    on: {
      TEST: {
        actions: actions.send(DingDong.Event.DING(0), { to: ADDRESS }),
      },
      [DingDong.Type.DONG]: {
        actions: spy,
      },
    },
  })

  const interpreter = interpret(testMachine)
  dingDong.open()
  interpreter.start()

  interpreter.send('TEST')
  await sandbox.clock.runAllAsync()
  t.ok(spy.calledOnce, 'should be called once')

  interpreter.stop()
  dingDong.close()

  sandbox.restore()
})

test('Mailbox debug properties smoke testing (w/DingDongMachine)', async t => {
  const mailbox = Mailbox.from(DingDong.machine) as Mailbox.impls.Mailbox
  t.ok(mailbox.internal.machine, 'should has machine')
  t.same(mailbox.internal.actor.machine, DingDong.machine, 'should has the correct target machine')

  t.ok(mailbox.internal.interpreter, 'should has interpreter initialized before open()')
  t.notOk(mailbox.internal.actor.interpreter, 'should has no target interpreter initialized before open()')

  mailbox.open()
  t.ok(mailbox.internal.actor.interpreter, 'should has target interpreter after open()')

  mailbox.close()
  t.notOk(mailbox.internal.actor.interpreter, 'should has no target interpreter initialized after close()')
})

test('Mailbox Observable API', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const dingDong = Mailbox.from(DingDong.machine.withContext(DingDong.initialContext()))
  dingDong.open()

  const eventList: AnyEventObject[] = []
  from(dingDong).subscribe(e => eventList.push(e))

  const testMachine = createMachine({
    on: {
      TEST: {
        actions: actions.send(DingDong.Event.DING(0), { to: String(dingDong.address) }),
      },
    },
  })

  const interpreter = interpret(testMachine)
  interpreter.start()

  interpreter.send('TEST')
  await sandbox.clock.runAllAsync()

  console.info(eventList)
  t.same(
    eventList,
    [
      DingDong.Event.DING(0),
      DingDong.Event.DONG(0),
    ],
    'should get DING and DONG events from RxJS Observable',
  )

  interpreter.stop()
  dingDong.close()

  sandbox.restore()
})
