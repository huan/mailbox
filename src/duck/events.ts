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
import { createAction }                       from 'typesafe-actions'
import type { AnyEventObject, EventObject }   from 'xstate'

import type * as context  from '../context/mod.js'

import * as types   from './types.js'

/**
 * events of: child
 *
 * IDLE is the most important event for Mailbox actor:
 *  it must be send whenever the child machine is idle.
 *  so that the Mailbox can be able to send messages to the child machine
 */
export const ACTOR_IDLE = createAction(types.ACTOR_IDLE)()

const payloadActorReply = (message: EventObject)  => ({ message })
export const ACTOR_REPLY = createAction(types.ACTOR_REPLY, payloadActorReply)()

/**
 * events of: queue
 */
const payloadNewMessage   = (type: string) => ({ type })
export const NEW_MESSAGE  = createAction(types.NEW_MESSAGE, payloadNewMessage)()

const payloadDequeue  = (message: context.origin.AnyEventObjectExt) => ({ message })
export const DEQUEUE  = createAction(types.DEQUEUE, payloadDequeue)()

/**
 * events for : debuging
 */
const payloadDeadLetter   = (message: AnyEventObject, data?: string) => ({ message, data })
export const DEAD_LETTER  = createAction(types.DEAD_LETTER, payloadDeadLetter)()
