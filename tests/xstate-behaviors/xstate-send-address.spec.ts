#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * XState v5 Behavior: Inter-Actor Communication
 *
 * Tests how actors can communicate with each other in XState v5.
 * Uses the actor system and sendTo action for addressing.
 */
/* eslint-disable sort-keys */

import { test } from '#test-helpers'

// Standard ESM imports from XState v5
import { setup, createActor, sendTo, sendParent } from 'xstate'

test('XState v5: child can send events to parent via sendParent', async t => {
  const receivedEvents: any[] = []

  const childMachine = setup({
    actions: {
      notifyParent: sendParent({ type: 'CHILD_READY' }),
    },
  }).createMachine({
    id: 'Child',
    initial: 'starting',
    states: {
      starting: {
        entry: 'notifyParent',
        on: {
          PING: {
            actions: sendParent({ type: 'PONG' }),
          },
        },
      },
    },
  })

  const parentMachine = setup({
    types: {} as {
      events: { type: 'CHILD_READY' } | { type: 'PONG' } | { type: 'PING_CHILD' }
    },
    actors: {
      child: childMachine,
    },
    actions: {
      recordEvent: ({ event }: any) => {
        receivedEvents.push(event)
      },
      pingChild: sendTo('myChild', { type: 'PING' }),
    },
  }).createMachine({
    id: 'Parent',
    initial: 'running',
    invoke: {
      id: 'myChild',
      src: 'child',
    },
    states: {
      running: {
        on: {
          CHILD_READY: {
            actions: 'recordEvent',
          },
          PONG: {
            actions: 'recordEvent',
          },
          PING_CHILD: {
            actions: 'pingChild',
          },
        },
      },
    },
  })

  const actor = createActor(parentMachine)
  actor.start()

  // Wait for child to send CHILD_READY
  await new Promise(r => setTimeout(r, 10))

  t.ok(
    receivedEvents.some(e => e.type === 'CHILD_READY'),
    'parent should receive CHILD_READY from child'
  )

  // Parent sends PING to child, child responds with PONG
  actor.send({ type: 'PING_CHILD' })
  await new Promise(r => setTimeout(r, 10))

  t.ok(
    receivedEvents.some(e => e.type === 'PONG'),
    'parent should receive PONG response from child'
  )

  actor.stop()
})

test('XState v5: parent can send events to child via sendTo', async t => {
  const childEvents: any[] = []

  const childMachine = setup({
    actions: {
      recordEvent: ({ event }: any) => {
        childEvents.push(event)
      },
    },
  }).createMachine({
    id: 'Child',
    initial: 'waiting',
    states: {
      waiting: {
        on: {
          TASK: {
            actions: 'recordEvent',
          },
          WORK: {
            actions: 'recordEvent',
          },
        },
      },
    },
  })

  const parentMachine = setup({
    types: {} as {
      events: { type: 'ASSIGN_TASK' } | { type: 'ASSIGN_WORK' }
    },
    actors: {
      worker: childMachine,
    },
    actions: {
      sendTask: sendTo('worker', { type: 'TASK' }),
      sendWork: sendTo('worker', { type: 'WORK' }),
    },
  }).createMachine({
    id: 'Parent',
    initial: 'managing',
    invoke: {
      id: 'worker',
      src: 'worker',
    },
    states: {
      managing: {
        on: {
          ASSIGN_TASK: {
            actions: 'sendTask',
          },
          ASSIGN_WORK: {
            actions: 'sendWork',
          },
        },
      },
    },
  })

  const actor = createActor(parentMachine)
  actor.start()

  actor.send({ type: 'ASSIGN_TASK' })
  await new Promise(r => setTimeout(r, 10))

  t.ok(
    childEvents.some(e => e.type === 'TASK'),
    'child should receive TASK event from parent'
  )

  actor.send({ type: 'ASSIGN_WORK' })
  await new Promise(r => setTimeout(r, 10))

  t.ok(
    childEvents.some(e => e.type === 'WORK'),
    'child should receive WORK event from parent'
  )

  actor.stop()
})
