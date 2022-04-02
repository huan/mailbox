/* eslint-disable sort-keys */
import { createMachine, actions }   from 'xstate'

import * as Mailbox from '../../src/mods/mod.js'

enum State {
  idle = 'ding-dong/idle',
  busy = 'ding-dong/busy',
}
const states = State

enum Type {
  DING = 'ding-dong/DING',
  DONG = 'ding-dong/DONG',
}
const types = Type

const events = {
  DING : (i: number) => ({ type: types.DING, i }) as const,
  DONG : (i: number) => ({ type: types.DONG, i }) as const,
} as const

type Events = typeof events
type Event = ReturnType<Events[keyof Events]>

interface Context {
  i: number,
}

const MAX_DELAY_MS = 10

const machine = createMachine<Context, Event>({
  id: 'ding-dong',
  initial: states.idle,
  context: {
    i: -1,
  },
  states: {
    [states.idle]: {
      entry: [
        Mailbox.actions.idle('DingDongMachine')('idle'),
      ],
      on: {
        '*': states.idle,
        [types.DING]: {
          target: states.busy,
          actions: actions.assign({
            i: (_, e) => e.i,
          }),
        },
      },
    },
    [states.busy]: {
      after: {
        randomMs: {
          actions: [
            Mailbox.actions.reply(ctx => events.DONG(ctx.i)),
          ],
          target: states.idle,
        },
      },
    },
  },
}, {
  delays: {
    randomMs: _ => Math.floor(Math.random() * MAX_DELAY_MS),
  },
})

export {
  events,
  machine,
  MAX_DELAY_MS,
  states,
  type Event,
  type Events,
  type State,
  type Type,
  types,
}
