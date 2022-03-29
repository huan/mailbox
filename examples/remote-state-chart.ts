#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

/**
 * Huan(202201):
 *
 * Issue #10: Remote inspecting XState with State Chart for our Actors
 *  @link https://github.com/wechaty/bot5-assistant/issues/10
 *
 * Usage:
 *  1. run this file
 *  2. open `https://statecharts.io/inspect?server=localhost:8888`
 *
 * Note: must be localhost because of the `ws` protoco in this demo program is not TLS
 */

import {
  createMachine,
  actions,
  interpret,
}                   from 'xstate'
import { inspect } from '@xstate/inspect/lib/server.js'
import { WebSocketServer } from 'ws'

enum States {
  inactive = 'pingpong/inactive',
  active = 'pingpong/active',
}

enum Types {
  PING = 'pingpong/PING',
  PONG = 'pingpong/PONG',
}

const Events = {
  PING: () => ({ type: Types.PING }) as const,
  PONG: () => ({ type: Types.PONG }) as const,
} as const

interface Context {}

type Event = ReturnType<typeof Events[keyof typeof Events]>

const PONGER_ID = 'ponger'

/**
 * Testing ping pong machine
 *
 * @link https://github.com/statelyai/xstate/blob/main/packages/xstate-inspect/examples/server.ts
 */
const machine = createMachine<Context, Event>({
  initial: States.inactive,
  invoke: {
    id: PONGER_ID,
    src: () => (send, onReceive) => {
      onReceive((event) => {
        if (event.type === Types.PING) {
          send(Events.PONG())
        }
      })
    },
  },
  states: {
    [States.inactive]: {
      after: {
        1000: States.active,
      },
    },
    [States.active]: {
      entry: actions.send(Events.PING(), {
        delay: 1000,
        to: PONGER_ID,
      }),
      on: {
        [Types.PONG]: States.inactive,
      },
    },
  },
})

const server = new WebSocketServer({
  port: 8888,
})

inspect({ server })

const interpreter = interpret(machine, { devTools: true })

interpreter.start()
