/* eslint-disable no-redeclare */
import * as events from './events.js'

export type Event = {
  [K in keyof typeof events]: ReturnType<typeof events[K]>
}
export const Event  = events
