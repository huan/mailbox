/**
 * DingDong Machine - XState v5 native
 *
 * Responds to DING events with DONG after a random delay.
 * Demonstrates the Mailbox pattern for sequential message processing.
 */

// Standard ESM imports from XState v5
import { assign, createMachine } from 'xstate'

// Import Mailbox
import * as Mailbox from '../../src/mailbox.js'

// ============================================================================
// Types
// ============================================================================

export const State = {
  idle: 'ding-dong/idle',
  busy: 'ding-dong/busy',
} as const

export const Type = {
  DING: 'ding-dong/DING',
  DONG: 'ding-dong/DONG',
} as const

export const Event = {
  DING: (i: number) => ({ type: Type.DING, payload: { i } }) as const,
  DONG: (i: number) => ({ type: Type.DONG, payload: { i } }) as const,
}

export interface Context {
  i: number
}

export const initialContext = (): Context => ({ i: -1 })

// ============================================================================
// Machine
// ============================================================================

const MAX_DELAY_MS = 10

export const machine = createMachine(
  {
    id: 'DingDong',
    initial: State.idle,
    context: initialContext(),
    states: {
      [State.idle]: {
        entry: [Mailbox.actions.idle('DingDongMachine')],
        on: {
          '*': State.idle,
          [Type.DING]: {
            target: State.busy,
            actions: assign({
              i: ({ event }: any) => event.payload.i,
            }),
          },
        },
      },
      [State.busy]: {
        after: {
          randomMs: {
            actions: [Mailbox.actions.reply((ctx: Context) => Event.DONG(ctx.i))],
            target: State.idle,
          },
        },
      },
    },
  },
  {
    delays: {
      randomMs: () => Math.floor(Math.random() * MAX_DELAY_MS),
    },
  },
)

// ============================================================================
// Export all as default for compatibility with existing test patterns
// ============================================================================

export default {
  id: 'DingDong',
  State,
  Type,
  Event,
  initialContext,
  machine,
}
