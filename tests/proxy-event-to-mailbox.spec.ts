#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test, sinon }                from 'tstest'
import { createMachine, interpret }   from 'xstate'

import * as Mailbox  from '../src/mods/mod.js'

import DingDong  from './machine-behaviors/ding-dong-machine.js'

test('proxy() with Mailbox target', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const mailbox = Mailbox.from(DingDong.machine.withContext(DingDong.initialContext()))
  mailbox.open()

  const testMachine = createMachine({
    on: {
      '*': {
        actions: Mailbox.actions.proxy('TestMachine')(mailbox),
      },
    },
  })

  const eventList = [] as any[]
  const intepretor = interpret(testMachine)
    .onEvent(e => eventList.push(e))
    .start()

  intepretor.send(DingDong.Event.DING(1))
  await sandbox.clock.runAllAsync()

  console.info(eventList)
  t.same(eventList, [
    { type: 'xstate.init' },
    DingDong.Event.DING(1),
    DingDong.Event.DONG(1),
  ], 'should get ding/dong events')

  sandbox.restore()
})
