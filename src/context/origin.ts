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
import type { AnyEventObject, SCXML }   from 'xstate'

export const metaSymKey = Symbol('meta')

/**
 *
 * Huan(202112): The Actor Model here need to be improved.
 *  @see https://github.com/wechaty/bot5-assistant/issues/4
 *
 */
interface AnyEventObjectMeta {
  [metaSymKey]: {
    origin: SCXML.Event<AnyEventObject>['origin']
  }
}

export type AnyEventObjectExt = AnyEventObject & AnyEventObjectMeta

/**
 * Get the `origin` (session id of the xstate machine) from the event's `metaSymKey`
 *  we use it as the `address` of the Mailbox.
 */
export const metaOrigin = (event?: null | AnyEventObjectExt) => (event && event[metaSymKey].origin) || ''

/**
* Wrap an event by adding `metaSymKey` to the event with value `origin` to store the session id of the xstate machine
*/
export const wrapEvent = (event: AnyEventObject, origin?: string) => {
  const wrappedEvent = ({
    ...event,
    [metaSymKey]: {
      origin,
    },
  })
  // console.info(`wrapEvent: ${wrappedEvent.type}@${metaOrigin(wrappedEvent)}`)
  return wrappedEvent
}

/**
* Remove the `metaSymKey` from a wrapped event
*/
export const unwrapEvent = (e: AnyEventObjectExt): AnyEventObject => {
  const wrappedEvent = {
    ...e,
  }
  // console.info(`unwrapEvent: ${wrappedEvent.type}@${metaOrigin(wrappedEvent)}`)

  delete (wrappedEvent as any)[metaSymKey]
  return wrappedEvent
}
