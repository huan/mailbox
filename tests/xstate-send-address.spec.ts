#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  test,
}                   from 'tstest'

import {
  interpret,
  createMachine,
  actions,
  AnyEventObject,
}                   from 'xstate'

test('two xstate machine interpreter can exchange events', async t => {
  const testMachine = createMachine({
    on: {
      TEST: {
        actions: [
          actions.send('OK', { to: (_, e) => (e as any).address }),
        ],
      },
    },
  })

  const interpreterA = interpret(testMachine)
  const interpreterB = interpret(testMachine)

  const eventListB: AnyEventObject[] = []
  interpreterB
    .onEvent(e => eventListB.push(e))
    .start()

  const addressB = interpreterB.sessionId

  interpreterA.start()
  interpreterA.send('TEST', { address: addressB })

  t.same(
    eventListB.filter(e => e.type === 'OK'),
    [{ type: 'OK' }],
    'should receive OK event by B sent from A')
})
