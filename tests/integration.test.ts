#!/usr/bin/env -S npx ts-node --esm
/**
 * Integration tests for XState v5 native Mailbox implementation
 */

import { test } from '#test-helpers'

// Standard ESM imports from XState v5
import { createActor, createMachine } from 'xstate'
void createMachine
void createActor // used indirectly

// Import Mailbox
import * as Mailbox from '../src/mailbox.js'
const { SimulatedClock } = Mailbox

// Import DingDong machine
import DingDong from './machine-behaviors/ding-dong-machine.js'

// Helper to advance clock with microtask flushing
async function tickClock(clock: any, ms: number): Promise<void> {
  for (let i = 0; i < ms; i++) {
    clock.increment(1)
    await new Promise((r) => setTimeout(r, 0))
  }
}

test('Mailbox: DingDong processes multiple DING events sequentially', async (t) => {
  const clock = new SimulatedClock()

  const ITEM_NUMBERS = [0, 1, 2]
  const DING_EVENTS = ITEM_NUMBERS.map((i) => DingDong.Event.DING(i))

  const logs: string[] = []
  const mailbox = Mailbox.from(DingDong.machine, {
    clock,
    logger: (...args) => logs.push(args.join(' ')),
  })

  const replies: any[] = []
  mailbox.subscribe({ next: (e) => replies.push(e) })

  mailbox.open()

  // Send all DING events
  DING_EVENTS.forEach((e) => mailbox.send(e))

  // Advance clock to process all events (random delay 0-10ms per event, 3 events)
  // Need more iterations to allow state machine to cycle through idle/processing
  for (let i = 0; i < 50; i++) {
    clock.increment(5)
    await new Promise((r) => setTimeout(r, 1))
  }

  // Debug output (uncomment for debugging)
  // console.log('Logs:', logs)
  // console.log('Replies:', replies)

  // Verify all DONG replies received
  const dongReplies = replies.filter((e) => e.type === DingDong.Type.DONG)
  t.equal(dongReplies.length, 3, `should receive 3 DONG replies (got ${dongReplies.length})`)

  // Verify order preserved
  if (dongReplies.length === 3) {
    t.same(
      dongReplies.map((e) => e.payload.i),
      [0, 1, 2],
      'should process in order (0, 1, 2)',
    )
  }

  mailbox.close()
})

test('Mailbox: proxy action forwards events to mailbox', async (t) => {
  const clock = new SimulatedClock()

  const mailbox = Mailbox.from(DingDong.machine, { clock })

  const replies: any[] = []
  mailbox.subscribe({ next: (e) => replies.push(e) })

  mailbox.open()

  // Create a test machine that proxies events to the mailbox
  const testMachine = createMachine({
    id: 'TestMachine',
    on: {
      '*': {
        actions: Mailbox.actions.proxy('TestMachine')(mailbox),
      },
    },
  })

  const testActor = createActor(testMachine, { clock })
  testActor.start()

  // Send DING via the test machine (which proxies to mailbox)
  testActor.send(DingDong.Event.DING(42))

  // Advance clock
  await tickClock(clock, 50)

  // Verify DONG reply received
  const dongReplies = replies.filter((e) => e.type === DingDong.Type.DONG)
  t.equal(dongReplies.length, 1, 'should receive 1 DONG reply')
  t.equal(dongReplies[0]?.payload?.i, 42, 'should contain correct value')

  testActor.stop()
  mailbox.close()
})

test('Mailbox: address.send works for external communication', async (t) => {
  const clock = new SimulatedClock()

  const mailbox = Mailbox.from(DingDong.machine, { clock })

  const replies: any[] = []
  mailbox.subscribe({ next: (e) => replies.push(e) })

  mailbox.open()

  // Send via address (simulating external sender)
  mailbox.address.send(DingDong.Event.DING(99))

  // Advance clock
  await tickClock(clock, 50)

  // Verify reply
  const dongReplies = replies.filter((e) => e.type === DingDong.Type.DONG)
  t.equal(dongReplies.length, 1, 'should receive 1 DONG reply')
  t.equal(dongReplies[0]?.payload?.i, 99, 'should contain correct value')

  mailbox.close()
})

test('Mailbox: handles burst of messages without losing any', async (t) => {
  const clock = new SimulatedClock()

  const mailbox = Mailbox.from(DingDong.machine, { clock })

  const replies: any[] = []
  mailbox.subscribe({ next: (e) => replies.push(e) })

  mailbox.open()

  // Send a burst of 10 messages
  for (let i = 0; i < 10; i++) {
    mailbox.send(DingDong.Event.DING(i))
  }

  // Advance clock (10 events * up to 10ms delay each = 100ms max)
  await tickClock(clock, 200)

  // All 10 should be processed
  const dongReplies = replies.filter((e) => e.type === DingDong.Type.DONG)
  t.equal(dongReplies.length, 10, 'should process all 10 messages')

  // Order should be preserved
  t.same(
    dongReplies.map((e) => e.payload.i),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    'should process in order',
  )

  mailbox.close()
})

test('Mailbox: Event and Type exports match expected values', async (t) => {
  t.equal(Mailbox.Type.ACTOR_IDLE, 'mailbox/ACTOR_IDLE', 'ACTOR_IDLE type')
  t.equal(Mailbox.Type.ACTOR_REPLY, 'mailbox/ACTOR_REPLY', 'ACTOR_REPLY type')

  const idleEvent = Mailbox.Event.ACTOR_IDLE()
  t.same(idleEvent, { type: 'mailbox/ACTOR_IDLE' }, 'ACTOR_IDLE event')

  const replyEvent = Mailbox.Event.ACTOR_REPLY({ type: 'TEST' })
  t.equal(replyEvent.type, 'mailbox/ACTOR_REPLY', 'ACTOR_REPLY event type')
  t.same(replyEvent.payload.message, { type: 'TEST' }, 'ACTOR_REPLY payload')
})

test('Mailbox: isMailbox and isAddress type guards', async (t) => {
  const clock = new SimulatedClock()
  const mailbox = Mailbox.from(DingDong.machine, { clock })

  t.ok(Mailbox.isMailbox(mailbox), 'mailbox passes isMailbox')
  t.ok(Mailbox.isAddress(mailbox.address), 'address passes isAddress')
  t.notOk(Mailbox.isMailbox(null), 'null fails isMailbox')
  t.notOk(Mailbox.isMailbox({}), 'empty object fails isMailbox')
  t.notOk(Mailbox.isAddress({}), 'empty object fails isAddress')

  mailbox.close()
})
