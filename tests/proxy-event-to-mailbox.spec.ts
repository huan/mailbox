#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test, sinon }                from 'tstest'
import { createMachine, interpret }   from 'xstate'

import * as Mailbox  from '../src/mods/mod.js'

import * as DingDong  from './machine-behaviors/ding-dong-machine.js'

test('proxy() with Mailbox target', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const mailbox = Mailbox.from(DingDong.machine)
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

  intepretor.send(DingDong.events.DING(1))
  await sandbox.clock.runAllAsync()

  console.info(eventList)
  t.same(eventList, [
    { type: 'xstate.init' },
    DingDong.events.DING(1),
    DingDong.events.DONG(1),
  ], 'should get ding/dong events')

  sandbox.restore()
})
