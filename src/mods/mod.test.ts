#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Mailbox module exports tests
 */
import { test } from '#test-helpers'

import * as mod from './mod.js'

test('mod core exports', async (t) => {
  t.ok(mod.from instanceof Function, 'should export from()')
  t.ok(mod.isMailbox instanceof Function, 'should export isMailbox()')
  t.ok(mod.isAddress instanceof Function, 'should export isAddress()')
  t.ok(mod.isMailboxType instanceof Function, 'should export isMailboxType()')
  t.ok(mod.VERSION, 'should export VERSION')
})

test('mod.actions.*', async (t) => {
  t.ok(mod.actions, 'should export actions')
  t.ok(mod.actions.idle instanceof Function, 'should export idle')
  t.ok(mod.actions.proxy instanceof Function, 'should export proxy')
  t.ok(mod.actions.reply instanceof Function, 'should export reply')
})

test('mod.nil.*', async (t) => {
  t.ok(mod.nil, 'should export nil')
  t.ok(mod.isAddress(mod.nil.address), 'should export address')
  t.ok(mod.isMailbox(mod.nil.mailbox), 'should export mailbox')
  t.ok(mod.nil.machine, 'should export machine')
  t.ok(mod.nil.logger instanceof Function, 'should export logger')
})

test('mod.Event.*', async (t) => {
  t.ok(mod.Event, 'should export Event')
  t.ok(mod.Event.ACTOR_IDLE, 'should export Event.ACTOR_IDLE')
  t.ok(mod.Event.ACTOR_REPLY, 'should export Event.ACTOR_REPLY')
  t.ok(mod.Event.DEAD_LETTER, 'should export Event.DEAD_LETTER')
})

test('mod.Type.*', async (t) => {
  t.ok(mod.Type, 'should export Type')
  t.equal(mod.Type.ACTOR_IDLE, 'mailbox/ACTOR_IDLE', 'should export Type.ACTOR_IDLE')
  t.equal(mod.Type.ACTOR_REPLY, 'mailbox/ACTOR_REPLY', 'should export Type.ACTOR_REPLY')
  t.equal(mod.Type.DEAD_LETTER, 'mailbox/DEAD_LETTER', 'should export Type.DEAD_LETTER')
})

test('mod.State.*', async (t) => {
  t.ok(mod.State, 'should export State')
  t.equal(mod.State.Idle, 'idle', 'should export State.Idle')
  t.equal(mod.State.Processing, 'processing', 'should export State.Processing')
})

test('mod XState utilities', async (t) => {
  t.ok(mod.SimulatedClock, 'should export SimulatedClock')
  t.ok(mod.waitFor, 'should export waitFor')
})

test('mod.validate', async (t) => {
  t.ok(mod.validate instanceof Function, 'should export validate()')
  t.ok(mod.MailboxValidationError, 'should export MailboxValidationError')
})
