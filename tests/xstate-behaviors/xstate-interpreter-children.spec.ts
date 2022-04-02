#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }                     from 'tstest'
import { interpret, createMachine } from 'xstate'

test('XState parent machine should have child machine in services', async t => {
  const CHILD_ID = 'child-id'

  const childMachine = createMachine({})
  const parentMachine = createMachine({
    invoke: {
      id: CHILD_ID,
      src: childMachine,
    },
  })
  const interpreter = interpret(parentMachine)

  t.ok(interpreter.sessionId, 'should get a vaild sessionId')

  const services = parentMachine.options.services || {}

  t.equal(services[CHILD_ID], childMachine, 'should have child machine in services')
  // console.info(interpreter)
})
