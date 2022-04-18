/* eslint-disable sort-keys */
import { createAction } from 'typesafe-actions'
import { createMachine, actions }   from 'xstate'

import * as Mailbox from '../../src/mods/mod.js'

enum State {
  idle = 'ding-dong/idle',
  busy = 'ding-dong/busy',
}

enum Type {
  DING = 'ding-dong/DING',
  DONG = 'ding-dong/DONG',
}

const events = {
  DING : createAction(Type.DING, (i: number) => ({ i }))(),
  DONG : createAction(Type.DONG, (i: number) => ({ i }))(),
}

interface Context {
  i: number,
}

const duckula = Mailbox.duckularize({
  id: 'DingDongActor',
  events,
  states: State,
  initialContext: { i: 0 } as Context,
})

const MAX_DELAY_MS = 10

const machine = createMachine<
  ReturnType<typeof duckula.initialContext>,
  ReturnType<typeof duckula.Event[keyof typeof duckula.Event]>
>({
  id: 'ding-dong',
  initial: duckula.State.idle,
  context: {
    i: -1,
  },
  states: {
    [duckula.State.idle]: {
      entry: [
        Mailbox.actions.idle('DingDongMachine')('idle'),
      ],
      on: {
        '*': duckula.State.idle,
        [duckula.Type.DING]: {
          target: duckula.State.busy,
          actions: actions.assign({
            i: (_, e) => e.payload.i,
          }),
        },
      },
    },
    [duckula.State.busy]: {
      after: {
        randomMs: {
          actions: [
            Mailbox.actions.reply(ctx => events.DONG(ctx.i)),
          ],
          target: duckula.State.idle,
        },
      },
    },
  },
}, {
  delays: {
    randomMs: _ => Math.floor(Math.random() * MAX_DELAY_MS),
  },
})

duckula.machine = machine
export default duckula as Required<typeof duckula>
