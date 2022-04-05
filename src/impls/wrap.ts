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
/**
 * Mailbox provides the address for XState Actors:
 *  @see https://xstate.js.org/docs/guides/actors.html#actor-api
 */

/* eslint-disable sort-keys */
import {
  actions,
  createMachine,
  StateMachine,
  EventObject,
}                   from 'xstate'

import { events, states, types }  from '../duck/mod.js'

import { IS_DEVELOPMENT }     from '../config.js'
import type { Event }         from '../duck/event-type.js'
import { validate }           from '../validate.js'

import {
  MAILBOX_TARGET_MACHINE_ID,
  MAILBOX_NAME,
}                             from './constants.js'
import * as contexts          from './contexts.js'
import type { Options }       from './mailbox-interface.js'

/**
 * Add Mailbox Queue to the targetMachine
 *
 * @param targetMachine
 * @param options
 * @returns Wrapped targetMachine with Mailbox Queue
 */
export function wrap <
  TContext extends any,
  TEvent extends EventObject,
> (
  targetMachine: StateMachine<
    TContext,
    any,
    TEvent
  >,
  options?: Options,
) {
  /**
   * when in developement mode, we will validate the targetMachine
   */
  if (IS_DEVELOPMENT && !validate(targetMachine)) {
    throw new Error('Mailbox.address: targetMachine is not valid')
  }

  // console.info('TESTING:', targetMachine.id, new Error().stack)

  const MAILBOX_ADDRESS_NAME = `${targetMachine.id}<${MAILBOX_NAME}>`

  const normalizedOptions: Required<Options> = {
    id       : MAILBOX_ADDRESS_NAME,
    capacity : Infinity,
    logger   : () => {},
    devTools : false,
    ...options,
  }

  // https://xstate.js.org/docs/guides/context.html#initial-context

  const machine = createMachine<
    contexts.Context,
    /**
     * add child event types to mailbox event types
     *
     * Huan(202112) TODO: remove the `TEvent['type']` and just use `TEvent`
     */
    Event | { type: TEvent['type'] }
  >({
    id: normalizedOptions.id,
    invoke: {
      id: MAILBOX_TARGET_MACHINE_ID,
      src: targetMachine,
    },
    type: 'parallel',
    /**
     * initialize context:
     *  factory call to make sure the contexts will not be modified
     *  by mistake from other machines
     */
    context: () => contexts.initialContext(),
    /**
     * Issue statelyai/xstate#2891:
     *  The context provided to the expr inside a State
     *  should be exactly the **context in this state**
     * @see https://github.com/statelyai/xstate/issues/2891
     */
    preserveActionOrder: true,
    states: {
      queue: {
        /**
         * queue states transitions are all SYNC
         */
        initial: states.listening,
        on: {
          '*': {
            actions: contexts.queueAcceptingMessageWithCapacity(MAILBOX_ADDRESS_NAME)(normalizedOptions.capacity),
          },
        },
        states: {
          [states.listening]: {
            entry: [
              actions.log('states.queue.listening.entry', MAILBOX_ADDRESS_NAME),
            ],
            on: {
              [types.DISPATCH]: states.checking,
            },
          },
          [states.checking]: {
            entry: [
              actions.log((_, e) => `states.queue.checking.entry <- [DISPATCH(${(e as ReturnType<typeof events.DISPATCH>).payload.data})]`, MAILBOX_ADDRESS_NAME),
            ],
            always: [
              {
                cond: ctx => contexts.queueSize(ctx) > 0,
                actions: [
                  actions.log(ctx => `states.queue.checking.always -> dequeuing (queue size ${contexts.queueSize(ctx)} > 0)`, MAILBOX_ADDRESS_NAME),
                ],
                target: states.dequeuing,
              },
              {
                actions: actions.log('states.queue.checking.always -> listening (queue is empty)', MAILBOX_ADDRESS_NAME),
                target: states.listening,
              },
            ],
          },
          [states.dequeuing]: {
            entry: [
              actions.log(ctx => `states.queue.dequeuing.entry [${contexts.queueMessageType(ctx)}]@${contexts.queueMessageOrigin(ctx)}`, MAILBOX_ADDRESS_NAME),
              actions.send(ctx => events.DEQUEUE(contexts.queueMessage(ctx)!)),
              // contexts.sendCurrentMessageToChild,
            ],
            exit: [
              contexts.assignDequeue,
              actions.choose([
                {
                  cond: ctx => contexts.queueSize(ctx) <= 0,
                  actions: contexts.assignEmptyQueue,
                },
              ]),
            ],
            always: states.listening,
          },
        },
      },
      child: {
        initial: states.idle,
        on: {
          /**
           * No matter idle or busy: the child may send reponse message at any time.
           */
          [types.CHILD_REPLY]: {
            actions: [
              contexts.sendChildResponse(MAILBOX_ADDRESS_NAME),
            ],
          },
        },
        states: {
          [states.idle]: {
            /**
             * SEND event MUST be only send from child.idle
             *  because it will drop the current message and dequeue the next one
             */
            entry: [
              actions.log('states.child.idle.entry', MAILBOX_ADDRESS_NAME),
              actions.send(events.DISPATCH(states.idle)),
            ],
            on: {
              /**
               * FIXME:
               * TODO:
               * Huan(202201): remove the `as any` below.
               *  Is this a bug in xstate? to be confirmed. (hope xstate@5 will fix it)
               */
              [types.DEQUEUE]: {
                actions: [
                  actions.log((_, e) => `states.child.idle.on.DEQUEUE [${(e as ReturnType<typeof events.DEQUEUE>).payload.message.type}]@${contexts.metaOrigin((e as ReturnType<typeof events.DEQUEUE>).payload.message)}`, MAILBOX_ADDRESS_NAME) as any,
                  contexts.assignChildMessage,
                ],
                target: states.busy,
              },
              [types.NEW_MESSAGE]: {
                actions: [
                  actions.log((_, e) => `states.child.idle.on.NEW_MESSAGE (${(e as ReturnType<typeof events.NEW_MESSAGE>).payload.data})`, MAILBOX_ADDRESS_NAME) as any,
                  actions.send(_ => events.DISPATCH(types.NEW_MESSAGE)) as any,
                ],
              },
            },
          },
          [states.busy]: {
            entry: [
              actions.log((_, e) => `states.child.busy.entry DEQUEUE [${(e as ReturnType<typeof events.DEQUEUE>).payload.message.type}]`, MAILBOX_ADDRESS_NAME),
              contexts.sendChildMessage,
            ],
            on: {
              [types.CHILD_IDLE]: states.idle,
            },
          },
        },
      },
    },
  })
  return machine
}
