import type * as events from './events.js'

export type Events  = typeof events
export type Event   = ReturnType<Events[keyof Events]>
