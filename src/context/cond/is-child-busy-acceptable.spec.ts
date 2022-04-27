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
  enum Type {
    MATCH = 'MATCH',

    TEST_CAN    = 'TEST_CAN',
    TEST_CANNOT = 'TEST_CANNOT',

    IDLE = 'IDLE',
    BUSY = 'BUSY',

    SET_ORIGIN   = 'SET_ORIGIN',
    CLEAR_ORIGIN = 'CLEAR_ORIGIN',
  }

  /**
   * Actor Machine
   */
  const ACTOR_ID = 'actor-id'
  const actorMachine = createMachine({
    id: ACTOR_ID,
    on: {
      BUSY: duck.State.Busy,
      IDLE: duck.State.Idle,
    },

    initial: duck.State.Idle,
    states: {
      [duck.State.Idle]: {
        entry: actions.log('states.Idle', ACTOR_ID),
      },
      [duck.State.Busy]: {
        entry: actions.log('states.Busy', ACTOR_ID),
        on: {
          [Type.TEST_CAN]: {
            actions: actions.log('TEST_CAN', ACTOR_ID),
          },
        },
      },
    },
  })

  /**
   * Mailbox Machine
   */
  const MAILBOX_ID = 'mailbox-id'
  const mailboxMachine = createMachine<Context, AnyEventObject>({
    id: MAILBOX_ID,
    invoke: {
      /**
       * Error: Unable to send event to child 'xxx' from service 'yyy'.
       *  @link https://github.com/huan/mailbox/issues/7
       */
      id  : ACTOR_ID,
      src : actorMachine,
    },
    context: {} as Context,

    initial: duck.State.Idle,
    states: {
      [duck.State.Idle]: {
        entry: actions.log('states.Idle', MAILBOX_ID),
        on: {
          [Type.BUSY]: {
            actions: [
              actions.log('on.BUSY', MAILBOX_ID),
              actions.send(Type.BUSY, { to: ACTOR_ID }),
            ],
            target: duck.State.Busy,
          },
        },
      },
      [duck.State.Busy]: {
        entry: actions.log('states.Busy', MAILBOX_ID),
        on: {
          [Type.IDLE]: {
            actions: [
              actions.log('on.IDLE', MAILBOX_ID),
              actions.send(Type.IDLE, { to: ACTOR_ID }),
            ],
            target: duck.State.Idle,
          },
          [Type.SET_ORIGIN]: {
            actions: [
              actions.log('on.SET_ORIGIN', MAILBOX_ID),
              actions.assign({
                message: (_, e, { _event }) => origin.wrapEvent(e, _event.origin),
              }),
              actions.log((ctx, _, { _event }) => `SET_ORIGIN: ctx: ${JSON.stringify(_event)} | ${JSON.stringify(ctx)}`),
              actions.log(ctx => request.address(ctx as any)),
            ],
          },
          [Type.CLEAR_ORIGIN]: {
            actions: [
              actions.log('on.CLEAR_ORIGIN', MAILBOX_ID),
              actions.assign({ message: _ => undefined }),
            ],
          },
          [Type.TEST_CAN]: {
            actions: [
              actions.log('on.TEST_CAN', MAILBOX_ID),
              actions.choose<Context, AnyEventObject>([
                {
                  cond: isChildBusyAcceptable(ACTOR_ID),
                  actions: actions.sendParent(Type.MATCH),
                },
              ]),
            ],
          },
          [Type.TEST_CANNOT]: {
            actions: [
              actions.log('on.TEST_CANNOT', MAILBOX_ID),
              actions.choose<Context, AnyEventObject>([
                {
                  cond: isChildBusyAcceptable(ACTOR_ID),
                  actions: actions.sendParent(Type.MATCH),
                },
              ]),
            ],
          },
        },
      },
    },
  })

  /**
   * Test Machine
   */
  const TEST_ID = 'test-id'
  const testMachine = createMachine({
    id: TEST_ID,
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
    initial: duck.State.Idle,
    states: {
      [duck.State.Idle]: {
        entry: actions.log('states.Idle', TEST_ID),
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
  // const actorContext  = () => actorSnapshot().context

  /**
   * no match if not inside Mailbox.State.Busy state
   */
  eventList.length = 0
  t.equal(mailboxState(), duck.State.Idle, 'mailbox in State.Idle')
  t.equal(actorState(), duck.State.Idle, 'actor in State.Idle')
  interpreter.send(Type.TEST_CAN)
  await new Promise(resolve => setTimeout(resolve, 0))
  t.same(eventList, [
    { type: Type.TEST_CAN },
  ], 'should no match TEST_CAN because actor is in State.Idle')

  /**
   * no match if there's no current message origin in Mailbox context
   */
  eventList.length = 0
  interpreter.send(Type.BUSY)
  await new Promise(resolve => setTimeout(resolve, 0))
  t.equal(mailboxState(), duck.State.Busy, 'should in State.Busy of mailbox')
  t.equal(actorState(), duck.State.Busy, 'should in state State.Busy of actor')
  t.notOk(mailboxContext().message, 'no message in Mailbox context')
  interpreter.send(Type.TEST_CAN)
  await new Promise(resolve => setTimeout(resolve, 0))
  t.same(eventList, [
    { type: Type.BUSY },
    { type: Type.TEST_CAN },
  ], 'should not match because child has no current message origin')

  // await new Promise(setImmediate)
  // console.info(eventList)
  // eventList.forEach(e => console.info(e))

  /**
   * no match if the event type is not acceptable by child
   *  (even inside Mailbox.State.Busy state and there's a current message origin in Mailbox context)
   */
  t.notOk(mailboxContext().message, 'should has no message in Mailbox context before SET_ORIGIN')
  interpreter.send(Type.SET_ORIGIN)
  await new Promise(resolve => setTimeout(resolve, 0))
  t.ok(mailboxContext().message, 'should has message in Mailbox context after SET_ORIGIN')

  t.notOk((actorInterpreter as Interpreter<any>).state.can('TEST_CANNOT'), 'actor cannot accept event TEST_CANNOT')
  eventList.length = 0
  interpreter.send(Type.TEST_CANNOT)
  await new Promise(resolve => setTimeout(resolve, 0))
  t.same(eventList, [
    { type: Type.TEST_CANNOT },
  ], 'should no match because mailbox has no current message with origin')

  /**
   * match if the event type is acceptable by child
   *  and inside Mailbox.State.Busy state and there's a current message origin in Mailbox context
   */
  eventList.length = 0
  t.ok((actorInterpreter as Interpreter<any>).state.can(Type.TEST_CAN), 'actor can accept event TEST_CAN')
  interpreter.send(Type.TEST_CAN)
  await new Promise(resolve => setTimeout(resolve, 0))
  t.same(eventList, [
    { type: Type.TEST_CAN },
    { type: Type.MATCH },
  ], 'should match because child is in busy state & has current message origin')

  /**
   * no match if we clear the current message origin in Mailbox context
   */
  eventList.length = 0
  interpreter.send(Type.CLEAR_ORIGIN)
  await new Promise(resolve => setTimeout(resolve, 0))
  t.notOk(mailboxContext().message, 'should has no message in Mailbox context after CLEAR_ORIGIN')
  interpreter.send(Type.TEST_CAN)
  await new Promise(resolve => setTimeout(resolve, 0))
  t.same(eventList, [
    { type: Type.CLEAR_ORIGIN },
    { type: Type.TEST_CAN },
  ], 'should no match because mailbox has no current message origin')

  interpreter.stop()
})
