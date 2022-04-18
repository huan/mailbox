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

import * as duck                        from '../duck/mod.js'
import * as is                          from '../is/mod.js'
import { MAILBOX_TARGET_MACHINE_ID }    from '../impls/constants.js'

import type { Context }   from './context.js'
import * as origin        from './origin.js'
import * as conds         from './conds.js'
import * as assign        from './assign.js'

export const size          = (ctx: Context) => ctx.queue.length - ctx.index
export const message       = (ctx: Context) => ctx.queue[ctx.index]
export const messageType   = (ctx: Context) => ctx.queue[ctx.index]?.type

/**
 * `origin` is the session id of the child machine
 *  we use it as the `address` of the Mailbox.
 */
export const messageOrigin = (ctx: Context) => origin.metaOrigin(message(ctx))

export const acceptingMessageWithCapacity = (machineName: string) => (capacity = Infinity) => actions.choose<Context, AnyEventObject>([
  {
    // 1.1. Ignore all Mailbox.Types.* because they are internal messages
    cond: (_, e) => is.isMailboxType(e.type),
    actions: [],  // skip
  },
  {
    // 1.2. Ignore Child events (origin from child machine) because they are sent from the child machine
    cond: (_, __, meta) => conds.eventSentFrom(MAILBOX_TARGET_MACHINE_ID)(meta),
    actions: [],  // skip
  },
  {
    /**
     * 2. Bounded mailbox: out of capicity, send them to Dead Letter Queue (DLQ)
     */
    cond: ctx => size(ctx) > capacity,
    actions: [
      actions.log((ctx, e, { _event }) => `contexts.queueAcceptingMessageWithCapacity(${capacity}) dead letter [${e.type}]@${_event.origin || ''} because queueSize(${size(ctx)}) > capacity(${capacity}): child(busy) out of capacity`, machineName),
      actions.send((ctx, e) => duck.Event.DEAD_LETTER(e, `queueSize(${size(ctx)} out of capacity(${capacity})`)),
    ],
  },
  {
    /**
     * 3. Add incoming message to queue by wrapping the `_event.origin` meta data
     */
    actions: [
      actions.log((_, e, { _event }) => `contexts.queueAcceptingMessageWithCapacity(${capacity}) queue [${e.type}]@${_event.origin || ''} to child(busy)`, machineName),
      assign.enqueue,  // <- wrapping `_event.origin` inside
      actions.send((_, e) => duck.Event.NEW_MESSAGE(e.type)),
    ],
  },

]) as any
