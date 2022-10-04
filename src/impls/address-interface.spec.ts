#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 *   Mailbox - https://github.com/huan/mailbox
 *    author: Huan LI (李卓桓) <zixia@zixia.net>
 *    Dec 2021
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
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
 */
import { test }   from 'tstest'

import type { Address }   from './address-interface.js'

test('toString()', async t => {
  const ID = 'mocked_id'
  const address: Address = {
    toString: () => ID,
  } as any

  t.equal(address.toString(), ID, 'should return ID')
  t.equal(address + '', ID, 'should be equal to ID with + operator')
  t.equal(String(address), ID, 'should be equal to ID with String()')

  function tt (s: string) { return s + 't' }
  tt(address.toString())
})
