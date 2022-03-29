#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/* eslint-disable sort-keys */

import {
  test,
  sinon,
}                   from 'tstest'

import {
  interpret,
  actions,
  createMachine,
}                   from 'xstate'

const spyActionsMachine = (spy: sinon.SinonSpy) => createMachine<{ lastSetBy: string }>({
  initial: 'step0',
  context: {
    lastSetBy: 'initializing',
  },
  /**
   * Issue statelyai/xstate#2891:
   *  The context provided to the expr inside a State
   *  should be exactly the **context in this state**
   *
   * @see https://github.com/statelyai/xstate/issues/2891
   */
  preserveActionOrder: true,

  states: {
    step0: {
      entry: [
        actions.assign({ lastSetBy: _ => { spy('states.step0.entry.assign'); return 'states.step0.entry.assign' } }),
        ctx => spy('states.step0.entry.expr context.lastSetBy:' + ctx.lastSetBy),
      ],
      exit: [
        actions.assign({ lastSetBy: _ => { spy('states.step0.exit.assign'); return 'states.step0.exit.assign' } }),
        ctx => spy('states.step0.exit.expr context.lastSetBy:' + ctx.lastSetBy),
      ],
      on: {
        '*': {
          target: 'step1',
          actions: [
            actions.assign({ lastSetBy: _ => { spy('states.step0.on.assign'); return 'states.step0.on.assign' } }),
            ctx => spy('states.step0.on.expr context.lastSetBy:' + ctx.lastSetBy),
          ],
        },
      },
    },
    step1: {
      entry: [
        actions.assign({ lastSetBy: _ => { spy('states.step1.entry.assign'); return 'states.step1.entry.assign' } }),
        ctx => spy('states.step1.entry.expr context.lastSetBy:' + ctx.lastSetBy),
      ],
      always: {
        actions: [
          actions.assign({ lastSetBy: _ => { spy('states.step1.always.assign'); return 'states.step1.always.assign' } }),
          ctx => spy('states.step1.always.expr context.lastSetBy:' + ctx.lastSetBy),
        ],
        target: 'step2',
      },
      exit: [
        actions.assign({ lastSetBy: _ => { spy('states.step1.exit.assign'); return 'states.step1.exit.assign' } }),
        ctx => spy('states.step1.exit.expr context.lastSetBy:' + ctx.lastSetBy),
      ],
    },
    step2: {
      entry: [
        actions.assign({ lastSetBy: _ => { spy('states.step2.entry.assign'); return 'states.step2.entry.assign' } }),
        ctx => spy('states.step2.entry.expr context.lastSetBy:' + ctx.lastSetBy),
      ],
      after: {
        0: {
          target: 'step3',
          actions: [
            actions.assign({ lastSetBy: _ => { spy('states.step2.after.assign'); return 'states.step2.after.assign' } }),
            ctx => spy('states.step2.after.expr context.lastSetBy:' + ctx.lastSetBy),
          ],
        },
      },
      exit: [
        actions.assign({ lastSetBy: _ => { spy('states.step2.exit.assign'); return 'states.step2.exit.assign' } }),
        ctx => spy('states.step2.exit.expr context.lastSetBy:' + ctx.lastSetBy),
      ],
    },
    step3: {
      entry: [
        actions.assign({ lastSetBy: _ => { spy('states.step3.entry.assign'); return 'states.step3.entry.assign' } }),
        ctx => spy('states.step3.entry.expr context.lastSetBy:' + ctx.lastSetBy),
      ],
      type: 'final',
    },
  },
})

test('spyActionsMachine actions order testing', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })
  const spy = sandbox.spy()
  const machine = spyActionsMachine(spy)
  const interpreter = interpret(machine)

  interpreter.onEvent(e       => spy('onEvent: received ' + e.type))
  interpreter.onTransition(s  => spy('onTransition: transition to ' + s.value))

  interpreter.start()

  spy('interpreter.send("TEST")')
  interpreter.send('TEST')

  await sandbox.clock.runAllAsync()
  // console.info(spy.args)
  const EXPECTED_ARGS = [
    /**
     * Huan(202112):
     *
     * When receiving a EVENT:
     *  1. the actions execute order in transition is:
     *    1. exit
     *    2. on/always/after
     *    3. entry
     *  2. all `assign` actions will be ran first, then other actions.
     */
    ['states.step0.entry.assign'],
    ['states.step0.entry.expr context.lastSetBy:states.step0.entry.assign'],
    ['onEvent: received xstate.init'],
    ['onTransition: transition to step0'],
    ['interpreter.send("TEST")'],
    ['states.step0.exit.assign'],
    ['states.step0.on.assign'],
    ['states.step1.entry.assign'],
    ['states.step1.exit.assign'],
    ['states.step1.always.assign'],
    ['states.step2.entry.assign'],
    ['states.step0.exit.expr context.lastSetBy:states.step0.exit.assign'],
    ['states.step0.on.expr context.lastSetBy:states.step0.on.assign'],
    ['states.step1.entry.expr context.lastSetBy:states.step1.entry.assign'],
    ['states.step1.exit.expr context.lastSetBy:states.step1.exit.assign'],
    ['states.step1.always.expr context.lastSetBy:states.step1.always.assign'],
    ['states.step2.entry.expr context.lastSetBy:states.step2.entry.assign'],
    ['onEvent: received TEST'],
    ['onTransition: transition to step2'],
    ['states.step2.exit.assign'],
    ['states.step2.after.assign'],
    ['states.step3.entry.assign'],
    ['states.step2.exit.expr context.lastSetBy:states.step2.exit.assign'],
    ['states.step2.after.expr context.lastSetBy:states.step2.after.assign'],
    ['states.step3.entry.expr context.lastSetBy:states.step3.entry.assign'],
    ['onEvent: received xstate.after(0)#(machine).step2'],
    ['onTransition: transition to step3'],
  ]

  t.same(spy.args, EXPECTED_ARGS, 'should get the same order as expected')

  interpreter.stop()
  sandbox.restore()
})
