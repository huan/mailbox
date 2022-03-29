/* eslint-disable sort-keys */
import {
  createMachine,
  actions,
}                   from 'xstate'

import * as Mailbox from '../../src/mods/mod.js'

enum State {
  idle = 'idle',
  busy = 'busy',
}
const states = State

enum Type {
  MAKE_ME_COFFEE = 'MAKE_ME_COFFEE',
  COFFEE         = 'COFFEE',
}
const types = Type

const events = {
  MAKE_ME_COFFEE : (customer: string) => ({ type: types.MAKE_ME_COFFEE, customer }) as const,
  COFFEE         : (customer: string) => ({ type: types.COFFEE, customer })         as const,
} as const

type Events = typeof events
type Event = ReturnType<Events[keyof Events]>

interface Context {
  customer?: string,
}

const DELAY_MS = 10

const machine = createMachine<Context, Event>({
  context: {
    customer: undefined,
  },
  initial: states.idle,
  states: {
    [states.idle]: {
      entry: Mailbox.actions.idle('CoffeeMaker')('idle'),
      on: {
        [types.MAKE_ME_COFFEE]: {
          target: states.busy,
          actions: actions.assign((_, e) => ({ customer: e.customer })),
        },
        '*': states.idle,
      },
    },
    [states.busy]: {
      entry: [
        actions.send(ctx => events.COFFEE(ctx.customer!), {
          delay: DELAY_MS,
        }),
      ],
      on: {
        [types.COFFEE]: {
          actions: Mailbox.actions.reply((_, e) => e),
          target: states.idle,
        },
      },
      exit: actions.assign({ customer: _ => undefined }),
    },
  },
})

export {
  type Type,
  type State,
  type Event,
  type Events,
  machine,
  types,
  states,
  events,
  DELAY_MS,
}
