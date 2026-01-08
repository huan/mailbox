#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * XState v5 Behavior: Accessing Child Actors
 *
 * Tests how parent machines can access their child actors in XState v5.
 * In v5, children are accessed via snapshot.children (Map-like object).
 */
/* eslint-disable sort-keys */

import { test } from '#test-helpers'

// Standard ESM imports from XState v5
import { setup, createActor } from 'xstate'

test('XState v5: parent machine can access child machine via snapshot.children', async t => {
  const CHILD_ID = 'child-id'

  const childMachine = setup({}).createMachine({
    id: 'Child',
    initial: 'active',
    states: {
      active: {},
    },
  })

  const parentMachine = setup({
    actors: {
      childActor: childMachine,
    },
  }).createMachine({
    id: 'Parent',
    initial: 'running',
    invoke: {
      id: CHILD_ID,
      src: 'childActor',
    },
    states: {
      running: {},
    },
  })

  const actor = createActor(parentMachine)
  actor.start()

  const snapshot = actor.getSnapshot()

  // In XState v5, children is a plain object with child actor refs
  t.ok(snapshot.children, 'should have children property')
  t.ok(snapshot.children[CHILD_ID], 'should have child with expected ID')

  // The child should be an actor reference
  const childRef = snapshot.children[CHILD_ID]
  t.ok(childRef, 'should get child actor reference')
  t.ok(childRef.getSnapshot, 'child should have getSnapshot method')

  // The child's state should be accessible
  const childSnapshot = childRef.getSnapshot()
  t.ok(childSnapshot.value, 'child snapshot should have value')
  t.equal(childSnapshot.value, 'active', 'child should be in active state')

  actor.stop()
})
