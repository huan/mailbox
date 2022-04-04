import { AddressImpl }    from './address.js'
import type { IMailbox }  from './mailbox-interface.js'

export function isMailbox (value: any): value is IMailbox {
  return !!value
    && typeof value.send === 'function'
    && value.address instanceof AddressImpl
}
