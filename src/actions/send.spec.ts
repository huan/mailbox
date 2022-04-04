#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test, sinon }    from 'tstest'
import {
  actions,
  createMachine,
  interpret,
}                 from 'xstate'

import { send }  from './send.js'

test('send() with string address', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const machineA = createMachine({
    id: 'machine-a',
    on: {
      DING: {
        actions: [
          actions.log('received DING'),
          actions.respond('DONG'),
        ],
      },
    },
  })

  const eventListA = [] as any[]
  const interpreterA = interpret(machineA)
    .onEvent(e => eventListA.push(e))
    .start()

  const sessionId = interpreterA.sessionId

  const machineB = createMachine({
    id: 'machine-b',
    initial: 'idle',
    states: {
      idle: {
        entry: [
          actions.log('entry idle'),
          send(sessionId)('DING'),
        ],
      },
    },
  })

  const eventListB = [] as any[]
  const interpreterB = interpret(machineB)
    .onEvent(e => eventListB.push(e))
    .start()

  void interpreterB
  await sandbox.clock.runAllAsync()

  // eventListA.forEach(e => console.info('A:', e))
  // eventListB.forEach(e => console.info('B:', e))

  t.same(
    eventListA,
    [
      { type: 'xstate.init' },
      { type: 'DING' },
    ],
    'should have received DING by machine A',
  )

  t.same(
    eventListB,
    [
      { type: 'xstate.init' },
      { type: 'DONG' },
    ],
    'should have received DONG by machine B',
  )

  sandbox.restore()
})
