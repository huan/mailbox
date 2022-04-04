import type { Mailbox }  from '../impls/mod.js'

export function isMailbox (value: any): value is Mailbox {
  return !!value
    && typeof value.id === 'string'
    && typeof value.send === 'function'
    && value.address && typeof value.address.send === 'function'
}
