/* eslint-disable sort-keys */
import { createAction }             from 'typesafe-actions'
import { createMachine, actions }   from 'xstate'

import * as Mailbox from '../../src/mods/mod.js'

enum State {
  idle = 'idle',
  busy = 'busy',
}

enum Type {
  MAKE_ME_COFFEE = 'MAKE_ME_COFFEE',
  COFFEE         = 'COFFEE',
}

const Event = {
  MAKE_ME_COFFEE : createAction(Type.MAKE_ME_COFFEE,  (customer: string) => ({ customer }))(),
  COFFEE         : createAction(Type.COFFEE,          (customer: string) => ({ customer }))(),
}

interface Context {
  customer?: string,
}

const duckula = Mailbox.duckularize({
  id: 'CoffeeMakerActor',
  events: Event,
  states: State,
  initialContext: {} as Context,
})

export const DELAY_MS = 10

const machine = createMachine<
  ReturnType<typeof duckula.initialContext>,
  ReturnType<typeof Event[keyof typeof Event]>
>({
  initial: duckula.State.idle,
  states: {
    [duckula.State.idle]: {
      entry: Mailbox.actions.idle('CoffeeMaker')('idle'),
      on: {
        [duckula.Type.MAKE_ME_COFFEE]: {
          target: duckula.State.busy,
          actions: actions.assign((_, e) => ({ customer: e.payload.customer })),
        },
        '*': duckula.State.idle,
      },
    },
    [duckula.State.busy]: {
      entry: [
        actions.send(ctx => duckula.Event.COFFEE(ctx.customer!), {
          delay: DELAY_MS,
        }),
      ],
      on: {
        [duckula.Type.COFFEE]: {
          actions: Mailbox.actions.reply((_, e) => e),
          target: duckula.State.idle,
        },
      },
      exit: actions.assign({ customer: _ => undefined }),
    },
  },
})

duckula.machine = machine
export default duckula as Required<typeof duckula>
