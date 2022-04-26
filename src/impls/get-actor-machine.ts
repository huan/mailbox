/**
 *   Mailbox - https://github.com/huan/mailbox
 *    author: Huan LI (李卓桓) <zixia@zixia.net>
 *    Dec 2021
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
 */
/**
 * Mailbox provides the address for XState Actors:
 *  @see https://xstate.js.org/docs/guides/actors.html#actor-api
 */

import type { AnyStateMachine }    from 'xstate'

import { MAILBOX_ACTOR_MACHINE_ID }    from './constants.js'

export const getTargetMachine = (wrappedMachine: AnyStateMachine) => {
  const services = wrappedMachine.options.services
  if (!services) {
    throw new Error('no services provided in the wrappedMachine!')
  }

  const childMachine = services[MAILBOX_ACTOR_MACHINE_ID]
  if (!childMachine) {
    throw new Error('no child machine found in wrappedMachine!')
  }

  return childMachine as AnyStateMachine
}
