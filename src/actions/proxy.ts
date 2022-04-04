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

import { isMailboxType }  from '../is-mailbox-type.js'
import * as contexts      from '../contexts.js'
import type { IMailbox }  from '../mailbox-interface.js'
import { isMailbox }      from '../is-mailbox.js'
import type { MailboxImpl } from '../mailbox-implementation.js'

/**
 * Send events to child except:
 *  1. Mailbox type
 *  2. send from Child
 */
export const proxy = (name: string) => (target: string | IMailbox) => {
  const moduleName = `Mailbox<${name}>`
  return actions.choose([
    {
      // 1. Mailbox.Types.* is system messages, skip them
      cond: (_, e) => isMailboxType(e.type),
      actions: [],  // skip
    },
    {
      // 2. Child events (origin from child machine) are handled by child machine, skip them
      cond: (_, __, meta) => isMailbox(target)
        ? contexts.condEventSentFrom(String(target.address))(meta)
        : contexts.condEventSentFrom(target)(meta),
      actions: [],  // do nothing when the event is sent from the target.
    },
    {
      actions: [
        actions.send((_, e) => e, {
          to: isMailbox(target)
            /**
             * Huan(202204):
             *  If target is Mailbox, then use its internal interpreter as the target ActorRef
             *  so that it can receive the event with the `origin` source.
             */
            ? () => (target as MailboxImpl).internal.interpreter
            : target,
        }),
        actions.log((_, e, { _event }) => `actions.proxy [${e.type}]@${_event.origin || ''} -> ${target}`, moduleName),
      ],
    },
  ])
}
