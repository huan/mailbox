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
  AnyEventObject,
}                   from 'xstate'

import * as duck        from '../duck/mod.js'
import * as context    from '../context/mod.js'

import { IS_DEVELOPMENT }     from '../config.js'
import { validate }           from '../validate.js'
import {
  MAILBOX_TARGET_MACHINE_ID,
  MAILBOX_NAME,
}                             from './constants.js'
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
    throw new Error('Mailbox.wrap: invalid targetMachine!')
  }

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
    context.Context,
    /**
     * add child event types to mailbox event types
     *
     * Huan(202112) TODO: remove the `TEvent['type']` and just use `TEvent`
     */
    duck.Event[keyof duck.Event] | { type: TEvent['type'] }
  >({
    id: normalizedOptions.id,
    invoke: {
      id: MAILBOX_TARGET_MACHINE_ID,
      src: targetMachine,
    },
    /**
     * initialize context:
     *  factory call to make sure the contexts will not be modified
     *  by mistake from other machines
     */
    context: () => context.initialContext(),
    /**
     * Issue statelyai/xstate#2891:
     *  The context provided to the expr inside a State
     *  should be exactly the **context in this state**
     * @see https://github.com/statelyai/xstate/issues/2891
     */
    preserveActionOrder: true,

    initial: duck.State.Idle,
    states: {

      /**
       *
       * Child State.Idle:
       *
       * 1. transited to idle     -> emit NEW_MESSAGE if queue size > 0
       * 2. received CHILD_REPLY  -> unwrap message then: 1/ reply it to the original sender, or 2/ send it to Deal Letter Queue (DLQ)
       * 5. received '*'          -> save it to queue and emit NEW_MESSAGE if: 1/ non-internal type, and 2/ non-overflow-capacity
       * 3. received NEW_MESSAGE  -> emit DEQUEUE
       * 4. received DEQUEUE      -> transit to Busy
       *
       */

      [duck.State.Idle]: {
        /**
         * DISPATCH event MUST be only send from child.idle
         *  because it will drop the current message and dequeue the next one
         */
        entry: [
          actions.log(ctx => `states.child.Idle.entry queue size = ${context.queue.size(ctx)}`, MAILBOX_ADDRESS_NAME),
          actions.choose<context.Context, AnyEventObject>([
            {
              cond: ctx => context.queue.size(ctx) > 0,
              actions: [
                actions.log(ctx => `states.queue.Idle.entry [${context.queue.messageType(ctx)}]@${context.queue.messageOrigin(ctx)}`, MAILBOX_ADDRESS_NAME),
                actions.send(duck.Event.NEW_MESSAGE()),
              ],
            },
          ]),
        ],
        on: {
          /**
           * Huan(202204): No matter idle or busy: the child may send reponse message at any time.
           *  TODO: it would be better to remove the state global on.CHILD_REPLY, just leave the duck.state.Busy.on.CHILD_REPLY should be better.
           *
           * XState duck.state.exit.actions & micro transitions will be executed in the next state #4
           *  @link https://github.com/huan/mailbox/issues/4
           */
          [duck.Type.CHILD_REPLY]: {
            actions: [
              actions.log((_, e) => `states.child.Idle.on.CHILD_REPLY [${(e as duck.Event['CHILD_REPLY']).payload.message.type}]`, MAILBOX_ADDRESS_NAME),
              context.sendChildResponse(MAILBOX_ADDRESS_NAME),
            ],
          },

          /**
           * Huan(202201) FIXME: remove the `as any` at the end of the `actions.log(...)`.
           *  Is this a bug in xstate? to be confirmed. (hope xstate@5 will fix it)
           */
          [duck.Type.NEW_MESSAGE]: {
            actions: [
              actions.log((_, e) => `states.child.Idle.on.NEW_MESSAGE (${(e as duck.Event['NEW_MESSAGE']).payload.data})`, MAILBOX_ADDRESS_NAME) as any,
              actions.send(ctx => duck.Event.DEQUEUE(context.queue.message(ctx)!)),
            ],
          },
          [duck.Type.DEQUEUE]: duck.State.Busy,
          /**
           * Match events not listed above
           */
          '*': {
            actions: context.queue.acceptingMessageWithCapacity(MAILBOX_ADDRESS_NAME)(normalizedOptions.capacity),
          },
        },
      },

      /**
       *
       * Child State.Busy
       *
       * 1. transited to busy     -> unwrap message from DEQUEUE event, then a) save it to `context.message`, and b) send it to child
       * 2. received CHILD_REPLY  -> unwrap message from CHILD_REPLY event, then reply it to the sender of `context.message`
       * 3. received CHLID_IDLE   -> transit to Idle
       *
       *            * 3. assignDequeue
       * 4. assignEmptyQueue if queue size <= 0
       */
      [duck.State.Busy]: {
        entry: [
          actions.log((_, e) => `states.child.Busy.entry DEQUEUE [${(e as duck.Event['DEQUEUE']).payload.message.type}]`, MAILBOX_ADDRESS_NAME),
          actions.assign<context.Context, duck.Event['DEQUEUE']>({
            message: (_, e) => e.payload.message,
          }),
          context.assign.dequeue,
          actions.send<context.Context, duck.Event['DEQUEUE']>(
            (_, e) => e.payload.message,
            { to: MAILBOX_TARGET_MACHINE_ID },
          ),
        ],
        on: {
          '*': {
            actions: context.queue.acceptingMessageWithCapacity(MAILBOX_ADDRESS_NAME)(normalizedOptions.capacity),
          },

          [duck.Type.CHILD_IDLE]: {
            actions: [
              actions.log((_, __, meta) => `states.child.Busy.on.CHILD_IDLE from "@${meta._event.origin}"`, MAILBOX_ADDRESS_NAME) as any,
              actions.send(duck.Event.CHILD_TOGGLE()),
            ],
          },
          [duck.Type.CHILD_REPLY]: {
            actions: [
              actions.log((_, e) => `states.child.Busy.on.CHILD_REPLY [${(e as duck.Event['CHILD_REPLY']).payload.message.type}]`, MAILBOX_ADDRESS_NAME),
              context.sendChildResponse(MAILBOX_ADDRESS_NAME),
            ],
          },
          [duck.Type.CHLID_TOGGLE]: duck.State.Idle,
        },
        exit: [
          actions.choose([
            {
              cond: ctx => context.queue.size(ctx) <= 0,
              actions: context.assign.emptyQueue,
            },
          ]),
        ],
      },
    },
  })
  return machine
}
