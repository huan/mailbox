/**
 * Baby Machine - XState v5 native
 *
 * A complex state machine demonstrating the Mailbox pattern with
 * multiple states, delays, and reply actions.
 */

import { setup, assign } from 'xstate'
import * as Mailbox from '../../src/mods/mod.js'

// ============================================================================
// Types
// ============================================================================

export const State = {
  awake: 'baby/awake',
  asleep: 'baby/asleep',
} as const

export const Type = {
  SLEEP: 'baby/SLEEP',
  DREAM: 'baby/DREAM',
  CRY: 'baby/CRY',
  PEE: 'baby/PEE',
  PLAY: 'baby/PLAY',
  REST: 'baby/REST',
  EAT: 'baby/EAT',
} as const

export const Event = {
  SLEEP: (ms: number) => ({ type: Type.SLEEP, payload: { ms } }) as const,
  DREAM: () => ({ type: Type.DREAM }) as const,
  CRY: () => ({ type: Type.CRY }) as const,
  PEE: () => ({ type: Type.PEE }) as const,
  PLAY: () => ({ type: Type.PLAY }) as const,
  REST: () => ({ type: Type.REST }) as const,
  EAT: () => ({ type: Type.EAT }) as const,
}

export interface Context {
  ms?: number
}

export const initialContext = (): Context => ({})

// ============================================================================
// Machine
// ============================================================================

/**
 * Baby state machine behavior:
 * - (Awake) receives SLEEP(ms) -> transitions to (Asleep)
 * - (Asleep) after ms/2 -> CRY, after ms -> wake up
 * - Emits various events on entry/exit of states
 */
export const machine = setup({
  types: {} as {
    context: Context
    events:
      | ReturnType<typeof Event.SLEEP>
      | ReturnType<typeof Event.DREAM>
      | ReturnType<typeof Event.CRY>
      | ReturnType<typeof Event.PEE>
      | ReturnType<typeof Event.PLAY>
      | ReturnType<typeof Event.REST>
      | ReturnType<typeof Event.EAT>
  },
  actions: {
    assignMs: assign({
      ms: ({ event }) => {
        if (event.type === Type.SLEEP) {
          return (event as ReturnType<typeof Event.SLEEP>).payload.ms
        }
        return undefined
      },
    }),
    clearMs: assign({
      ms: () => undefined,
    }),
  },
  delays: {
    cryMs: ({ context }) => Math.floor(Number(context.ms) / 2),
    ms: ({ context }) => Number(context.ms),
  },
}).createMachine({
  id: 'Baby',
  initial: State.awake,
  context: initialContext(),
  states: {
    [State.awake]: {
      entry: [
        Mailbox.actions.idle('Baby'),
        Mailbox.actions.reply(Event.PLAY()),
      ],
      exit: [
        Mailbox.actions.reply(Event.EAT()),
      ],
      on: {
        '*': {
          target: State.awake,
        },
        [Type.SLEEP]: {
          target: State.asleep,
          actions: [
            Mailbox.actions.reply(Event.REST()),
          ],
        },
      },
    },
    [State.asleep]: {
      entry: [
        { type: 'assignMs' },
        Mailbox.actions.reply(Event.DREAM()),
      ],
      exit: [
        { type: 'clearMs' },
        Mailbox.actions.reply(Event.PEE()),
      ],
      after: {
        cryMs: {
          actions: Mailbox.actions.reply(Event.CRY()),
        },
        ms: State.awake,
      },
    },
  },
})

// ============================================================================
// Export all as default for compatibility
// ============================================================================

export default {
  id: 'Baby',
  State,
  Type,
  Event,
  initialContext,
  machine,
}
