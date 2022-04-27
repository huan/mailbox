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
import type { ActorRef, Interpreter }   from 'xstate'

/**
 * Get session id by child id (with currying) from children
 * @param childId child id
 * @param children children
 * @returns session id
 *
 * If the `childId` is a not valid childId, will return `undefined`
 */
export const sessionId: (childId: string) => (children?: Record<string, ActorRef<any, any>>) => undefined | string
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
