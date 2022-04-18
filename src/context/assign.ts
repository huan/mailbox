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

import type { Context }   from './context.js'
import * as origin        from './origin.js'

/**
 * wrap an event as a message and enqueue it to ctx.queue as a new message
 */
export const assignEnqueue = actions.assign<Context, AnyEventObject>({
  queue: (ctx, e, { _event }) => [
    ...ctx.queue,
    origin.wrapEvent(e, _event.origin),
  ],
})

/**
 * dequeue ctx.queue by updating the index by increasing 1 (current message pointer move forward)
 */
export const assignDequeue = actions.assign<Context>({
  // message: ctx => ctx.queue.shift()!,
  index: ctx => ctx.index + 1,
}) as any

/**
 * Reset the queue and index
 */
export const assignEmptyQueue = actions.assign<Context>({
  index: _ => 0,
  queue: _ => [],
}) as any
