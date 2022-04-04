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

/* eslint-disable sort-keys */
import {
  StateMachine,
  EventObject,
  Interpreter,
  interpret,
  InterpreterOptions,
  AnyStateMachine,
  AnyInterpreter,
}                           from 'xstate'
import EventEmitter         from 'events'

import * as duck  from './duck/mod.js'

import { isMailboxType }              from './is-mailbox-type.js'
import type * as contexts             from './contexts.js'
import type { Event }                 from './duck/event-type.js'
import { AddressImpl, type Address }  from './address.js'
import { MAILBOX_TARGET_MACHINE_ID }  from './constants.js'
import { getTargetMachine }           from './wrap.js'
import type { IMailbox, Options }     from './mailbox-interface.js'

/**
 * The Mailbox Class Implementation
 */
export class MailboxImpl<
  TEvent extends EventObject = EventObject,
> extends EventEmitter implements IMailbox {

  /**
   * Address of the Mailbox
   */
  readonly address: Address
  readonly id: string // string value of address

  /**
   * XState interpreter for Mailbox
   */
  private readonly _interpreter: Interpreter<
    contexts.Context,
    any,
    Event | { type: TEvent['type'] }
  >

  /**
   * Open flag: whether the Mailbox is opened
   */
  private _opened:boolean = false

  /**
   * @private This is not a public API
   *  It's only for private usage
   *  and may be changed or removed without prior notice.
   */
  readonly internal: {
    /**
     * Mailbox machine & interpreter (wrapped the original StateMachine)
     */
    machine     : AnyStateMachine,
    interpreter : AnyInterpreter,
    /**
     * Interpreter & Machine for the target (managed child) machine in Mailbox
     */
    target: {
      machine      : AnyStateMachine,
      interpreter? : AnyInterpreter,
    },
  }

  constructor (
    /**
     * The wrapped original StateMachine, by the wrap() function for satisfing the Mailbox Queue API
     */
    wrappedMachine: StateMachine<
      contexts.Context,
      any,
      Event | { type: TEvent['type'] },
      any,
      any,
      any,
      any
    >,
    options: Options = {},
  ) {
    super()
    // console.info('MailboxOptions', options)

    const interpretOptions: Partial<InterpreterOptions> = {
      devTools: options.devTools,
    }
    if (typeof options.logger === 'function') {
      // If the `logger` key has been set, then the value must be function
      // The interpret function can not accept a { logger: undefined } option
      interpretOptions.logger = options.logger
    }

    this._interpreter = interpret(wrappedMachine, interpretOptions)
    this._interpreter.onEvent(event => {
      if (/^xstate\./i.test(event.type)) {
        // 1. skip for XState system events
        return
      } else if (isMailboxType(event.type) && event.type !== duck.types.DEAD_LETTER) {
        // 2. skip for Mailbox system events
        return
      }
      // 3. propagate event to the Mailbox
      this.emit('event', event)
    })

    this.address = AddressImpl.from(this._interpreter.sessionId)
    this.id = this._interpreter.sessionId

    this.internal = {
      machine: wrappedMachine,
      interpreter: this._interpreter,
      target: {
        machine: getTargetMachine(wrappedMachine),
      },
    }
  }

  override toString () {
    return `Mailbox<${this.id}>`
  }

  /**
   * Send EVENT to the Mailbox Address
   */
  send (event: TEvent | TEvent['type']): void {
    if (!this._opened) {
      this.open()
    }
    this._interpreter.send(event)
  }

  /**
   * Open the Mailbox for kick it started
   *  The mailbox will be opened automatically when the first event is sent.
   */
  open (): void {
    if (this._opened) {
      return
    }

    this._interpreter.start()
    this._opened = true

    /**
     * Huan(202203): FIXME:
     *  will ` ActorRef<any, any> as AnyInterpreter` be a problem?
     */
    this.internal.target.interpreter = this._interpreter.children
      .get(MAILBOX_TARGET_MACHINE_ID) as AnyInterpreter
  }

  /**
   * Close the Mailbox for disposing it
   */
  close (): void {
    this._interpreter.stop()

    this.internal.target.interpreter = undefined
    this._opened = false
  }

}
