#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Educational Tests: Why Mailbox Exists (CoffeeMaker Example)
 *
 * These tests demonstrate the same problem as DingDong tests:
 * Without Mailbox, messages sent while a machine is busy are LOST.
 *
 * CoffeeMaker scenario:
 * - Customer orders coffee (MAKE_ME_COFFEE)
 * - Machine takes 10ms to make coffee
 * - If another customer orders while busy, their order is LOST!
 */
/* eslint-disable sort-keys */

import { test } from '#test-helpers'

// Standard ESM imports from XState v5
import { assign, createActor, sendParent, sendTo, setup } from 'xstate'
void sendTo
void sendParent // used in machine definitions

// Note: We intentionally DON'T use Mailbox here to demonstrate the problem it solves

const DELAY_MS = 10

// Simple CoffeeMaker machine WITHOUT mailbox wrapping
const createCoffeeMakerMachine = (delayMs: number = DELAY_MS) =>
  setup({
    types: {} as {
      context: { customer: string | null }
      events: { type: 'MAKE_ME_COFFEE'; customer: string } | { type: 'COFFEE'; customer: string }
    },
    actions: {
      storeCustomer: assign({
        customer: ({ event }: any) => event.customer,
      }),
      clearCustomer: assign({
        customer: () => null,
      }),
      sendCoffeeToParent: sendParent(({ context }: any) => ({
        type: 'COFFEE',
        customer: context.customer,
      })),
    },
  }).createMachine({
    id: 'CoffeeMaker',
    initial: 'idle',
    context: { customer: null },
    states: {
      idle: {
        on: {
          MAKE_ME_COFFEE: {
            target: 'busy',
            actions: 'storeCustomer',
          },
        },
      },
      busy: {
        after: {
          [delayMs]: {
            target: 'idle',
            actions: ['sendCoffeeToParent', 'clearCustomer'],
          },
        },
        // NOTE: While making coffee, additional orders are IGNORED
        // This is the problem Mailbox solves!
      },
    },
  })

test('EDUCATIONAL: CoffeeMaker processes one order correctly', async (t) => {
  /**
   * Happy path - single order is processed correctly.
   */
  const coffees: Array<{ customer: string }> = []

  const parentMachine = setup({
    types: {} as {
      context: Record<string, never>
      events: { type: 'MAKE_ME_COFFEE'; customer: string } | { type: 'COFFEE'; customer: string }
    },
    actors: {
      coffeeMaker: createCoffeeMakerMachine(5),
    },
  }).createMachine({
    id: 'CoffeeShop',
    initial: 'open',
    context: {},
    invoke: {
      id: 'barista',
      src: 'coffeeMaker',
    },
    states: {
      open: {
        on: {
          MAKE_ME_COFFEE: {
            actions: sendTo('barista', ({ event }: any) => event),
          },
          COFFEE: {
            actions: ({ event }: any) => {
              coffees.push({ customer: event.customer })
            },
          },
        },
      },
    },
  })

  const actor = createActor(parentMachine)
  actor.start()

  actor.send({ type: 'MAKE_ME_COFFEE', customer: 'Alice' })

  await new Promise((r) => setTimeout(r, 50))

  t.equal(coffees.length, 1, 'should serve exactly 1 coffee')
  t.equal(coffees[0]?.customer, 'Alice', 'should serve Alice')

  actor.stop()
})

test('EDUCATIONAL: Without Mailbox, coffee orders are LOST when barista is busy', async (t) => {
  /**
   * THIS TEST DEMONSTRATES THE PROBLEM MAILBOX SOLVES!
   *
   * Scenario: 3 customers order coffee at the same time
   * - Alice orders: Barista starts making coffee (busy for 10ms)
   * - Bob orders: Barista is busy, order IGNORED!
   * - Charlie orders: Barista is busy, order IGNORED!
   *
   * Result: Only Alice gets coffee. Bob and Charlie leave angry!
   *
   * With Mailbox.from(coffeeMaker):
   * - All 3 orders would be queued
   * - Processed one at a time
   * - All 3 customers get their coffee
   */
  const coffees: Array<{ customer: string }> = []

  const parentMachine = setup({
    types: {} as {
      context: Record<string, never>
      events: { type: 'MAKE_ME_COFFEE'; customer: string } | { type: 'COFFEE'; customer: string }
    },
    actors: {
      coffeeMaker: createCoffeeMakerMachine(10),
    },
  }).createMachine({
    id: 'CoffeeShop',
    initial: 'open',
    context: {},
    invoke: {
      id: 'barista',
      src: 'coffeeMaker',
    },
    states: {
      open: {
        on: {
          MAKE_ME_COFFEE: {
            actions: sendTo('barista', ({ event }: any) => event),
          },
          COFFEE: {
            actions: ({ event }: any) => {
              coffees.push({ customer: event.customer })
            },
          },
        },
      },
    },
  })

  const actor = createActor(parentMachine)
  actor.start()

  // 3 customers order at the same time
  actor.send({ type: 'MAKE_ME_COFFEE', customer: 'Alice' })
  actor.send({ type: 'MAKE_ME_COFFEE', customer: 'Bob' })
  actor.send({ type: 'MAKE_ME_COFFEE', customer: 'Charlie' })

  // Wait for all potential processing
  await new Promise((r) => setTimeout(r, 100))

  // WITHOUT MAILBOX: Only 1 customer is served!
  t.equal(coffees.length, 1, 'WITHOUT MAILBOX: Only 1 of 3 orders processed (2 customers angry!)')
  t.equal(coffees[0]?.customer, 'Alice', 'Only Alice (first customer) got served')

  // With Mailbox.from(coffeeMaker), all 3 would be served sequentially.
  // See integration-v5.spec.ts for the Mailbox solution.

  actor.stop()
})
