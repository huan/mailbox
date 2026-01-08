/**
 * Nested Mailbox Machine - XState v5 native
 *
 * Demonstrates nested mailbox pattern where a parent machine
 * invokes a child mailbox and forwards events to it.
 */

import { sendTo, setup } from 'xstate'
import * as Mailbox from '../../src/mods/mod.js'

// ============================================================================
// Types
// ============================================================================

export const State = {
  Idle: 'nested-mailbox/Idle',
  Busy: 'nested-mailbox/Busy',
} as const

export const Type = {
  NEXT: 'nested-mailbox/NEXT',
  COMPLETE: 'nested-mailbox/COMPLETE',
} as const

export const Event = {
  NEXT: () => ({ type: Type.NEXT }) as const,
  COMPLETE: () => ({ type: Type.COMPLETE }) as const,
}

// ============================================================================
// Child Machine
// ============================================================================

const CHILD_ID = 'Child'

export const childMachine = setup({
  types: {} as {
    events: ReturnType<typeof Event.NEXT> | ReturnType<typeof Event.COMPLETE>
  },
}).createMachine({
  id: CHILD_ID,
  initial: State.Idle,
  states: {
    [State.Idle]: {
      entry: Mailbox.actions.idle(CHILD_ID),
      on: {
        [Type.NEXT]: {
          target: State.Busy,
        },
      },
    },
    [State.Busy]: {
      entry: Mailbox.actions.reply(Event.COMPLETE()),
      always: State.Idle,
    },
  },
})

// ============================================================================
// Parent Machine
// ============================================================================

const PARENT_MACHINE_ID = 'Parent'

// Create child mailbox for the parent to invoke
const childMailbox = Mailbox.from(childMachine)

export const parentMachine = setup({
  types: {} as {
    events:
      | ReturnType<typeof Event.NEXT>
      | ReturnType<typeof Event.COMPLETE>
      | ReturnType<typeof Mailbox.Event.ACTOR_REPLY>
  },
  actors: {
    childMailbox: childMachine,
  },
  actions: {
    forwardToChild: sendTo(CHILD_ID, ({ event }) => event),
  },
}).createMachine({
  id: PARENT_MACHINE_ID,
  initial: State.Idle,
  states: {
    [State.Idle]: {
      entry: Mailbox.actions.idle(PARENT_MACHINE_ID),
      on: {
        [Type.NEXT]: {
          target: State.Busy,
        },
      },
    },
    [State.Busy]: {
      invoke: {
        id: CHILD_ID,
        src: 'childMailbox',
      },
      entry: 'forwardToChild',
      on: {
        [Mailbox.Type.ACTOR_REPLY]: {
          actions: sendTo(
            ({ self }) => self,
            ({ event }) =>
              (event as ReturnType<typeof Mailbox.Event.ACTOR_REPLY>).payload.message as any,
          ),
        },
        [Type.COMPLETE]: {
          actions: Mailbox.actions.reply(({ event }) => event),
          target: State.Idle,
        },
      },
    },
  },
})

// ============================================================================
// Export
// ============================================================================

export default {
  id: 'Nested',
  State,
  Type,
  Event,
  childMachine,
  parentMachine,
  childMailbox,
}
