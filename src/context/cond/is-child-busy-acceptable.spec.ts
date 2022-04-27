#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  actions,
  AnyEventObject,
  createMachine,
  interpret,
  Interpreter,
}                     from 'xstate'
import { test }       from 'tstest'

import * as duck              from '../../duck/mod.js'
import * as MailboxActions    from '../../actions/mod.js'

import type { Context }   from '../context.js'
import * as origin        from '../origin/mod.js'
import * as request       from '../request/mod.js'

import { isChildBusyAcceptable }    from './is-child-busy-acceptable.js'

test('isChildBusyAcceptable()', async t => {
  const MATCH_EVENT = 'MATCH'

  /**
   * Actor Machine
   */
  const ACTOR_ID = 'actor-id'
  const actorMachine = createMachine({
    id: ACTOR_ID,
    initial: duck.State.Idle,
    on: {
      BUSY: duck.State.Busy,
      IDLE: duck.State.Idle,
    },
    states: {
      [duck.State.Idle]: {
        entry: actions.log('states.Idle', ACTOR_ID),
      },
      [duck.State.Busy]: {
        entry: actions.log('states.Busy', ACTOR_ID),
        on: {
          TEST_CAN: {
            actions: [
              actions.log('TEST_CAN', ACTOR_ID),
            ],
          },
        },
      },
    },
  })

  /**
   * Mailbox Machine
   */
  const MAILBOX_ID = 'mailbox-id'
  const mailboxMachine = createMachine({
    id: MAILBOX_ID,
    initial: duck.State.Idle,
    context: {} as Context,
    invoke: {
      id  : ACTOR_ID,
      src : actorMachine,
    },
    on: {
      IDLE: {
        actions: [
          actions.log('on.IDLE', MAILBOX_ID),
          actions.send('IDLE', { to: ACTOR_ID }),
        ],
        target: duck.State.Idle,
      },
      BUSY: {
        actions: [
          actions.log('on.BUSY', MAILBOX_ID),
          actions.send('BUSY', { to: ACTOR_ID }),
        ],
        target: duck.State.Busy,
      },

      SET_ORIGIN: {
        actions: [
          actions.log('on.SET_ORIGIN', MAILBOX_ID),
          actions.assign({
            message: (_, e, { _event }) => origin.wrapEvent(e, _event.origin),
          }),
          actions.log((ctx, _, { _event }) => `SET_ORIGIN: ctx: ${JSON.stringify(_event)} | ${JSON.stringify(ctx)}`),
          actions.log(ctx => request.address(ctx as any)),
        ],
      },
      CLEAR_ORIGIN: {
        actions: [
          actions.log('on.CLEAR_ORIGIN', MAILBOX_ID),
          actions.assign({ message: _ => undefined }),
        ],
      },

      TEST_CAN: {
        actions: [
          actions.log('on.TEST_CAN', MAILBOX_ID),
          actions.choose([
            {
              cond: isChildBusyAcceptable(ACTOR_ID),
              actions: actions.sendParent(MATCH_EVENT),
            },
          ]),
        ],
      },
      TEST_CANNOT: {
        actions: [
          actions.log('on.TEST_CANNOT', MAILBOX_ID),
          actions.choose([
            {
              cond: isChildBusyAcceptable(ACTOR_ID),
              actions: actions.sendParent(MATCH_EVENT),
            },
          ]),
        ],
      },
    },
    states: {
      [duck.State.Idle]: {
        entry: actions.log('states.Idle', MAILBOX_ID),
      },
      [duck.State.Busy]: {
        entry: actions.log('states.Busy', MAILBOX_ID),
      },
    },
  })

  /**
   * Test Machine
   */
  const TEST_ID = 'test-id'
  const testMachine = createMachine({
    id: TEST_ID,
    initial: 'idle',
    invoke: {
      id: MAILBOX_ID,
      src: mailboxMachine,
    },
    on: {
      '*': {
        actions: [
          actions.log((_, e) => `on.* [${e.type}]`, TEST_ID),
          MailboxActions.proxy(TEST_ID)(MAILBOX_ID),
        ],
      },
    },
    states: {
      idle: {
        entry: actions.log('states.idle', TEST_ID),
      },
    },
  })

  const eventList: AnyEventObject[] = []
  const interpreter = interpret(testMachine)
    .onEvent(e => eventList.push(e))
    .start()

  const mailboxInterpreter = interpreter.children.get(MAILBOX_ID) as Interpreter<any>
  const mailboxSnapshot = () => mailboxInterpreter.getSnapshot()
  const mailboxState    = () => mailboxSnapshot().value
  const mailboxContext  = () => mailboxSnapshot().context

  const actorInterpreter = mailboxInterpreter.children.get(ACTOR_ID) as Interpreter<any>
  const actorSnapshot = () => actorInterpreter.getSnapshot()
  const actorState    = () => actorSnapshot().value
  const actorContext  = () => actorSnapshot().context

  /**
   * no match if not inside Mailbox.State.Busy state
   */
  eventList.length = 0
  t.equal(mailboxState(), duck.State.Idle, 'mailbox in State.Idle')
  t.equal(actorState(), duck.State.Idle, 'actor in State.Idle')
  interpreter.send('TEST_CAN')
  t.same(eventList, [
    { type: 'TEST_CAN' },
  ], 'should no match TEST_CAN because actor is in State.Idle')

  /**
   * no match if there's no current message origin in Mailbox context
   */
  eventList.length = 0
  interpreter.send('BUSY')
  await new Promise(setImmediate)
  t.equal(mailboxState(), duck.State.Busy, 'should in State.Busy of mailbox')
  t.equal(actorState(), duck.State.Busy, 'should in state State.Busy of actor')
  t.notOk(mailboxContext().message, 'no message in Mailbox context')
  interpreter.send('TEST_CAN')
  t.same(eventList, [
    { type: 'BUSY' },
    { type: 'TEST_CAN' },
  ], 'should not match because child has no current message origin')

  // await new Promise(setImmediate)
  // console.info(eventList)
  // eventList.forEach(e => console.info(e))

  /**
   * no match if the event type is not acceptable by child
   *  (even inside Mailbox.State.Busy state and there's a current message origin in Mailbox context)
   */
  eventList.length = 0
  interpreter.send('SET_ORIGIN')
  t.ok(mailboxContext().message, 'should has message in Mailbox context after SET_ORIGIN')
  t.notOk((actorInterpreter as any).can('TEST_CANNOT'), 'actor cannot accept event TEST_CANNOT')
  interpreter.send('TEST_CANNOT')
  t.same(eventList, [
    { type: 'SET_ORIGIN' },
    { type: 'TEST_CANNOT' },
  ], 'should no match because mailbox has no current message with origin')

  /**
   * match if the event type is acceptable by child
   *  and inside Mailbox.State.Busy state and there's a current message origin in Mailbox context
   */
  eventList.length = 0
  t.notOk((actorInterpreter as any).can('TEST_CAN'), 'actor can accept event TEST_CAN')
  interpreter.send('TEST_CAN')
  t.same(eventList, [
    { type: 'TEST_CAN' },
    { type: MATCH_EVENT },
  ], 'should match because child is in busy state & has current message origin')

  /**
   * no match if we clear the current message origin in Mailbox context
   */
  eventList.length = 0
  interpreter.send('CLEAR_ORIGIN')
  t.notOk(mailboxContext().message, 'should has no message in Mailbox context after CLEAR_ORIGIN')
  interpreter.send('TEST_CAN')

  t.same(eventList, [
    { type: 'CLEAR_ORIGIN' },
    { type: 'TEST_CAN' },
  ], 'should no match because mailbox has no current message origin')

  t.ok(true, 'finished')
  console.info('############################1')
  await new Promise(resolve => setTimeout(resolve, 1000))
  console.info('############################2')
  interpreter.stop()
})
