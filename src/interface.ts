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
import 'symbol-observable'

/**
 * Mailbox provides the address for XState Actors:
 *  @see https://xstate.js.org/docs/guides/actors.html#actor-api
 */
import type { EventObject, InterpreterOptions }   from 'xstate'
import type { Subscribable }                      from 'rxjs'

import type { Address }   from './impls/address-interface.js'

export interface Options {
  capacity? : number
  logger?   : InterpreterOptions['logger'],
  devTools? : InterpreterOptions['devTools'],
}

/**
 * The Mailbox Interface
 */
export interface Mailbox<
  TEvent extends EventObject = EventObject,
> extends Subscribable<TEvent> {
  /**
   * XState Actor:
   *  `send()` method will satisfy the XState `isActor()` type guard
   *    @link https://github.com/statelyai/xstate/blob/4cf89b5f9cf645f741164d23e3bc35dd7c5706f6/packages/core/src/utils.ts#L547-L549
   */
  send (event: TEvent | TEvent['type']): void

  address: Address
  id: string  // String value of the address

  open (): void
  close (): void

  /**
   * RxJS: How to Use Interop Observables
   * @link https://ncjamieson.com/how-to-use-interop-observables/
   *
   * @method Symbol.observable
   * @return {Observable} this instance of the observable
   */
  [Symbol.observable](): this
  /**
   * Huan(202205): we have a polyfill for Symbol.observable
   *  but why RxJS still use `@@observable`?
   * FIXME: remove `@@observable`
   */
  ['@@observable'](): this
}
