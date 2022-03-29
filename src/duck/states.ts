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
enum State {
  /**
   * Idle Time – Definition, Causes, And How To Reduce It
   *  @see https://limblecmms.com/blog/idle-time/
   *
   * Note: idle & busy are only for Async mode.
   *  non-async mode should use listening/standby (see below)
   */
  idle = 'mailbox/idle',
  busy = 'mailbox/busy',

  /**
   * Non-async mode should use listening/standby
   */
  listening = 'mailbox/listening',
  standby   = 'mailbox/standby',

  /**
   * Dispatch v.s. Deliver
   *  - dispatch: internally preparation
   *  - deliver: externally shipping
   *
   *  @see https://tshirtfoundry.zendesk.com/hc/en-gb/articles/200668566-What-s-the-difference-between-dispatch-and-delivery-
   */
  dispatching = 'mailbox/dispatching',
  delivering  = 'mailbox/dilivering',
  dequeuing   = 'mailbox/dequeuing',
  checking = 'mailbox/checking',

  responding = 'mailbox/responding',

  resetting = 'mailbox/resetting',
  spawning  = 'mailbox/spawning',

  incoming = 'mailbox/incoming',
  outgoing = 'mailbox/outgoing',
  routing  = 'mailbox/routing',
}

const states = State

export {
  type State,
  states,
}
