#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 *   Wechaty Open Source Software - https://github.com/wechaty
 *
 *   @copyright 2022 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License")
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import { test }  from 'tstest'

import * as mod   from './mod.js'

test('mod.impls.*', async t => {
  t.ok(mod.impls, 'should export impls')
  t.ok(mod.impls.Address instanceof Function, 'should export Address')
  t.ok(mod.impls.Mailbox instanceof Function, 'should export Mailbox')
})

test('mod.actions.*', async t => {
  t.ok(mod.actions, 'should export actions')
  t.ok(mod.actions.idle instanceof Function, 'should export idle')
  t.ok(mod.actions.proxy instanceof Function, 'should export proxy')
  t.ok(mod.actions.reply instanceof Function, 'should export reply')
  t.ok(mod.actions.send instanceof Function, 'should export send')
})

test('mod.nil.*', async t => {
  t.ok(mod.nil, 'should export nil')
  t.ok(mod.nil.address instanceof mod.impls.Address, 'should export address')
  t.ok(mod.nil.mailbox instanceof mod.impls.Mailbox, 'should export mailbox')
  t.ok(mod.nil.machine, 'should export machine')
  t.ok(mod.nil.logger instanceof Function, 'should export logger')
})

test('helpers.*', async t => {
  t.ok(mod.helpers, 'should export helpers')
  t.ok(mod.helpers.isMailboxType, 'should export isMailboxType')
  t.ok(mod.helpers.validate, 'should export validate')
  t.ok(mod.helpers.wrap, 'should export wrap')
})

test('mod.*', async t => {
  t.ok(mod.from instanceof Function, 'should export from')
  t.ok(mod.isMailbox instanceof Function, 'should export isMailbox')
  t.ok(mod.isAddress instanceof Function, 'should export isAddress')
  t.ok(mod.events, 'should export events')
  t.ok(mod.types, 'should export types')
  t.ok(mod.VERSION, 'should export VERSION')
})
