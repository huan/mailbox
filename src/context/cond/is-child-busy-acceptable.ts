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

import * as duck    from '../../duck/mod.js'

import { MAILBOX_ACTOR_MACHINE_ID }  from '../../constants.js'

import * as child         from '../child/mod.js'
import * as request       from '../request/mod.js'

import type { Context }   from '../context.js'

/**
 * 1. the child is busy
 */
const isStateBusy = (meta: GuardMeta<Context, AnyEventObject>) => meta.state.value === duck.State.Busy

/**
 * 2. the new message origin is the same as the curent message which is in processing
 */
const isRequestAddress = (ctx: Context, meta: GuardMeta<Context, AnyEventObject>) => !!meta._event.origin && meta._event.origin === request.address(ctx)

/**
 * 3. the new message type can be accepted by the current actor state
 */
const canChildAccept = (event : AnyEventObject, meta: GuardMeta<Context, AnyEventObject>, childId: string) => !!(child.snapshot(childId)(meta.state)?.can(event.type))

/**
 * Check condition of whether an event can be accepted by the child id (with currying)
 *
 * Huan(202204): This check is for user cases like collecting feedbacks in bot5 assistant:
 *  when an actor is in it's Busy state, it might still need to accept new emssages
 *  from same actor who it's working with currently, for multiple times. (accepting new messages)
 *
 * Conditions must be satisfied:
 *  1. the child is busy
 *  2. the new message origin is the same as the curent message which is in processing
 *  3. the new message type can be accepted by the current actor state
 */
export const isChildBusyAcceptable = (childId = MAILBOX_ACTOR_MACHINE_ID) =>
  (
    ctx   : Context,
    event : AnyEventObject,
    meta  : GuardMeta<Context, AnyEventObject>,
  ) => {
    return isStateBusy(meta)
      && isRequestAddress(ctx, meta)
      && canChildAccept(event, meta, childId)
  }
