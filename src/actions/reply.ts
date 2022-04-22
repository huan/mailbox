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
import {
  actions,
  SendActionOptions,
}                         from 'xstate'

import * as events    from '../duck/events.js'

/**
 * Huan(202112): for child, respond the mailbox implict or explicit?
 *
 *  1. implict: all events are sent to the mailbox and be treated as the reply to the current message
 *  2. explicit: only the events that are explicitly sent to the mailbox via `sendParent`, are treated as the reply to the current message
 *
 * Current: explicit(2). (see: contexts.respondChildMessage)
 */
export const reply: typeof actions.sendParent = (event, options) => {
  /**
   * Huan(202201): Issue #11 - Race condition: Mailbox think the target machine is busy when it's not
   * @link https://github.com/wechaty/bot5-assistant/issues/11
   *
   * add a `delay:0` when sending reply events to put the send action to the next tick
   */
  const delayedOptions: SendActionOptions<any, any> = {
    delay: 0,
    ...options,
  }

  if (typeof event === 'function') {
    return actions.sendParent(
      (ctx, e, meta) => events.ACTOR_REPLY(event(ctx, e, meta)),
      delayedOptions,
    )
  } else if (typeof event === 'string') {
    return actions.sendParent(
      events.ACTOR_REPLY({ type: event }),
      delayedOptions,
    )
  } else {
    return actions.sendParent(
      /**
       * Huan(202112) FIXME: remove any
       *
       * How to fix TS2322: "could be instantiated with a different subtype of constraint 'object'"?
       *  @link https://stackoverflow.com/a/56701587/1123955
       */
      events.ACTOR_REPLY(event) as any,
      delayedOptions,
    )
  }
}
