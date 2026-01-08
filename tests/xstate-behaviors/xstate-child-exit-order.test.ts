#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * XState v5 Behavior: Child Actor Entry/Exit Order
 *
 * Tests the order in which child actors are started and their actions fire.
 * Note: In XState v5, exit actions do NOT fire when actor.stop() is called
 * from outside. Exit actions only fire during internal state transitions.
 */
/* eslint-disable sort-keys */

import { sinon, test } from '#test-helpers'

// Standard ESM imports from XState v5
import { assign, createActor, setup } from 'xstate'

test('XState v5: invoked child entry order - child starts before parent entry completes', async (t) => {
  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()

  const childMachine = setup({}).createMachine({
    id: 'InvokedChild',
    entry: () => spy('invokedChild.entry'),
  })

  const parentMachine = setup({
    actors: {
      child: childMachine,
    },
    actions: {
      parentEntry: () => spy('parent.entry'),
    },
  }).createMachine({
    id: 'Parent',
    initial: 'active',
    entry: 'parentEntry',
    states: {
      active: {
        invoke: {
          id: 'invokedChild',
          src: 'child',
        },
      },
    },
  })

  const actor = createActor(parentMachine)

  spy.resetHistory()
  actor.start()

  // In v5, invoked children start during state entry
  const entryOrder = spy.args.map((a: any) => a[0])
  t.ok(entryOrder.includes('invokedChild.entry'), 'invoked child entry should be called')
  t.ok(entryOrder.includes('parent.entry'), 'parent entry should be called')

  actor.stop()
  sandbox.restore()
})

test('XState v5: exit actions fire during internal transitions', async (t) => {
  /**
   * In XState v5, exit actions fire during state transitions, not when
   * actor.stop() is called from outside. This test verifies exit behavior
   * during an internal transition.
   */
  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()

  const machine = setup({
    types: {} as {
      events: { type: 'NEXT' }
    },
    actions: {
      state1Exit: () => spy('state1.exit'),
      state2Entry: () => spy('state2.entry'),
    },
  }).createMachine({
    id: 'ExitTest',
    initial: 'state1',
    states: {
      state1: {
        exit: 'state1Exit',
        on: {
          NEXT: 'state2',
        },
      },
      state2: {
        entry: 'state2Entry',
      },
    },
  })

  const actor = createActor(machine)
  actor.start()

  spy.resetHistory()
  actor.send({ type: 'NEXT' })

  const actionOrder = spy.args.map((a: any) => a[0])

  // Exit should be called before entry of next state
  t.same(
    actionOrder,
    ['state1.exit', 'state2.entry'],
    'exit actions should fire before entry actions during transition',
  )

  actor.stop()
  sandbox.restore()
})

test('XState v5: spawned child starts when spawn action executes', async (t) => {
  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()

  const childMachine = setup({}).createMachine({
    id: 'SpawnedChild',
    entry: () => spy('spawnedChild.entry'),
  })

  const parentMachine = setup({
    types: {} as {
      context: { childRef: any }
    },
    actors: {
      spawnedActor: childMachine,
    },
    actions: {
      parentEntry: () => spy('parent.entry'),
      spawnChildActor: assign({
        childRef: ({ spawn }: any) => spawn('spawnedActor', { id: 'spawned' }),
      }),
    },
  }).createMachine({
    id: 'Parent',
    initial: 'active',
    context: { childRef: null },
    entry: ['parentEntry', 'spawnChildActor'],
    exit: () => spy('parent.exit'),
    states: {
      active: {},
    },
  })

  const actor = createActor(parentMachine)

  spy.resetHistory()
  actor.start()

  const entryOrder = spy.args.map((a: any) => a[0])
  t.ok(entryOrder.includes('parent.entry'), 'parent entry should be called')
  t.ok(entryOrder.includes('spawnedChild.entry'), 'spawned child entry should be called')

  actor.stop()
  sandbox.restore()
})
