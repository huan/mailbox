/**
 * Coffee Maker Machine - XState v5 native
 *
 * Simulates a coffee machine that processes orders one at a time.
 * Demonstrates the Mailbox pattern with async processing.
 */

import { assign, sendTo, setup } from 'xstate'
import * as Mailbox from '../../src/mods/mod.js'

// ============================================================================
// Types
// ============================================================================

export const State = {
  idle: 'idle',
  busy: 'busy',
} as const

export const Type = {
  MAKE_ME_COFFEE: 'MAKE_ME_COFFEE',
  COFFEE: 'COFFEE',
} as const

export const Event = {
  MAKE_ME_COFFEE: (customer: string) =>
    ({
      type: Type.MAKE_ME_COFFEE,
      payload: { customer },
    }) as const,
  COFFEE: (customer: string) =>
    ({
      type: Type.COFFEE,
      payload: { customer },
    }) as const,
}

export interface Context {
  customer?: string
}

export const initialContext = (): Context => ({})

// ============================================================================
// Machine
// ============================================================================

export const DELAY_MS = 10

export const machine = setup({
  types: {} as {
    context: Context
    events: ReturnType<typeof Event.MAKE_ME_COFFEE> | ReturnType<typeof Event.COFFEE>
  },
  actions: {
    assignCustomer: assign({
      customer: ({ event }) => {
        if (event.type === Type.MAKE_ME_COFFEE) {
          return event.payload.customer
        }
        return undefined
      },
    }),
    clearCustomer: assign({
      customer: () => undefined,
    }),
    sendCoffee: sendTo(
      ({ self }) => self,
      ({ context }) => Event.COFFEE(context.customer!),
      { delay: DELAY_MS },
    ),
  },
}).createMachine({
  id: 'CoffeeMaker',
  initial: State.idle,
  context: initialContext(),
  states: {
    [State.idle]: {
      entry: Mailbox.actions.idle('CoffeeMaker'),
      on: {
        [Type.MAKE_ME_COFFEE]: {
          target: State.busy,
          actions: 'assignCustomer',
        },
        '*': {
          target: State.idle,
        },
      },
    },
    [State.busy]: {
      entry: 'sendCoffee',
      on: {
        [Type.COFFEE]: {
          actions: Mailbox.actions.reply(({ event }) => event),
          target: State.idle,
        },
      },
      exit: 'clearCustomer',
    },
  },
})

// ============================================================================
// Export all as default for compatibility
// ============================================================================

export default {
  id: 'CoffeeMaker',
  State,
  Type,
  Event,
  initialContext,
  machine,
}
