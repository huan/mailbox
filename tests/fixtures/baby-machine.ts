/* eslint-disable sort-keys */
import {
  createMachine,
  actions,
}                   from 'xstate'

import * as Mailbox  from '../../src/mods/mod.js'

enum State {
  awake   = 'baby/awake',
  asleep  = 'baby/asleep',
}
const states = State

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
const types = Type

const events = {
  SLEEP : (ms: number)  => ({ type: types.SLEEP, ms }),
  // asleep
  DREAM : ()  => ({ type: types.DREAM }),
  CRY   : ()  => ({ type: types.CRY   }),
  PEE   : ()  => ({ type: types.PEE   }),
  // awake
  PLAY : () => ({ type: types.PLAY  }),
  REST : () => ({ type: types.REST  }),
  EAT  : () => ({ type: types.EAT   }),
}

type Events = typeof events
type Event   = ReturnType<typeof events.SLEEP>

type Context = { ms?: number }

const MACHINE_NAME = 'BabyMachine'

/**
 * AWAKE
 *  - PLAY
 *  - EAT, REST <- SLEEP
 *  -
 * ASLEEP
 *  - DREAM
 *  - CRY
 *  - PEE
 */
const machine = createMachine<Context, Event, any>({
  context: {},
  id: 'baby',
  initial: states.awake,
  states: {
    [states.awake]: {
      entry: [
        actions.log((_, e, { _event }) => `states.awake.entry <- [${e.type}]@${_event.origin}`, MACHINE_NAME),
        Mailbox.actions.idle(MACHINE_NAME)('awake'),
        Mailbox.actions.reply(events.PLAY()),
      ],
      exit: [
        actions.log('states.awake.exit', MACHINE_NAME),
        /**
         * FIXME: Huan(202112): uncomment the below `sendParent` line
         *  https://github.com/statelyai/xstate/issues/2880
         */
        // actions.sendParent(events.EAT()),
        Mailbox.actions.reply(events.EAT()),
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
          target: states.awake,
          actions: [
            actions.log((_, e, { _event }) => `states.awake.on.* <- [${e.type}]@${_event.origin || ''}`, MACHINE_NAME),
          ],
        },
        [types.SLEEP]: {
          target: states.asleep,
          actions: [
            actions.log((_, e) => `states.awake.on.SLEEP ${JSON.stringify(e)}`, MACHINE_NAME),
            Mailbox.actions.reply(events.REST()),
          ],
        },
      },
    },
    [states.asleep]: {
      entry: [
        actions.log((_, e) => `states.asleep.entry ${JSON.stringify(e)}`, MACHINE_NAME),
        // Huan(202112): move this assign to previous state.on(SLEEP)
        //  FIXME: `(parameter) e: never` (after move to previous state.on.SLEEP)
        actions.assign({ ms: (_, e) => e.ms }),
        Mailbox.actions.reply(events.DREAM()),
      ],
      exit: [
        actions.log(_ => 'states.asleep.exit', MACHINE_NAME),
        actions.assign({ ms: _ => undefined }),
        Mailbox.actions.reply(events.PEE()),
      ],
      after: {
        cryMs: {
          actions: Mailbox.actions.reply(events.CRY()),
        },
        ms: states.awake,
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

export {
  type Context,
  type State,
  type Type,
  type Event,
  type Events,
  events,
  machine,
  states,
  types,
}
