/* eslint-disable no-redeclare */
import * as types from './types.js'

export type Type = {
  [K in keyof typeof types]: typeof types[K]
}
export const Type  = types
