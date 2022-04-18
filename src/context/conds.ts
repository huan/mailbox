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
import type {
  AnyEventObject,
  ActorRef,
  Interpreter,
  GuardMeta,
  State,
  EventObject,
}                     from 'xstate'

import * as impls   from '../impls/mod.js'

import type { Address }               from '../impls/address-interface.js'
import type { Mailbox }               from '../impls/mailbox-interface.js'
import { MAILBOX_TARGET_MACHINE_ID }  from '../impls/constants.js'

import type { Context } from './context.js'
/**
 * Get session id by child id (with currying) from children
 * @param childId child id
 * @param children children
 * @returns session id
 *
 * If the `childId` is a not valid childId, will return `undefined`
 */
export const childSessionIdOf: (childId: string) => (children?: Record<string, ActorRef<any, any>>) => undefined | string
  = childId => children => {
    if (!children) {
      return undefined
    }

    const child = children[childId] as undefined | Interpreter<any>
    if (!child) {
      throw new Error('can not found child id ' + childId)
    }

    if (!child.sessionId) {
      /**
       * Huan(202112):
       *
       * When we are not using the interpreter, we can not get the sessionId
       * for example, we are usint the `machine.transition(event)`
       */
      // console.error(new Error('can not found child sessionId from ' + CHILD_MACHINE_ID))
      return undefined
    }

    return child.sessionId
  }

/**
* Get snapshot by child id (with currying) from state
*/
export const childSnapshotOf = (childId: string) => (state: State<Context, EventObject, any, any>) => {
  const child = state.children[childId]
  if (!child) {
    throw new Error('can not found child id ' + childId)
  }

  return child.getSnapshot()
}

/**
* Check condition of whether an event is sent from the session/child id (with currying)
*/
export const condEventSentFrom = (target: string | Address | Mailbox) => {
  /**
   * Convert `target` to address id first
   */
  const address = String(impls.AddressImpl.from(target))

  return (meta: GuardMeta<any, AnyEventObject>): boolean => !!(meta._event.origin) && (
    /**
     * 1. `source` as `sessionId` (origin)
     */
    meta._event.origin === address
    /**
     * 2. `source` as `childId`
     */
    || meta._event.origin === childSessionIdOf(address)(meta.state.children)
  )
}

/**
* Check condition of whether an event can be accepted by the child id (with currying)
*
* @deprecated we do not check "can be accepted by child" any more. Huan(202204)
*/
export const condEventCanBeAcceptedByChildOf = (childId = MAILBOX_TARGET_MACHINE_ID) =>
  (state: State<any, EventObject, any, any>, event: string) =>
    !!childSnapshotOf(childId)(state).can(event)