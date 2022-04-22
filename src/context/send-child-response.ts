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
/**
 * XState Actors:
 *  @see https://xstate.js.org/docs/guides/actors.html#actor-api
 */

import { actions }    from 'xstate'

import * as duck                        from '../duck/mod.js'
import { MAILBOX_TARGET_MACHINE_ID }    from '../impls/constants.js'

import * as child             from './child.js'
import type { Context }       from './context.js'
import { childSessionIdOf }   from './child-session-id-of.js'

/**
 * Send an event as response to the current processing message of Mailbox.
 *
 *  send the CHILD_RESPONSE.payload.message to the child message origin
 */
export const sendChildResponse = (machineName: string) => actions.choose<Context, ReturnType<typeof duck.Event.ACTOR_REPLY>>([
  {
    /**
     * I. validate the event, make it as the reply of actor if it valid
     */
    cond: (ctx, _, { _event, state }) =>
      // 1. current event is sent from CHILD_MACHINE_ID
      (!!_event.origin && _event.origin === childSessionIdOf(MAILBOX_TARGET_MACHINE_ID)(state.children))
      // 2. the message has valid origin for which we are going to reply to
      && !!child.messageOrigin(ctx),
    actions: [
      actions.log((ctx, e) => `contexts.sendChildResponse [${e.payload.message.type}] to [${child.message(ctx)?.type}]@${child.messageOrigin(ctx)}`, machineName),
      actions.send(
        (_, e) => e.payload.message,
        { to: ctx => child.messageOrigin(ctx)! },
      ),
    ],
  },
  /**
   * II. send invalid event to Dead Letter Queue (DLQ)
   */
  {
    actions: [
      actions.log((_, e, { _event }) => `contexts.sendChildResponse dead letter [${e.payload.message.type}]@${_event.origin || ''}`, machineName),
      actions.send((_, e, { _event }) => duck.Event.DEAD_LETTER(
        e.payload.message,
        `message ${e.payload.message.type}@${_event.origin || ''} dropped`,
      )),
    ],
  },
]) as any
