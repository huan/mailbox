#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import { test }                     from 'tstest'
import { interpret, createMachine } from 'xstate'

test('XState interpreter should have a consistent sessionId between start/stop', async t => {
  const interpreter = interpret(createMachine({}))

  const sessionId = interpreter.sessionId
  t.ok(sessionId, 'should get a vaild sessionId')

  interpreter.start()
  t.equal(interpreter.sessionId, sessionId, 'should be consistent sessionId after start')

  interpreter.stop()
  t.equal(interpreter.sessionId, sessionId, 'should be consistent sessionId after stop')

  interpreter.start()
  t.equal(interpreter.sessionId, sessionId, 'should be consistent sessionId after restart')
})
