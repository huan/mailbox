import type { Mailbox }  from '../impls/mod.js'

export function isMailbox (value: any): value is Mailbox {
  return !!value
    && typeof value.send === 'function'
      && typeof value.id === 'string'
        && value.address
          && typeof value.address.send === 'function'
            && typeof value.address.id === 'string'
              && value.id === value.address.id
}
