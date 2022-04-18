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

/**
 * Idle Time – Definition, Causes, And How To Reduce It
 *  @see https://limblecmms.com/blog/idle-time/
 *
 * Note: idle & busy are only for Async mode.
 *  non-async mode should use listening/standby (see below)
 */
export const Idle = 'mailbox/Idle'
export const Busy = 'mailbox/Busy'

/**
 * Non-async mode should use listening/standby
 */
export const Listening = 'mailbox/Listening'
export const Standby   = 'mailbox/Standby'

/**
 * Dispatch v.s. Deliver
 *  - dispatch: internally preparation
 *  - deliver: externally shipping
 *
 *  @see https://tshirtfoundry.zendesk.com/hc/en-gb/articles/200668566-What-s-the-difference-between-dispatch-and-delivery-
 */
export const Dispatching  = 'mailbox/Dispatching'
export const Delivering   = 'mailbox/Dilivering'
export const Dequeuing    = 'mailbox/Dequeuing'
export const Checking     = 'mailbox/Checking'

export const Responding = 'mailbox/Responding'

export const Resetting = 'mailbox/Resetting'
export const Spawning  = 'mailbox/Spawning'

export const Incoming = 'mailbox/Incoming'
export const Outgoing = 'mailbox/Outgoing'
export const Routing  = 'mailbox/Routing'
