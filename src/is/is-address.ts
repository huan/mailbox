import type { Address }  from '../impls/address-interface.js'

export function isAddress (value: any): value is Address {
  return !!value
    && typeof value.send === 'function'
      && typeof value.id === 'string'
        && typeof value.condNotSame === 'function'
          && typeof value.toString === 'function'
            && value.toString() === value.id
}
