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
import type { AnyEventObject, GuardMeta }   from 'xstate'

import type { Address }   from '../../impls/address-interface.js'
import type { Mailbox }   from '../../impls/mailbox-interface.js'

import * as child   from '../child/mod.js'

/**
 * Check condition of whether an event is sent from the session/child id (with currying)
 *
 * @param address { string | Address | Mailbox }
 *  - string: the session id (x:0) or the child id (child-id)
 */
export const isEventFrom = (address: string | Address | Mailbox) => {

  if (typeof address !== 'string') {
    const id = String(address)
    return (_: any, __: any, meta: GuardMeta<any, AnyEventObject>): boolean =>
      meta._event.origin === id
  }

  return (_: any, __: any, meta: GuardMeta<any, AnyEventObject>): boolean =>
    !meta._event.origin ? false
      /**
       * 1. `address` match `sessionId` (origin), or
       */
      : meta._event.origin === address ? true
        /**
         * 2. `address` is a valid `childId`, and the `origin` is equal to its `sessionId`
         */
        : meta._event.origin === child.sessionId(address)(meta.state.children)
}
