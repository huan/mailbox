/**
 *   Wechaty Open Source Software - https://github.com/wechaty
 *
 *   @copyright 2022 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
 *
 */
/* eslint-disable sort-keys */
import assert from 'assert'
import {
  StateMachine,
  createMachine,
  interpret,
  AnyEventObject,
  Interpreter,
  actions,
  EventObject,
}                   from 'xstate'

import * as duck            from './duck/mod.js'
import { isMailboxType }    from './is/mod.js'
import { contexts }         from './impls/mod.js'

/**
 * Make the machine the child of the container to ready for testing
 *  because the machine need to use `sendParent` to send events to parent
 */
function container (machine: StateMachine<any, any, any>) {
  const CHILD_ID = 'mailbox-address-validating-child-id'
  const parentMachine = createMachine({
    invoke: {
      id: CHILD_ID,
      src: machine,
    },
    initial: 'testing',
    states: {
      testing: {
        on: {
          '*': {
            actions: actions.choose([ {
              /**
               * skip all:
               *  1. Mailbox.Types (system messages): those events is for controling Mailbox only
               *  2. child original messages
               *
               *  Send all other events to the child
               */
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              cond: (_, e, meta) => true
                && !isMailboxType(e.type)
                && !contexts.condEventSentFrom(CHILD_ID)(meta),
              actions: [
                actions.send((_, e) => e, { to: CHILD_ID }),
              ],
            } ]),
          },
        },
      },
    },
  })
  return parentMachine
}

/**
 * Initialization with CHILD_IDLE event
 *
 * A mailbox-addressable machine MUST send parent CHILD_IDLE right after it has been initialized
 *  (or the mailbox can not know when the machine is ready to process events)
 *
 */
function validateInitializing (
  machine: StateMachine<any, any, any>,
) {
  const eventList: AnyEventObject[] = []
  const interpreter = interpret(machine)
    .onEvent(e => eventList.push(e))
    .start() as unknown as Interpreter<any, any, EventObject> // Huan(202203): FIXME: remove `as unknown as`

  const EXPECTED_INIT_EVENT_TYPES = [
    'xstate.init',
    duck.Type.CHILD_IDLE,
  ]
  // console.info(eventList)
  const actualInitEvents = eventList
    .map(e => e.type)
    .filter(type => EXPECTED_INIT_EVENT_TYPES.includes(type))

  /**
   * A mailbox-addressable machine MUST send parent CHILD_IDLE right after it has been initialized
   */
  assert.deepEqual(actualInitEvents, EXPECTED_INIT_EVENT_TYPES, 'should send parent CHILD_IDLE right after it has been initialized')

  return [ interpreter, eventList ] as const
}

/**
 * Response each event with CHILD_IDLE event
 *  one event will get one CHILD_IDLE event back
 */
function validateReceiveFormOtherEvent (
  interpreter: Interpreter<any>,
  eventList: AnyEventObject[],
): void {
  eventList.length = 0
  interpreter.send(String(Math.random()))

  // console.info('eventList:', eventList)

  const actualIdleEvents = eventList
    .map(e => e.type)
    .filter(t => t === duck.Type.CHILD_IDLE)
  const EXPECTED_CHILD_IDLE_EVENTS = [ duck.Type.CHILD_IDLE ]
  assert.deepEqual(
    actualIdleEvents,
    EXPECTED_CHILD_IDLE_EVENTS,
    'Mailbox need the child machine to respond CHILD_IDLE event to parent immediately whenever it has received one other event',
  )
}

/**
 * Response each event with CHILD_IDLE event
 *  ten events will get ten CHILD_IDLE events back
 */
function validateReceiveFormOtherEvents (
  interpreter: Interpreter<any>,
  eventList: AnyEventObject[],
): void {
  const TOTAL_EVENT_NUM = 10
  eventList.length = 0
  const randomEvents = [ ...Array(TOTAL_EVENT_NUM).keys() ]
    .map(i => String(
      i + Math.random(),
    ))
  const EXPECTED_CHILD_IDLE_EVENTS = Array
    .from({ length: TOTAL_EVENT_NUM })
    .fill(duck.Type.CHILD_IDLE)
  interpreter.send(randomEvents)
  const actualIdelEvents = eventList
    .map(e => e.type)
    .filter(t => t === duck.Type.CHILD_IDLE)
  assert.deepEqual(actualIdelEvents, EXPECTED_CHILD_IDLE_EVENTS, `should send ${TOTAL_EVENT_NUM} CHILD_IDLE events to parent when it has finished process ${TOTAL_EVENT_NUM} of other events`)
}

/**
 * events.* is only for Mailbox system.
 *  They should not be sent to child machine.
 */
function validateSkipMailboxEvents (
  interpreter: Interpreter<any>,
  eventList: AnyEventObject[],
): void {
  const mailboxEventList = Object
    .values(duck.Event)
    .map(e => e())

  mailboxEventList.forEach(mailboxEvent => {
    eventList.length = 0
    interpreter.send(mailboxEvent)
    const actualEvents = eventList.filter(e => e.type !== mailboxEvent.type)
    assert.deepEqual(actualEvents, [], `should skip ${mailboxEvent.type} event`)
  })
}

/**
 * Throw if the machine is not a valid Mailbox-addressable machine
 *
 * Validate a state machine for satisfying the Mailbox address protocol:
 *  1. skip all EVENTs send from mailbox itself (Mailbox.*)
 *  2. send parent `events.CHILD_IDLE()` event after each received events and back to the idle state
 *
 * @returns
 *  Success: will return true
 *  Failure: will throw an error
 */
function validate (
  machine: StateMachine<any, any, any>,
): boolean {
  /**
   * invoke the machine within a parent machine
   */
  const parentMachine = container(machine)

  /**
   * validate the machine initializing events
   */
  const [ interpreter, eventList ] = validateInitializing(parentMachine)

  /**
   * Response each event with CHILD_IDLE event
   *
   * a mailbox-addressable machine MUST send CHILD_IDLE event to parent when it has finished process an event
   *  (or the mailbox will stop sending any new events to it because it stays in busy state)
   */
  validateReceiveFormOtherEvent(interpreter, eventList)
  /**
   * Multiple events will get multiple CHILD_IDLE event back
   */
  validateReceiveFormOtherEvents(interpreter, eventList)

  /**
   * child machine should not reply any events.* events
   */
  validateSkipMailboxEvents(interpreter, eventList)

  interpreter.stop()

  return true
}

export {
  validate,
}
