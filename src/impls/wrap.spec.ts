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
  interpret,
  createMachine,
  actions,
  StateValue,
  AnyEventObject,
  Interpreter,
  State,
}                         from 'xstate'

import Baby                           from '../../tests/machine-behaviors/baby-machine.js'
import CoffeeMaker, {
  DELAY_MS as COFFEE_MAKER_DELAY_MS,
}                                     from '../../tests/machine-behaviors/coffee-maker-machine.js'

import * as duck                from '../duck/mod.js'
import { stripPayloadDebug }    from '../testing-utils.js'

import type { Context }   from './contexts.js'
import { wrap }           from './wrap.js'

test('wrap() transition nextState smoke testing', async t => {
  const mailbox = wrap(Baby.machine.withContext(Baby.initialContext()))

  // console.info('initialState:', actor.initialState)
  const SLEEP_EVENT = Baby.Event.SLEEP(10)

  let nextState = mailbox.transition(mailbox.initialState, SLEEP_EVENT)
  // console.info(nextState.actions)
  // console.info(nextState.context)
  t.same(
    nextState.actions
      .filter(a => a.type === 'xstate.send' && a['event'].type === duck.Type.NEW_MESSAGE)
      .map(a => a['event'].type),
    [ duck.Type.NEW_MESSAGE ],
    'should have NEW_MESSAGE event',
  )
  t.same(nextState.context.queue, [ SLEEP_EVENT ], 'should have no MESSAGE in queue')

  nextState = mailbox.transition(nextState, Baby.Event.SLEEP(10))
  // console.info(nextState.actions)
  t.equal(nextState.context.queue.length, 2, 'should have 0 event in queue after sent two SLEEP event')
  t.same(nextState.context.queue.map(c => c.type), new Array(2).fill(Baby.Type.SLEEP), 'should be both sleep event')
})

