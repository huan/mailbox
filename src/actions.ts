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
import {
  actions,
  SendActionOptions,
}                         from 'xstate'

import { events }         from './duck/mod.js'

import { isMailboxType }  from './is-mailbox-type.js'
import * as contexts      from './contexts.js'

export const idle = (name: string) => (data: string) => {
  const moduleName = `${name}<Mailbox>`

  return actions.choose([
    {
      /**
       * If the transition event is a Mailbox type events (system messages):
       *  then do not trigger DISPATCH event
       *  because only non-mailbox-type events need to check QUEUE
       */
      cond: (_, e) => isMailboxType(e.type),
      actions: [
        actions.log((_, e) => `actions.idle [${e.type}] is MailboxType: skipped`, moduleName),
      ],
    },
    {
      /**
       * send CHILD_IDLE event to the mailbox for receiving new messages
       */
      actions: [
        actions.log((_, _e) => `actions.idle -> [CHILD_IDLE(${data})]`, moduleName),
        actions.sendParent(_ => events.CHILD_IDLE(data)),
      ],
    },
  ]) as any
}

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
      (ctx, e, meta) => events.CHILD_REPLY(event(ctx, e, meta)),
      delayedOptions,
    )
  } else if (typeof event === 'string') {
    return actions.sendParent(
      events.CHILD_REPLY({ type: event }),
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
      events.CHILD_REPLY(event) as any,
      delayedOptions,
    )
  }
}

/**
 * Send events to child except:
 *  1. Mailbox type
 *  2. send from Child
 */
export const proxyToChild = (name: string) => (childId: string) => {
  const moduleName = `Mailbox<${name}>`
  return actions.choose([
    {
      // 1. Mailbox.Types.* is system messages, skip them
      cond: (_, e) => isMailboxType(e.type),
      actions: [],  // skip
    },
    {
      // 2. Child events (origin from child machine) are handled by child machine, skip them
      cond: (_, __, meta) => contexts.condEventSentFromChildOf(childId)(meta),
      actions: [],  // skip
    },
    {
      actions: [
        actions.send((_, e) => e, { to: childId }),
        actions.log((_, e, { _event }) => `actions.proxyToChild [${e.type}]@${_event.origin || ''} -> ${childId}`, moduleName),
      ],
    },
  ])
}
