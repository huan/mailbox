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

/* eslint-disable sort-keys */
import {
  StateMachine,
  EventObject,
  Interpreter,
  interpret,
  InterpreterOptions,
  AnyStateMachine,
  AnyInterpreter,
}                                                   from 'xstate'
import { Subject, Observer, Unsubscribable }   from 'rxjs'

import * as duck            from '../duck/mod.js'
import { isMailboxType }    from '../is/mod.js'
import type { Context }     from '../context/mod.js'

import type { Mailbox, Options }      from '../interface.js'

import type { Address }       from './address-interface.js'
import { getActorMachine }    from './get-actor-machine.js'
import { AddressImpl }        from './address-implementation.js'

/**
 * The Mailbox Class Implementation
 */
export class MailboxImpl<
  TEvent extends EventObject = EventObject,
> implements Mailbox {

  /**
   * Address of the Mailbox
   */
  readonly address: Address
  readonly id: string // string value of address

  /**
   * XState interpreter for Mailbox
   */
  private readonly _interpreter: Interpreter<
    Context,
    any,
    duck.Event[keyof duck.Event] | { type: TEvent['type'] }
  >

  /**
   * Open flag: whether the Mailbox is opened
   */
  private _opened:boolean = false

  /**
   * RxJS Subject for all events
   */
  private _subject: Subject<TEvent> = new Subject()

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
     * Interpreter & Machine for the actor (managed child) machine in Mailbox
     */
    actor: {
      machine      : AnyStateMachine,
      interpreter? : AnyInterpreter,
    },
  }

  constructor (
    /**
     * The wrapped original StateMachine, by the wrap() function for satisfing the Mailbox Queue API
     */
    wrappedMachine: StateMachine<
      Context,
      any,
      duck.Event[keyof duck.Event] | { type: TEvent['type'] },
      any,
      any,
      any,
      any
    >,
    options: Options = {},
  ) {
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
        // return
      } else if (isMailboxType(event.type) && ![
        duck.Type.DEAD_LETTER,
        duck.Type.ACTOR_REPLY,
      ].includes(event.type)) {
        // 2. skip for Mailbox system events except DEAD_LETTER & ACTOR_REPLY
        // return
      } else if (duck.Type.ACTOR_REPLY === event.type) {
        // 3. unwrap Actor Reply message and emit it
        this._subject.next((event as ReturnType<typeof duck.Event.ACTOR_REPLY>).payload.message as TEvent)
      } else {
        // 3. propagate event to the Mailbox Subject
        this._subject.next(event as TEvent)
      }
    })

    this.address = AddressImpl.from(this._interpreter.sessionId)
    this.id = this._interpreter.sessionId

    this.internal = {
      machine: wrappedMachine,
      interpreter: this._interpreter,
      actor: {
        machine: getActorMachine(wrappedMachine),
      },
    }
  }

  /**
   * Mailbox to string should be the sessionId (address id)
   */
  toString () {
    return String(this.address)
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
     * The wrapped machine has only one child machine, which is the original actor machine.
     *
     * Huan(202203): FIXME:
     *  will ` ActorRef<any, any> as AnyInterpreter` be a problem?
     *
     * SO: Get first value from iterator
     *  @link https://stackoverflow.com/questions/32539354/how-to-get-the-first-element-of-set-in-es6-ecmascript-2015#comment79971478_32539929
     */
    this.internal.actor.interpreter = this._interpreter.children
      .values()
      .next()
      .value as AnyInterpreter
  }

  /**
   * Close the Mailbox for disposing it
   */
  close (): void {
    this._interpreter.stop()

    this.internal.actor.interpreter = undefined
    this._opened = false
  }

  /**
   * RxJS Observable
   */
  [Symbol.observable] (): this { return this }
  /**
   * Huan(202205): we have a polyfill for Symbol.observable
   *  but why RxJS still use `@@observable`?
   * FIXME: remove `@@observable`
   */
  ['@@observable'] (): this { return this }

  subscribe (observer: Partial<Observer<EventObject>>): Unsubscribable {
    return this._subject.subscribe(observer)
  }

}
