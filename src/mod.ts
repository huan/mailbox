import {
  type Interface,
  MailboxImpl,
}               from './mailbox.js'
import type {
  Options,
}                 from './options.js'
import {
  type Address,
  AddressImpl,
}                   from './address.js'
import * as actions from './actions.js'

import { events, types }   from './duck/mod.js'

import { validate }   from './validate.js'
import { wrap }       from './wrap.js'
import { from }       from './from.js'

import * as nil from './nil.js'

export {
  type Address,
  type Interface,
  type Options,
  //
  from,
  MailboxImpl,
  AddressImpl,
  nil,
  //
  actions, // extend to the xstate.actions
  events,
  types,
  // states as States,
  //
  validate,
  wrap,
}
