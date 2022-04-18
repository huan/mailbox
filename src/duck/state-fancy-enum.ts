/* eslint-disable no-redeclare */
import * as states from './states.js'

export type State = {
  [K in keyof typeof states]: typeof states[K]
}
export const State  = states
