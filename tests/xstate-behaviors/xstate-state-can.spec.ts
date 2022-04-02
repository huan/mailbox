#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  test,
}                   from 'tstest'

import {
  interpret,
  createMachine,
  actions,
}                   from 'xstate'

test('state.can() machine with a TEST event', async t => {
  const testMachine = createMachine({
    on: {
      TEST: {
        actions: actions.log('EVENT:TEST'),
      },
    },
  })

  const interpreter = interpret(testMachine)

  interpreter.start()
  const snapshot = interpreter.getSnapshot()

  t.ok(snapshot.can('TEST'), 'should be able to send event TEST')
  t.notOk(snapshot.can('XXX'), 'should not be able to send event XXX')
})

test('state.can() machine with a * event', async t => {
  const testMachine = createMachine({
    on: {
      '*': {
        actions: actions.log('EVENT:*'),
      },
    },
  })

  const interpreter = interpret(testMachine)

  interpreter.start()
  const snapshot = interpreter.getSnapshot()

  t.ok(snapshot.can('TEST'), 'should be able to send event TESST')
  t.ok(snapshot.can('XXX'), 'should be able to send event XXX')
})
