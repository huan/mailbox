#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import {
  test,
}                   from 'tstest'
import {
  actions,
  AnyEventObject,
  createMachine,
  interpret,
}                 from 'xstate'

import * as duck  from '../duck/mod.js'

import { reply }  from './reply.js'

/**
 * Issue #11 - Race condition: Mailbox think the target machine is busy when it's not
 *  @link https://github.com/wechaty/bot5-assistant/issues/11
 */
test('reply()', async t => {
  const targetMachine = createMachine({
    id: 'target-machine-id',
    initial: 'idle',
    states: {
      idle: {
        entry: [
          reply('FIRST_LINE'),
          actions.sendParent('SECOND_LINE'),
        ],
      },
    },
  })

  const consumerMachine = createMachine({
    invoke: {
      src: targetMachine,
    },
  })

  const interpreter = interpret(consumerMachine)
  const eventList: AnyEventObject[] = []
  interpreter
    .onEvent(e => eventList.push(e))
    .start()

  await new Promise(resolve => setTimeout(resolve, 0))
  t.same(
    eventList,
    [
      { type: 'xstate.init' },
      { type: 'SECOND_LINE' },
      duck.Event.CHILD_REPLY({ type: 'FIRST_LINE' }),
    ],
    'should send reply event to parent in the next event loop',
  )
})
