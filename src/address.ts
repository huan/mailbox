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
import {
  EventObject,
  actions,
  AnyEventObject,
  Event,
  SendExpr,
  SendActionOptions,
  SendAction,
  GuardMeta,
}                       from 'xstate'

/**
 * Mailbox Address Interface
 *
 * @interface Address
 *
 * All methods in this interface should be as the same interface of the `actions` in `xstate`
 *  so that they will be compatible with `xstate`
 */
interface Address {
  send<TContext, TEvent extends EventObject, TSentEvent extends EventObject = AnyEventObject> (
    event: Event<TSentEvent> | SendExpr<TContext, TEvent, TSentEvent>,
    options?: SendActionOptions<TContext, TEvent>
  ): SendAction<TContext, TEvent, TSentEvent>

  condNotOrigin: () => <TContext, TEvent extends EventObject> (
    _context: TContext,
    _event: TEvent,
    meta: GuardMeta<TContext, TEvent>,
  ) => boolean
}

class AddressImpl implements Address {

  static from (address: string): Address {
    return new AddressImpl(address)
  }

  protected constructor (
    protected _address: string,
  ) {
  }

  toString () {
    return this._address
  }

  /**
   * The same API with XState `actions.send` method, but only for the current binding address.
   */
  send<TContext, TEvent extends EventObject, TSentEvent extends EventObject = AnyEventObject> (
    event    : Event<TSentEvent> | SendExpr<TContext, TEvent,  TSentEvent>,
    options? : SendActionOptions<TContext,            TEvent>,
  ): SendAction<TContext, TEvent, TSentEvent> {
    /**
     * Huan(202201): Issue #11 - Race condition: Mailbox think the target machine is busy when it's not
     * @link https://github.com/wechaty/bot5-assistant/issues/11
     *
     * add a `delay:0` when sending events to put the send action to the v8 event loop next tick
     */
    return actions.send(event, {
      delay: 0,
      ...options,
      to: this._address,
    })
  }

  /**
   * Return true if the `_event.origin` is not the same and the Address
   */
  condNotOrigin () {
    return <TContext, TEvent extends EventObject> (
      _context: TContext,
      _event: TEvent,
      meta: GuardMeta<TContext, TEvent>,
    ) => meta._event.origin !== this._address
  }

}

export {
  type Address,
  AddressImpl,
}
