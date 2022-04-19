/* eslint-disable no-redeclare */
/* eslint-disable sort-keys */
import { createAction } from 'typesafe-actions'
import {
  createMachine,
  actions,
}                   from 'xstate'

import * as Mailbox  from '../../src/mods/mod.js'

enum State {
  awake   = 'baby/awake',
  asleep  = 'baby/asleep',
}

enum Type {
  SLEEP = 'baby/SLEEP',
  // asleep
  DREAM = 'baby/DREAM',
  CRY   = 'baby/CRY',
  PEE   = 'baby/PEE',
  // awake
  PLAY = 'baby/PLAY',
  REST = 'baby/REST',
  EAT  = 'baby/EAT',
}

const Event = {
  SLEEP : createAction(Type.SLEEP, (ms: number) => ({ ms }))(),
  // asleep
  DREAM : createAction(Type.DREAM)(),
  CRY   : createAction(Type.CRY)(),
  PEE   : createAction(Type.PEE)(),
  // awake
  PLAY : createAction(Type.PLAY)(),
  REST : createAction(Type.REST)(),
  EAT  : createAction(Type.EAT)(),
} as const

type Context = { ms?: number }

const duckula = Mailbox.duckularize({
  id: 'BabyActor',
  events: Event,
  states: State,
  initialContext: {} as Context,
})

/**
 * (Awake)[PLAY] + [SLEEP] = (Asleep)[REST, EAT]
 * (Asleep)[DREAM][CRY][PEE] = (Awake)
 */
const machine = createMachine<
  ReturnType<typeof duckula.initialContext>,
  ReturnType<typeof duckula.Event[keyof typeof duckula.Event]>,
  any
>({
  id: 'baby',
  initial: duckula.State.awake,
  states: {
    [duckula.State.awake]: {
      entry: [
        actions.log((_, e, { _event }) => `states.awake.entry <- [${e.type}]@${_event.origin}`, duckula.id),
        Mailbox.actions.idle(duckula.id)('awake'),
        Mailbox.actions.reply(Event.PLAY()),
      ],
      exit: [
        actions.log('states.awake.exit', duckula.id),
        /**
         * FIXME: Huan(202112): uncomment the below `sendParent` line
         *  https://github.com/statelyai/xstate/issues/2880
         */
        // actions.sendParent(Event.EAT()),
        Mailbox.actions.reply(Event.EAT()),
      ],
      on: {
        /**
         * Huan(202112):
         *  always send parent a IDLE event if the target machine received a event if it does not care it at all.
         *
         * This behavior is required for mailbox target, and it is very important because
         *  the mailbox need to know whether the target is idle or not
         *    by waiting a IDLE event feedback whenever it has sent an event to the target.
         */
        '*': {
          target: duckula.State.awake,
          actions: [
            actions.log((_, e, { _event }) => `states.awake.on.* <- [${e.type}]@${_event.origin || ''}`, duckula.id),
          ],
        },
        [Type.SLEEP]: {
          target: duckula.State.asleep,
          actions: [
            actions.log((_, e) => `states.awake.on.SLEEP ${JSON.stringify(e)}`, duckula.id),
            Mailbox.actions.reply(Event.REST()),
          ],
        },
      },
    },
    [duckula.State.asleep]: {
      entry: [
        actions.log((_, e) => `states.asleep.entry ${JSON.stringify(e)}`, duckula.id),
        // Huan(202112): move this assign to previous state.on(SLEEP)
        //  FIXME: `(parameter) e: never` (after move to previous state.on.SLEEP)
        actions.assign({ ms: (_, e) => (e as ReturnType<typeof duckula.Event['SLEEP']>).payload.ms }),
        Mailbox.actions.reply(Event.DREAM()),
      ],
      exit: [
        actions.log(_ => 'states.asleep.exit', duckula.id),
        actions.assign({ ms: _ => undefined }),
        Mailbox.actions.reply(Event.PEE()),
      ],
      after: {
        cryMs: {
          actions: Mailbox.actions.reply(Event.CRY()),
        },
        ms: duckula.State.awake,
      },
    },
  },
}, {
  delays: {
    cryMs: ctx => {
      const ms = Math.floor(Number(ctx.ms) / 2)
      console.info('BabyMachine preMs', ms)
      return ms
    },
    ms: ctx => {
      const ms = Number(ctx.ms)
      console.info('BabyMachine ms', ms)
      return ms
    },
  },
})

duckula.machine = machine
export default duckula as Required<typeof duckula>
