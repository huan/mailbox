#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  test,
  sinon,
}                   from 'tstest'

import {
  interpret,
  createMachine,
  spawn,
  actions,
  ActorRef,
}                   from 'xstate'

test('xstate machine with spawn-ed & invoked child machine order testing for entry/exit orders', async t => {
  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()

  const childMachine = (id: string) => createMachine({
    entry: () => spy(id + ' childMachine.entry'),
    exit: () => spy(id + ' childMachine.exit'),
  })

  interface Context {
    childRef?: ActorRef<any>
  }

  const parentMachine = createMachine<Context>({
    entry: [
      _ => spy('parentMachine.entry'),
      actions.assign({
        childRef: _ => spawn(childMachine('spawn')),
      }),
    ],
    exit: [
      _ => spy('parentMachine.exit'),
    ],
    context: {
      childRef: undefined,
    },
    invoke: {
      src: childMachine('invoke'),
    },
  })

  const interpreter = interpret(parentMachine)

  spy.resetHistory()
  interpreter.start()
  t.same(spy.args.map(a => a[0]), [
    'spawn childMachine.entry',
    'invoke childMachine.entry',
    'parentMachine.entry',
  ], 'should call entry actions in order')

  spy.resetHistory()
  interpreter.stop()
  t.same(spy.args.map(a => a[0]), [
    'parentMachine.exit',
    'spawn childMachine.exit',
    'invoke childMachine.exit',
  ], 'should call exit actions in order')

  sandbox.restore()
})
