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

test('mod.VERSION', async t => {
  t.ok(mod.VERSION, 'should export VERSION')
})

test('mod.impls.*', async t => {
  t.ok(mod.impls, 'should export impls')
})

test('mod export actions & nil & from etc', async t => {
  t.ok(mod.actions, 'should export actions')
  t.ok(mod.nil, 'should export nil')
  t.ok(mod.from, 'should export from')
  t.ok(mod.events, 'should export events')
  t.ok(mod.types, 'should export types')
})

test('helpers.*', async t => {
  t.ok(mod.helpers, 'should export helpers')
  t.ok(mod.helpers.isMailboxType, 'should export isMailboxType')
  t.ok(mod.helpers.validate, 'should export validate')
  t.ok(mod.helpers.wrap, 'should export wrap')
})
