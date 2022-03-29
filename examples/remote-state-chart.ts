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
}                           from 'xstate'
import { inspect }          from '@xstate/inspect/lib/server.js'
import { WebSocketServer }  from 'ws'

enum State {
  inactive  = 'pingpong/inactive',
  active    = 'pingpong/active',
}
const states = State

enum Type {
  PING = 'pingpong/PING',
  PONG = 'pingpong/PONG',
}
const types = Type

const events = {
  PING: () => ({ type: types.PING }) as const,
  PONG: () => ({ type: types.PONG }) as const,
} as const
type Events = typeof events
type Event = ReturnType<Events[keyof Events]>

interface Context {}

const PONGER_ID = 'ponger'

/**
 * Testing ping pong machine
 *
 * @link https://github.com/statelyai/xstate/blob/main/packages/xstate-inspect/examples/server.ts
 */
const machine = createMachine<Context, Event>({
  initial: states.inactive,
  invoke: {
    id: PONGER_ID,
    src: () => (send, onReceive) => {
      onReceive((event) => {
        if (event.type === types.PING) {
          send(events.PONG())
        }
      })
    },
  },
  states: {
    [states.inactive]: {
      after: {
        1000: states.active,
      },
    },
    [states.active]: {
      entry: actions.send(events.PING(), {
        delay: 1000,
        to: PONGER_ID,
      }),
      on: {
        [types.PONG]: states.inactive,
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
