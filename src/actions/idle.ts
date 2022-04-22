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
import { actions }  from 'xstate'

import * as duck    from '../duck/mod.js'
import * as is      from '../is/mod.js'

export const idle = (name: string) => (data: string) => {
  const moduleName = `${name}<Mailbox>`

  return actions.choose([
    {
      /**
       * If the transition event is a Mailbox type events (system messages):
       *  then do not trigger DISPATCH event
       *  because only non-mailbox-type events need to check QUEUE
       */
      cond: (_, e) => is.isMailboxType(e.type),
      actions: [
        actions.log((_, e) => `actions.idle ignore Mailbox internal event [${e.type}]`, moduleName),
      ],
    },
    {
      /**
       * send ACTOR_IDLE event to the mailbox for receiving new messages
       */
      actions: [
        actions.log(`actions.idle sendParent [ACTOR_IDLE(${data})]`, moduleName),
        actions.sendParent(duck.Event.ACTOR_IDLE(data)),
      ],
    },
  ]) as any
}
