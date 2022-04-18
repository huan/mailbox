#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test, sinon }              from 'tstest'
import { createMachine, actions, interpret }   from 'xstate'

import * as Mailbox   from '../src/mods/mod.js'

test('Mailbox can make outbound communication when it has lots of queued inbound messages', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const serviceMachine = createMachine<{ count: number }>({
    id: 'service',
    context: {
      count: 0,
    },
    initial: 'idle',
    states: {
      idle: {
        entry: Mailbox.actions.idle('service')('idle'),
        on: {
          DING: 'ding',
          '*': 'idle',
        },
      },
      ding: {
        entry: [
          actions.assign({ count: ctx => ctx.count + 1 }),
        ],
        after: {
          1000: 'dong',
        },
      },
      dong: {
        entry: [
          Mailbox.actions.reply(ctx => ({ type: 'DONG', count: ctx.count })),
        ],
        always: 'idle',
      },
    },
  })

  const serviceMailbox = Mailbox.from(serviceMachine)
  serviceMailbox.open()

  const mainMachine = createMachine<
    { counts: number[] },
    { type: 'DING' } | { type: 'DONG', count: number }
  >({
    id: 'main',
    initial: 'idle',
    context: {
      counts: [],
    },
    states: {
      idle: {
        entry: Mailbox.actions.idle('main')('idle'),
        on: {
          DING: 'ding',
          '*': 'idle',
        },
      },
      ding: {
        entry: [
          serviceMailbox.address.send(({ type: 'DING' })),
        ],
        on: {
          DONG: 'loop',
        },
      },
      loop: {
        entry: [
          actions.assign({ counts: (ctx, e) => [ ...ctx.counts, (e as any).count ] }),
        ],
        always: [
          {
            cond: ctx => ctx.counts.length < 3,
            target: 'ding',
          },
          {
            target: 'dong',
          },
        ],
      },
      dong: {
        entry: [
          Mailbox.actions.reply(ctx => ({ type: 'DONG', counts: ctx.counts })),
        ],
      },
    },
  })

  const mailbox = Mailbox.from(mainMachine)
  mailbox.open()

  const consumerMachine = createMachine<{ type: 'DONG', counts: number[] }>({
    id: 'consumer',
    initial: 'start',
    states: {
      start: {
        entry: [
          mailbox.address.send(({ type: 'DING' })),
        ],
        on: {
          DONG: 'dong',
        },
      },
      dong: {
        type: 'final',
        data: (_, e) => e['log'],
      },
    },
  })

  const eventList: any[] = []

  const interpreter = interpret(consumerMachine)
    .onEvent(e => eventList.push(e))
    .start()

  interpreter.send({ type: 'DING' })

  await sandbox.clock.runAllAsync()
  // eventList.forEach(e => console.info(e))

  t.same(eventList, [
    { type: 'xstate.init' },
    { type: 'DING' },
    { type: 'DONG', counts: [ 1, 2, 3 ] },
  ], 'should get events from all DING events')

  // console.info('Service address', (serviceMailbox as Mailbox.impls.Mailbox).internal.target.interpreter?.sessionId, '<' + String(serviceMailbox.address) + '>')
  // console.info('Main address', (mailbox as Mailbox.impls.Mailbox).internal.target.interpreter?.sessionId, '<' + String(mailbox.address) + '>')
  // console.info('Consumer address', interpreter.sessionId)

  mailbox.close()
  sandbox.restore()
})