test('wrap interpret smoke testing: 1 event (with BabyMachine)', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const targetMachine = wrap(Baby.machine.withContext(Baby.initialContext()))
  const interpreter = interpret(targetMachine)
  const targetContext = () => interpreter.getSnapshot().context as Context

  const eventList: AnyEventObject[] = []
  const stateList: State<any, any, any, any, any>[] = []

  interpreter.onEvent(e => eventList.push(e))
  interpreter.onTransition(s => stateList.push(s))
  interpreter.start()

  const SLEEP_MS = 10
  const SLEEP_EVENT = Baby.Event.SLEEP(SLEEP_MS)

  /**
   * start (right after)
   */
  t.same(stateList.at(-1)?.value, {
    queue : duck.State.Listening,
    child : duck.State.Idle,
  }, 'should stay at idle state after start')
  t.same(stateList.at(-1)?.context, {
    queue: [],
    index: 0,
  }, 'should have initial context after start')
  t.same(eventList.map(e => e.type), [
    'xstate.init',
    duck.Type.CHILD_IDLE,
    duck.Type.DISPATCH,
  ], 'should received CHILD_IDLE with DISPATCH event aftrer child sent IDLE')

  /**
   * start (next tick)
   */
  stateList.length = eventList.length = 0
  await sandbox.clock.tickAsync(0)
  t.same(eventList.map(e => e.type), [
    duck.Type.CHILD_REPLY,
    duck.Type.DEAD_LETTER,
  ], 'should received CHILD_REPLY with DEAD_LETTER event aftrer child sent IDLE')
  t.same(
    eventList.filter(e => e.type === duck.Type.DEAD_LETTER).map(e => (e as any).payload.message.type),
    [
      Baby.Type.PLAY,
    ],
    'should received DEAD_LETTER with PLAY event',
  )

  /**
   * SLEEP event (right after)
   */
  stateList.length = eventList.length = 0
  interpreter.send(SLEEP_EVENT)
  t.same(stateList.at(-1)?.value, {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.child.busy after received the 1st EVENT sleep')
  t.same(
    stripPayloadDebug(eventList),
    [
      SLEEP_EVENT,
      duck.Event.NEW_MESSAGE(),
      duck.Event.DISPATCH(),
      duck.Event.DEQUEUE(SLEEP_EVENT as any),
    ],
    'should receive event SLEEP with Mailbox system events after received the 1st EVENT sleep',
  )

  /**
   * SLEEP event (next tick)
   */
  stateList.length = eventList.length = 0
  await sandbox.clock.nextAsync()
  t.same(
    stripPayloadDebug(eventList),
    [
      duck.Event.CHILD_REPLY(Baby.Event.EAT()),
      duck.Event.DEAD_LETTER(Baby.Event.EAT()),
    ],
    'should received CHILD_REPLY & DEAD_LETTER with EAT event',
  )
  t.equal(targetContext().queue.length, 0, 'should have 0 event in queue after received the 1st EVENT sleep')

  /**
   * SLEEP event (tick after next tick)
   */
  stateList.length = eventList.length = 0
  await sandbox.clock.nextAsync()
  t.same(
    stripPayloadDebug(eventList),
    [
      duck.Event.CHILD_REPLY(Baby.Event.REST()),
      duck.Event.DEAD_LETTER(Baby.Event.REST()),
    ],
    'should received CHILD_REPLAY & DEAD_LETTER with REST event',
  )
  t.equal(targetContext().queue.length, 0, 'should have 0 event in queue after received the 1st EVENT sleep')

  /**
   * SLEEP event (tick SLEEP_MS -1)
   */
  stateList.length = eventList.length = 0
  await sandbox.clock.tickAsync(SLEEP_MS - 1)
  t.same(stateList.at(-1)?.value, {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.child.busy after received the 1st EVENT sleep before timeout')
  t.equal(targetContext().queue.length, 0, 'should have 0 event in queue before wakeup')
  t.same(
    stripPayloadDebug(eventList),
    [
      duck.Event.CHILD_REPLY(Baby.Event.DREAM()),
      duck.Event.DEAD_LETTER(Baby.Event.DREAM()),
      duck.Event.CHILD_REPLY(Baby.Event.CRY()),
      duck.Event.DEAD_LETTER(Baby.Event.CRY()),
    ],
    'should get one dead letter with DREAM/CRY event after middle night',
  )

  /**
   * SLEEP event (tick SLEEP_MS finished)
   */
  stateList.length = eventList.length = 0
  await sandbox.clock.tickAsync(1)
  t.same(stateList.at(-1)?.value, {
    queue   : duck.State.Listening,
    child   : duck.State.Idle,
  }, 'should be state.busy after received the 1st EVENT sleep')
  t.equal(targetContext().queue.length, 0, 'should have 0 event in queue after sleep')
  t.same(eventList.map(e => e.type), [
    duck.Type.CHILD_IDLE,
    duck.Type.CHLID_TOGGLE,
    duck.Type.DISPATCH,
  ], 'should receive event child.Type.PLAY after sleep')

  stateList.length = eventList.length = 0
  await sandbox.clock.runAllAsync()
  t.same(
    stripPayloadDebug(eventList),
    [
      duck.Event.CHILD_REPLY(Baby.Event.PEE()),
      duck.Event.DEAD_LETTER(Baby.Event.PEE()),
      duck.Event.CHILD_REPLY(Baby.Event.PLAY()),
      duck.Event.DEAD_LETTER(Baby.Event.PLAY()),
    ],
    'should get dead letters for PEE&PLAY event after sleep',
  )
  interpreter.stop()
  sandbox.restore()
})

test('mailbox interpret smoke testing: 3 parallel EVENTs (with CoffeeMaker)', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const mailbox = wrap(CoffeeMaker.machine.withContext(CoffeeMaker.initialContext()))
  const interpreter = interpret(mailbox)

  const eventList: AnyEventObject[] = []
  interpreter.onEvent(e => eventList.push(e))
  interpreter.start()

  const targetContext = () => interpreter.getSnapshot().context as Context
  const targetState   = () => interpreter.getSnapshot().value

  const COFFEE_EVENT_1 = CoffeeMaker.Event.MAKE_ME_COFFEE('Mary')
  const COFFEE_EVENT_2 = CoffeeMaker.Event.MAKE_ME_COFFEE('Mike')
  const COFFEE_EVENT_3 = CoffeeMaker.Event.MAKE_ME_COFFEE('John')

  const COFFEE_EVENT_RESPONSE_1 = CoffeeMaker.Event.COFFEE(COFFEE_EVENT_1.payload.customer)
  const COFFEE_EVENT_RESPONSE_2 = CoffeeMaker.Event.COFFEE(COFFEE_EVENT_2.payload.customer)
  const COFFEE_EVENT_RESPONSE_3 = CoffeeMaker.Event.COFFEE(COFFEE_EVENT_3.payload.customer)

  /**
   * 1st event (right after)
   */
  eventList.length = 0
  interpreter.send(COFFEE_EVENT_1)
  t.same(targetState(),  {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.busy after received the 1st EVENT sleep')
  t.same(
    stripPayloadDebug(eventList),
    [
      COFFEE_EVENT_1,
      duck.Event.NEW_MESSAGE(),
      duck.Event.DISPATCH(),
      duck.Event.DEQUEUE(COFFEE_EVENT_1 as any),
    ],
    'should send DING event with mailbox system events after received the 1st EVENT sleep',
  )
  t.equal(targetContext().queue.length, 0, 'should have 0 event in queue after received the 1st DING')

  /**
   * 1st event (next tick)
   */
  eventList.length = 0
  await sandbox.clock.tickAsync(0)
  t.equal(eventList.length, 0, 'should no more event after next tick')
  t.same(targetState(), {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.idle after received the 1st EVENT DING')
  t.equal(targetContext().queue.length, 0, 'should have 0 event in queue after received the 1st DING with next tick')

  /**
   * DING event 2 (right after & next tick)
   */
  eventList.length = 0
  interpreter.send(COFFEE_EVENT_2)
  await sandbox.clock.tickAsync(0)
  t.same(targetState(), {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.busy after received the 2nd EVENT DING')
  // eventList.forEach(e => console.info(e))
  t.same(
    stripPayloadDebug(eventList),
    [
      COFFEE_EVENT_2,
      duck.Event.NEW_MESSAGE(),
    ],
    'should trigger mailbox.events.NEW_MESSAGE after received the 2nd EVENT sleep',
  )
  t.equal(targetContext().queue.length, 1, 'should have 1 event in queue after received the 2nd EVENT sleep')

  /**
   * DING event 3 (right after & next tick)
   */
  eventList.length = 0
  interpreter.send(COFFEE_EVENT_3)
  await sandbox.clock.tickAsync(0)
  t.same(targetState(), {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.busy after received the 3rd EVENT sleep')
  t.same(
    stripPayloadDebug(eventList), [
      COFFEE_EVENT_3,
      duck.Event.NEW_MESSAGE(),
    ], 'should trigger mailbox.events.NEW_MESSAGE after received the 3rd EVENT sleep')
  t.equal(targetContext().queue.length, 2, 'should have 1 event in queue after received the 3rd EVENT sleep')

  /**
   * Finish 1st (and will enter the 2nd)
   */
  eventList.length = 0
  await sandbox.clock.tick(COFFEE_MAKER_DELAY_MS)
  t.equal(targetContext().queue.length, 2, 'should have 2 event in queue after 10 ms')
  t.same(targetState(),  {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.busy after 10 ms')
  // eventList.forEach(e => console.info(e))
  t.same(
    stripPayloadDebug(eventList),
    [
      duck.Event.CHILD_IDLE(),
      duck.Event.CHILD_TOGGLE(),
      duck.Event.DISPATCH(),
      duck.Event.DEQUEUE(COFFEE_EVENT_2 as any),
    ],
    `should process 1st event after ${COFFEE_MAKER_DELAY_MS} ms`,
  )

  /**
   * Finish 1st (and will enter the 2nd) (next tick)
   */
  eventList.length = 0
  await sandbox.clock.tickAsync(1)
  // eventList.forEach(e => console.info(e))
  t.same(
    stripPayloadDebug(eventList),
    [
      duck.Event.CHILD_REPLY(COFFEE_EVENT_RESPONSE_1),
      duck.Event.DEAD_LETTER(COFFEE_EVENT_RESPONSE_1),
    ],
    'should process 1st event after 1 ms',
  )

  /**
   * Finish 2nd
   */
  eventList.length = 0
  await sandbox.clock.tick(COFFEE_MAKER_DELAY_MS)
  t.equal(targetContext().queue.length, 0, 'should have 0 event in queue after another 20 ms')
  t.same(targetState(), {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, `should be state.busy after another ${COFFEE_MAKER_DELAY_MS} ms`)
  t.same(
    stripPayloadDebug(eventList),
    [
      duck.Event.CHILD_IDLE(),
      duck.Event.CHILD_TOGGLE(),
      duck.Event.DISPATCH(),
      duck.Event.DEQUEUE(COFFEE_EVENT_3 as any),
      duck.Event.CHILD_REPLY(COFFEE_EVENT_RESPONSE_2),
      duck.Event.DEAD_LETTER(COFFEE_EVENT_RESPONSE_2),
    ],
    `should right enter 3rd SLEEP after another ${COFFEE_MAKER_DELAY_MS} ms`,
  )

  /**
   * Finish 3rd
   */
  eventList.length = 0
  await sandbox.clock.tickAsync(COFFEE_MAKER_DELAY_MS)
  t.equal(targetContext().queue.length, 0, `should have 0 event in queue after another ${COFFEE_MAKER_DELAY_MS} ms`)
  eventList.forEach(e => console.info(e))
  t.same(targetState(), {
    queue   : duck.State.Listening,
    child   : duck.State.Idle,
  }, 'should be state.idle after another 30 ms')
  t.same(
    stripPayloadDebug(eventList),
    [
      duck.Event.CHILD_IDLE(),
      duck.Event.CHILD_TOGGLE(),
      duck.Event.DISPATCH(),
      duck.Event.CHILD_REPLY(COFFEE_EVENT_RESPONSE_3),
      duck.Event.DEAD_LETTER(COFFEE_EVENT_RESPONSE_3),
    ],
    `should wakeup because there is no more SLEEP events after another ${COFFEE_MAKER_DELAY_MS} ms`,
  )

  interpreter.stop()
  sandbox.restore()
})

test('mailbox wrap interpret smoke testing: 3 EVENTs with respond (more tests)', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const mailbox = wrap(Baby.machine.withContext(Baby.initialContext()))
  const interpreter = interpret(mailbox)
  const targetState   = () => interpreter.getSnapshot().value
  const targetContext = () => interpreter.getSnapshot().context as Context

  const eventList: AnyEventObject[] = []
  interpreter.onEvent(e => eventList.push(e))
  interpreter.start()

  let snapshot

  Array.from({ length: 3 }).forEach(_ => {
    // console.info('EVENT: sleep sending...')
    interpreter.send(Baby.Event.SLEEP(10))
    // console.info('EVENT: sleep sending... done')
  })

  snapshot = interpreter.getSnapshot()
  t.same(targetState(), {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.busy after received 3 sleep EVENTs')
  t.equal(snapshot.event.type, duck.Type.NEW_MESSAGE, 'should trigger event NEW_MESSAGE after received 3 sleep EVENTs')
  t.equal(targetContext().queue.length, 2, 'should have 2 event in queue after received 3 sleep EVENTs')

  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  snapshot = interpreter.getSnapshot()
  t.same(targetState(), {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.busy after 1st 10 ms')
  // console.info(eventList)
  t.same(
    eventList
      .filter(e => e.type === duck.Type.DEAD_LETTER)
      .map(e => (e as ReturnType<typeof duck.Event.DEAD_LETTER>).payload.message.type)
      .filter(t => Object.values<string>(Baby.Type).includes(t)),
    [
      Baby.Type.PLAY,
      Baby.Type.EAT,
      Baby.Type.REST,
      Baby.Type.DREAM,
      Baby.Type.CRY,
    ],
    'should enter next SLEEP(DREAM) after 1st 10 ms',
  )
  t.equal(snapshot.context.queue.length, 2, 'should have 2 event in queue after 1st 10 ms')

  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  snapshot = interpreter.getSnapshot()
  t.same(targetState(), {
    queue   : duck.State.Listening,
    child   : duck.State.Busy,
  }, 'should be state.busy after 2nd 10 ms')
  t.same(
    eventList
      .filter(e => e.type === duck.Type.DEAD_LETTER)
      .map(e => (e as ReturnType<typeof duck.Event.DEAD_LETTER>).payload.message.type)
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
  t.equal(snapshot.context.queue.length, 0, 'should have 0 event in queue after 2nd 10 ms')

  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  snapshot = interpreter.getSnapshot()
  t.same(targetState(), {
    queue   : duck.State.Listening,
    child   : duck.State.Idle,
  }, 'should be state.idle after 3rd 10 ms')
  t.same(
    eventList
      .filter(e => e.type === duck.Type.DEAD_LETTER)
      .map(e => (e as ReturnType<typeof duck.Event.DEAD_LETTER>).payload.message.type)
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
  t.equal(snapshot.context.queue.length, 0, 'should have 0 event in queue after 3rd 10 ms')

  interpreter.stop()
  sandbox.restore()
})

test('Mailbox.wrap proxy smoke testing', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const CHILD_ID = 'child'
  const targetMachine = wrap(Baby.machine.withContext(Baby.initialContext()))

  enum ParentStates {
    testing = 'testing',
  }
  enum ParentTypes {
    TEST = 'TEST',
  }

  const proxyMachine = createMachine({
    id: 'proxy',
    initial: ParentStates.testing,
    invoke: {
      id: CHILD_ID,
      src: targetMachine,
    },
    states: {
      [ParentStates.testing]: {
        on: {
          [ParentTypes.TEST]: {
            actions: [
              actions.send(Baby.Event.SLEEP(10), { to: CHILD_ID }),
            ],
          },
        },
      },
    },
  })

  const proxyInterpreter = interpret(proxyMachine)

  const stateList: StateValue[]  = []
  const eventList: string[]      = []

  proxyInterpreter.onEvent(e       => eventList.push(e.type))
  proxyInterpreter.onTransition(s  => stateList.push(s.value))
  proxyInterpreter.start()

  // console.info(interpreter.children)
  const targetInterpreter = (proxyInterpreter.children.get(CHILD_ID) as any as Interpreter<any>)
  targetInterpreter.onEvent((e: any) => {
    if (e.type === duck.Type.DEAD_LETTER) {
      console.error('DEAD_LETTER', e.payload.event)
      console.error('DEAD_LETTER', targetInterpreter.getSnapshot().context.message)
    }
  })

  t.same(eventList, [
    'xstate.init',
  ], 'should have initial event list')
  t.same(stateList, [
    ParentStates.testing,
  ], 'should have initial transition list')

  /**
   * 1st SLEEP
   */
  eventList.length = stateList.length = 0
  proxyInterpreter.send(ParentTypes.TEST)
  t.same(eventList, [
    ParentTypes.TEST,
  ], 'should fall to sleep with events')
  t.same(stateList, new Array(1).fill(ParentStates.testing),
    'should transition to states.sleeping 1 times (with 1 events)',
  )

  eventList.length = stateList.length = 0
  await sandbox.clock.tickAsync(10)
  t.same(eventList, [
    Baby.Type.PLAY,
    Baby.Type.EAT,
    Baby.Type.REST,
    Baby.Type.DREAM,
    Baby.Type.CRY,
  ], 'should be before wakeup')
  t.same(stateList,
    new Array(5).fill(ParentStates.testing),
    'should transition to states.sleeping 5 times (with 5 events) after tick 10 ms',
  )

  eventList.length = stateList.length = 0
  await sandbox.clock.runToLastAsync()
  t.same(eventList, [
    Baby.Type.PEE,
    Baby.Type.PLAY,
  ], 'should be wakeup')
  t.same(stateList,
    new Array(2).fill(ParentStates.testing),
    'should transition to states.sleeping 2 times (with 2 events) after wakeup',
  )

  eventList.length = stateList.length = 0
  Array.from({ length: 3 }).forEach(_ =>
    proxyInterpreter.send(ParentTypes.TEST),
  )
  t.same(eventList, [
    ParentTypes.TEST,
    ParentTypes.TEST,
    ParentTypes.TEST,
  ], 'should fall to sleep after 3 SLEEP events, with two more SLEEP event queued')

  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  t.same(eventList, [
    Baby.Type.EAT,
    Baby.Type.REST,
    Baby.Type.DREAM,
    Baby.Type.CRY,
  ], 'should before wakeup after 10 ms, and fail sleep again')

  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  t.same(eventList, [
    Baby.Type.PEE,
    Baby.Type.PLAY,
    Baby.Type.EAT,
    Baby.Type.REST,
    Baby.Type.DREAM,
    Baby.Type.CRY,
  ], 'should wakeup after 10 ms ,and fail sleep again, twice')

  eventList.length = 0
  await sandbox.clock.tickAsync(10)
  t.same(eventList, [
    Baby.Type.PEE,
    Baby.Type.PLAY,
    Baby.Type.EAT,
    Baby.Type.REST,
    Baby.Type.DREAM,
    Baby.Type.CRY,
  ], 'should wakeup another 10 ms, and no more SLEEP in the queue')

  eventList.length = 0
  await sandbox.clock.runAllAsync()
  t.same(eventList, [
    Baby.Type.PEE,
    Baby.Type.PLAY,
  ], 'should be PEE & PLAY 2 more EVENT')

  proxyInterpreter.stop()
  sandbox.restore()
})
