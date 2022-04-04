import type { StateMachine } from 'xstate'

interface StringMap {
  [key: string]: string
}

interface FunctionMap {
  [key: string]: Function
}

type Factory = (...args: any[]) => StateMachine<any, any, any>

/**
 * Huan(202204): under construction
 * TODO: design and use it
 */

/**
 * The Interface for a State Machine module
 *  so that it can be easily imported and used by Mailbox
 */
export interface ActorDuck {
  types   : StringMap
  states  : StringMap
  events  : FunctionMap
  factory : Factory
}
