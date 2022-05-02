#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { mailboxId, wrappedId } from './mailbox-id.js'

test('mailboxId()', async t => {
  const FIXTURE = [
    [ 'Test', 'Test<Mailbox>' ],
  ] as const

  for (const [ actorMachineId, expected ] of FIXTURE) {
    t.equal(mailboxId(actorMachineId), expected, `should return ${expected} for ${actorMachineId}`)
  }
})

test('wrappedId()', async t => {
  const FIXTURE = [
    [ 'Test', 'Test<Mailbox><Wrapped>' ],
  ] as const

  for (const [ actorMachineId, expected ] of FIXTURE) {
    t.equal(wrappedId(actorMachineId), expected, `should return ${expected} for ${actorMachineId}`)
  }
})
