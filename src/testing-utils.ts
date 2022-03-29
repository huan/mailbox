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
/* eslint-disable no-redeclare */
interface DebugPayload {
  debug?: string
}

function stripPayloadDebug (event: Object): Object
function stripPayloadDebug (eventList: Object[]): Object[]

function stripPayloadDebug (
  event: Object | Object[],
): Object | Object[] {
  if (Array.isArray(event)) {
    return event.map(e => stripPayloadDebug(e))
  }

  if ('payload' in event && 'debug' in event['payload']) {
    (event['payload'] as any).debug = undefined
  }

  return event
}

export {
  stripPayloadDebug,
}
