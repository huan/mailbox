/* eslint-disable sort-keys */
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
import { actions, AnyEventObject }    from 'xstate'

import * as duck        from '../../duck/mod.js'
import * as is          from '../../is/mod.js'
import { wrappedId }    from '../../mailbox-id.js'

import type { Context }   from '../context.js'
import * as cond          from '../cond/mod.js'
import * as assign        from './mod.js'

import { size }   from './size.js'

/**
 * 1. Skip Mailbox internal event
 * 2. skip Child event
 * 3. send(drop) letter to DLQ if capacity overflow
 * 4. emit NEW_MESSAGE after enqueue the message to the queue
 */
export const newMessage = (actorId: string) => (capacity = Infinity) => actions.choose<Context, AnyEventObject>([
  {
    // 1.1. Ignore all Mailbox.Types.* because they are internal messages
    cond: (_, e) => is.isMailboxType(e.type),
    actions: actions.log((_, e) => `newMessage [${e.type}] ignored system message`, actorId),
  },
  {
    // 1.2. Ignore Child events (origin from child machine) because they are sent from the child machine
    cond: cond.isEventFrom(wrappedId(actorId)),
    actions: actions.log((_, e) => `newMessage [${e.type}] ignored internal message`, actorId),
  },
  {
    /**
     * 2. Bounded mailbox: out of capicity, send them to Dead Letter Queue (DLQ)
     */
    cond: ctx => size(ctx) > capacity,
    actions: [
      actions.log((ctx, e, { _event }) => `newMessage(${capacity}) dead letter [${e.type}]@${_event.origin || ''} because out of capacity: queueSize(${size(ctx)}) > capacity(${capacity})`, actorId),
      actions.send((ctx, e) => duck.Event.DEAD_LETTER(e, `queueSize(${size(ctx)} out of capacity(${capacity})`)),
    ],
  },
  /**
   *
   * Child is **Busy** but **can** accept this message type
   *
   */
  {
    /**
     * 4. Forward to child when the child can accept this new arrived event even it's busy
     *    for prevent deaadlock when child actor want to receive events at BUSY state.
     */
    cond: cond.isChildBusyAcceptable(wrappedId(actorId)),
    actions: [
      actions.log((_, e, { _event }) => `newMessage [${e.type}]@${_event.origin} isChildBusyAcceptable`, actorId),
      /**
       * keep the original of event by forwarding(`forwardTo`, instead of `send`) it
       *
       * Huan(202204): does the above `forwardTo` necessary?
       *  consider to use `send` to replace `forwardTo`
       *  because a message will be acceptable only if it is sending from the same origin as the current processing message
       */
      actions.forwardTo(wrappedId(actorId)),
    ],
  },
  {
    /**
     * 3. Add incoming message to queue by wrapping the `_event.origin` meta data
     */
    actions: [
      actions.log((_, e, { _event }) => `newMessage [${e.type}]@${_event.origin} external message accepted`, actorId),
      assign.enqueue,  // <- wrapping `_event.origin` inside
      actions.send((_, e) => duck.Event.NEW_MESSAGE(e.type)),
    ],
  },

]) as any
