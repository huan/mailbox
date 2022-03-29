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
}                           from 'xstate'
import EventEmitter         from 'events'
import type { Disposable }  from 'typed-inject'

import * as duck  from './duck/mod.js'

import { isMailboxType }                        from './is-mailbox-type.js'
import type * as contexts                       from './contexts.js'
import type { Event }                           from './duck/event-type.js'
import { Options, MAILBOX_TARGET_MACHINE_ID }   from './options.js'
import { AddressImpl, type Address }            from './address.js'

/**
 * The Mailbox Interface
 */
interface Interface<
  TEvent extends EventObject = EventObject,
> {
  address: Address
  on (name: 'event', listener: (event: TEvent) => void): void
  acquire (): void
  dispose (): void
  send (event: TEvent | TEvent['type']): void
}

/**
 * The Mailbox Class Implementation
 */
class MailboxImpl<
  TContext extends {} = {},
  TEvent extends EventObject = EventObject,
>
  extends EventEmitter
  implements
    Interface,
    Disposable {

  /**
   * XState interpreter
   */
  protected readonly _interpreter: Interpreter<
    contexts.Context,
    any,
    Event | { type: TEvent['type'] }
  >

  /**
   * Address of the Mailbox
   */
  readonly address: Address

  /**
   * Debug only
   */
  readonly debug: {
    interpreter? : Interpreter<any,  any>,
    machine      : StateMachine<any, any,  any>,

    target: {
      interpreter? : Interpreter<any,  any>,
      machine      : StateMachine<any, any,  any>,
    },
  }

  constructor (
    protected readonly _targetMachine: StateMachine<
      TContext,
      any,
      TEvent
    >,
    protected readonly _wrappedMachine: StateMachine<
      contexts.Context,
      any,
      Event | { type: TEvent['type'] },
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

    this._interpreter = interpret(this._wrappedMachine, interpretOptions)
    this.address      = AddressImpl.from(this._interpreter.sessionId)

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

    this.debug = {
      machine: this._wrappedMachine,
      target: {
        machine: this._targetMachine,
      },
    }
  }

  /**
   * Send EVENT to the Mailbox Address
   */
  send (event: TEvent | TEvent['type']): void {
    this._interpreter.send(event)
  }

  acquire (): void {
    this._interpreter.start()

    this.debug.interpreter        = this._interpreter
    this.debug.target.interpreter = this._interpreter
      .children.get(MAILBOX_TARGET_MACHINE_ID) as Interpreter<any>
  }

  dispose (): void {
    this._interpreter.stop()

    this.debug.interpreter        = undefined
    this.debug.target.interpreter = undefined
  }

}

export {
  type Interface,
  MailboxImpl,
}
