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

import type { contexts }    from '../context/mod.js'

import * as types   from './types.js'

/**
 * events of: child
 *
 * IDLE is the most important event for Mailbox actor:
 *  it must be send whenever the child machine is idle.
 *  so that the Mailbox can be able to send messages to the child machine
 */
const payloadChildIdle  = (data?: string) => ({ data })
export const CHILD_IDLE = createAction(types.CHILD_IDLE,  payloadChildIdle)()

const payloadChildReply = (message: EventObject)  => ({ message })
export const CHILD_REPLY = createAction(types.CHILD_REPLY, payloadChildReply)()

/**
 * events of: queue
 */
const payloadNewMessage   = (data?: string) => ({ data })
export const NEW_MESSAGE  = createAction(types.NEW_MESSAGE, payloadNewMessage)()

const payloadDispatch = (data?: string) => ({ data })
export const DISPATCH = createAction(types.DISPATCH, payloadDispatch)()

const payloadDequeue  = (message: contexts.AnyEventObjectExt) => ({ message })
export const DEQUEUE  = createAction(types.DEQUEUE, payloadDequeue)()

/**
 * events for : dataging
 */
const payloadReset  = (data?: string) => ({ data })
export const RESET  = createAction(types.RESET, payloadReset)()

const payloadDeadLetter   = (message: AnyEventObject, data?: string) => ({ message, data })
export const DEAD_LETTER  = createAction(types.DEAD_LETTER, payloadDeadLetter)()

export const CHILD_TOGGLE = createAction(types.CHLID_TOGGLE)()
