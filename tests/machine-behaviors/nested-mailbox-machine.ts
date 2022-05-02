/* eslint-disable sort-keys */
import { createMachine, actions }   from 'xstate'
import { createAction }             from 'typesafe-actions'

import * as Mailbox   from '../../src/mods/mod.js'

enum State {
  Idle = 'nested-mailbox/Idle',
  Busy = 'nested-mailbox/Busy',
}

enum Type {
  NEXT      = 'nested-mailbox/NEXT',
  COMPLETE  = 'nested-mailbox/COMPLETE',
}

const Event = {
  NEXT     : createAction(Type.NEXT)(),
  COMPLETE : createAction(Type.COMPLETE)(),
} as const

export const duckula = Mailbox.duckularize({
  id: 'Nested',
  events: Event,
  states: State,
  initialContext: {},
})

const CHILD_ID = 'Child'
const childMachine = createMachine({
  id: CHILD_ID,
  initial: duckula.State.Idle,
  states: {
    [duckula.State.Idle]: {
      entry: [
        actions.log('states.Idle.entry', CHILD_ID),
        Mailbox.actions.idle(CHILD_ID),
      ],
      on: {
        [duckula.Type.NEXT]: {
          actions: actions.log('states.Idle.on.NEXT', CHILD_ID),
          target: duckula.State.Busy,
        },
      },
    },

    [duckula.State.Busy]: {
      entry: [
        actions.log('states.Busy.entry', CHILD_ID),
        Mailbox.actions.reply(duckula.Event.COMPLETE()),
      ],
      always: duckula.State.Idle,
    },
  },
})

const PARENT_MACHINE_ID = 'Parent'
const parentMachine = createMachine<any, any>({
  id: PARENT_MACHINE_ID,
  initial: duckula.State.Idle,
  states: {
    [duckula.State.Idle]: {
      entry: [
        actions.log('states.Idle.entry', PARENT_MACHINE_ID),
        Mailbox.actions.idle(PARENT_MACHINE_ID),
      ],
      on: {
        [duckula.Type.NEXT]: {
          actions: actions.log('states.Idle.on.NEXT', PARENT_MACHINE_ID),
          target: duckula.State.Busy,
        },
      },
    },

    [duckula.State.Busy]: {
      invoke: {
        id: CHILD_ID,
        src: Mailbox.wrap(childMachine),
      },
      entry: [
        actions.log((_, e) => `states.Busy.entry ${e.type} ${JSON.stringify(e)}`, PARENT_MACHINE_ID),
        actions.send((_, e) => e, { to: CHILD_ID }),
      ],
      on: {
        '*': {
          actions: actions.log((_, e) => `states.Busy.on ${JSON.stringify(e)}`, PARENT_MACHINE_ID),
          target: duckula.State.Idle,
        },
        [Mailbox.Type.ACTOR_REPLY]: {
          actions: [
            actions.log((_, e) => `states.Busy.on.ACTOR_REPLY ${JSON.stringify(e)}`, PARENT_MACHINE_ID),
            actions.send<any, ReturnType<typeof Mailbox.Event.ACTOR_REPLY>>((_, e) => e.payload.message),
          ],
        },
        [duckula.Type.COMPLETE]: {
          actions: [
            actions.log('states.Busy.on.COMPLETE', PARENT_MACHINE_ID),
            Mailbox.actions.reply((_, e) => e),
          ],
          target: duckula.State.Idle,
        },
      },
    },

  },
})

export default parentMachine
