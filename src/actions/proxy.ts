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

import * as is            from '../is/mod.js'
import type * as impls    from '../impls/mod.js'
import * as context       from '../context/mod.js'

import { send } from './send.js'

/**
 * Send (proxy) all events to target.
 *
 * It will skip the below two type of events:
 *  1. Mailbox type
 *  2. send from Child
 *
 * And send all other events to the target address,
 * by setting the `origin` to the current machine address.
 *
 * @param name Machine Name
 * @param target {string | Address | Mailbox} the target address
 */
export const proxy = (name: string) => (target: string | impls.Address | impls.Mailbox) => {
  const moduleName = `Mailbox<${name}>`

  return actions.choose([
    {
      cond: (_, e, meta) => (
        // 1. Mailbox.Types.* is system messages, skip them
        is.isMailboxType(e.type)
        // 2. Child events (origin from child machine) are handled by child machine, skip them
        || context.conds.eventSentFrom(target)(meta)
      ),
      actions: [],  // do nothing when the event is sent from the mailbox / target.
    },
    {
      actions: [
        send(target)((_, e) => e),
        actions.log((_, e, { _event }) => `actions.proxy [${e.type}]@${_event.origin || ''} -> ${target}`, moduleName),
      ],
    },
  ])
}
