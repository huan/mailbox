/**
 *   Mailbox - Pure XState v5 Implementation
 *   https://github.com/huan/mailbox
 *
 *   @copyright 2024 Huan LI (李卓桓) <https://github.com/huan>
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

/**
 * Pure XState v5 Mailbox Implementation
 *
 * Key differences from the v4-compat implementation:
 * 1. Uses native XState v5 APIs (setup, createActor, sendTo, etc.)
 * 2. Uses invoke instead of spawnChild for proper parent-child communication
 * 3. Simplified queue management leveraging XState v5's native FIFO mailbox
 * 4. Uses inspection API for event tracking
 * 5. No compatibility shim needed
 */

// Standard ESM imports from XState v5
import {
  SimulatedClock as XStateSimulatedClock,
  assign,
  createActor,
  enqueueActions,
  sendTo,
  setup,
  sendParent as xstateSendParent,
  waitFor as xstateWaitFor,
} from 'xstate'

import type { AnyActorLogic, AnyEventObject, Clock, EventObject, InspectionEvent } from 'xstate'

import { type Observer, Subject, type Unsubscribable } from 'rxjs'
import 'symbol-observable'

// ============================================================================
// Types
// ============================================================================

/**
 * Mailbox event types - these are the internal protocol events
 */
export const Type = {
  /** Child actor signals it's ready for next message */
  ACTOR_IDLE: 'mailbox/ACTOR_IDLE',
  /** Child actor sends a reply to be forwarded to original sender */
  ACTOR_REPLY: 'mailbox/ACTOR_REPLY',
  /** Dead letter - message that couldn't be delivered */
  DEAD_LETTER: 'mailbox/DEAD_LETTER',
} as const

export type MailboxType = (typeof Type)[keyof typeof Type]

/**
 * Mailbox states - for checking mailbox wrapper state
 */
export const State = {
  /** Mailbox is idle, ready for messages */
  Idle: 'idle',
  /** Mailbox is processing a message (child is busy) */
  Processing: 'processing',
} as const

export type MailboxState = (typeof State)[keyof typeof State]

/**
 * Mailbox events - factory functions for creating typed events
 */
export const Event = {
  ACTOR_IDLE: () => ({ type: Type.ACTOR_IDLE }) as const,
  ACTOR_REPLY: <T extends EventObject>(message: T) =>
    ({
      type: Type.ACTOR_REPLY,
      payload: { message },
    }) as const,
  DEAD_LETTER: (message: AnyEventObject, reason?: string) =>
    ({
      type: Type.DEAD_LETTER,
      payload: { message, reason },
    }) as const,
}

export type MailboxEvent =
  | ReturnType<typeof Event.ACTOR_IDLE>
  | ReturnType<typeof Event.ACTOR_REPLY>
  | ReturnType<typeof Event.DEAD_LETTER>

/**
 * Options for creating a Mailbox
 */
export interface MailboxOptions {
  /** Maximum queue capacity (default: Infinity) */
  capacity?: number
  /** Logger function for debugging */
  logger?: (...args: any[]) => void
  /** Enable XState devTools */
  devTools?: boolean
  /** Custom clock for testing with SimulatedClock */
  clock?: Clock
}

/**
 * Address interface for sending messages to a Mailbox
 */
export interface Address {
  /** Send an event to this address */
  send: (event: AnyEventObject) => void
  /** Get the session ID of this address */
  id: string
  /** String representation */
  toString: () => string
}

/**
 * Mailbox interface - the public API for interacting with a Mailbox
 */
export interface Mailbox<TEvent extends EventObject = EventObject> {
  /** Send an event to the mailbox */
  send: (event: TEvent | TEvent['type']) => void
  /** The mailbox address for external communication */
  address: Address
  /** String ID of the mailbox */
  id: string
  /** Start the mailbox */
  open: () => void
  /** Stop the mailbox */
  close: () => void
  /** Subscribe to events from the child actor */
  subscribe: (observer: Partial<Observer<TEvent>>) => Unsubscribable
  /** RxJS interop */
  [Symbol.observable]: () => Mailbox<TEvent>
  /** RxJS interop (legacy) */
  '@@observable': () => Mailbox<TEvent>
}

// ============================================================================
// Queue Item with Origin Tracking
// ============================================================================

interface QueueItem {
  event: AnyEventObject
  origin?: string
}

// ============================================================================
// Mailbox Context
// ============================================================================

interface MailboxContext {
  /** Message queue */
  queue: QueueItem[]
  /** Currently processing message */
  currentMessage?: QueueItem
  /** Maximum queue capacity */
  capacity: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an event type is a Mailbox internal type
 * Only mailbox/* events are internal - xstate.* events are valid state machine events
 */
export function isMailboxType(type: string): boolean {
  return type.startsWith('mailbox/')
}

/**
 * Extract origin from an event (if present)
 */
function getEventOrigin(event: AnyEventObject): string | undefined {
  return (event as any)?._origin ?? (event as any)?.origin
}

// ============================================================================
// Create Mailbox Machine
// ============================================================================

const CHILD_ID = 'mailbox-child'

/**
 * Create a mailbox wrapper machine for the given child logic
 */
export function createMailboxMachine<TChildLogic extends AnyActorLogic>(
  childLogic: TChildLogic,
  options: MailboxOptions = {},
) {
  const capacity = options.capacity ?? Number.POSITIVE_INFINITY
  const log = options.logger ?? (() => {})

  return setup({
    types: {} as {
      context: MailboxContext
      events: MailboxEvent | AnyEventObject
    },
    actors: {
      childActor: childLogic,
    },
    actions: {
      logMessage: (_, params: { message: string }) => {
        log('[Mailbox]', params.message)
      },
      enqueueMessage: assign({
        queue: ({ context, event }) => {
          if (context.queue.length >= context.capacity) {
            log('[Mailbox] Queue full, dropping message:', event.type)
            return context.queue
          }
          const origin = getEventOrigin(event)
          return [...context.queue, { event, origin }]
        },
      }),
      dequeueMessage: assign({
        currentMessage: ({ context }) => context.queue[0],
        queue: ({ context }) => context.queue.slice(1),
      }),
      clearCurrentMessage: assign({
        currentMessage: () => undefined,
      }),
      forwardToChild: sendTo(CHILD_ID, ({ context }) => context.currentMessage!.event),
    },
    guards: {
      hasQueuedMessages: ({ context }) => context.queue.length > 0,
      isNotMailboxEvent: ({ event }) =>
        !isMailboxType(event.type) && !event.type.startsWith('xstate.'),
    },
  }).createMachine({
    id: 'mailbox',
    initial: 'idle',
    context: {
      queue: [],
      currentMessage: undefined,
      capacity,
    },
    invoke: {
      id: CHILD_ID,
      src: 'childActor',
    },

    states: {
      idle: {
        entry: [{ type: 'logMessage', params: { message: 'Entering idle state' } }],
        always: {
          guard: 'hasQueuedMessages',
          target: 'processing',
        },
        on: {
          [Type.ACTOR_IDLE]: {
            // Child signaled idle but we're already idle - ignore
          },
          [Type.ACTOR_REPLY]: {
            // Late reply from child - will be captured by inspection
          },
          '*': {
            guard: 'isNotMailboxEvent',
            actions: 'enqueueMessage',
            target: 'processing',
          },
        },
      },

      processing: {
        entry: [
          { type: 'logMessage', params: { message: 'Processing message' } },
          'dequeueMessage',
          'forwardToChild',
        ],
        on: {
          [Type.ACTOR_IDLE]: {
            target: 'idle',
            actions: 'clearCurrentMessage',
          },
          [Type.ACTOR_REPLY]: {
            // Reply from child - will be captured by inspection
          },
          '*': {
            guard: 'isNotMailboxEvent',
            actions: 'enqueueMessage',
          },
        },
      },
    },
  })
}

// ============================================================================
// Mailbox Actions for Child Machines
// ============================================================================

/**
 * Actions to be used by child machines wrapped in a Mailbox
 */
export const actions = {
  /**
   * Signal that the child actor is idle and ready for the next message.
   * Call this in entry actions of idle states.
   */
  idle: (_machineId: string) => {
    return enqueueActions(({ event, enqueue }: any) => {
      // Don't signal idle for mailbox internal events
      if (isMailboxType(event.type)) return
      enqueue(xstateSendParent(Event.ACTOR_IDLE()))
    })
  },

  /**
   * Send a reply back through the mailbox to the original sender.
   * The mailbox will route it to whoever sent the original message.
   */
  reply: <TEvent extends EventObject>(
    eventOrFn: TEvent | ((context: any, event: any) => TEvent),
  ) => {
    return enqueueActions(({ context, event, enqueue }: any) => {
      const replyEvent =
        typeof eventOrFn === 'function'
          ? (eventOrFn as (context: any, event: any) => TEvent)(context, event)
          : eventOrFn
      // Use delay:0 to ensure reply is processed after current transition
      enqueue(xstateSendParent(Event.ACTOR_REPLY(replyEvent), { delay: 0 }))
    })
  },

  /**
   * Proxy events to a mailbox
   */
  proxy: (_sourceId: string) => (mailbox: Mailbox) => {
    return enqueueActions(({ event, self }: any) => {
      if (isMailboxType(event.type)) return
      // Add origin so replies come back to us
      const eventWithOrigin = {
        ...event,
        _origin: self.sessionId,
      }
      mailbox.send(eventWithOrigin as any)
    })
  },
}

// ============================================================================
// Mailbox Implementation Class
// ============================================================================

/**
 * Mailbox implementation wrapping an XState v5 actor
 */
class MailboxImpl<TEvent extends EventObject = EventObject> implements Mailbox<TEvent> {
  readonly address: Address
  readonly id: string

  private _actor: any
  private _subject = new Subject<TEvent>()
  private _opened = false
  private _inspectionSub?: { unsubscribe: () => void }

  constructor(childLogic: AnyActorLogic, options: MailboxOptions = {}) {
    const machine = createMailboxMachine(childLogic, options)

    this._actor = createActor(machine, {
      clock: options.clock,
      inspect: (inspectionEvent: InspectionEvent) => {
        this._handleInspection(inspectionEvent)
      },
    })

    this.id = this._actor.sessionId
    this.address = {
      id: this.id,
      send: (event) => this.send(event as TEvent),
      toString: () => this.id,
    }
  }

  private _handleInspection(inspectionEvent: InspectionEvent): void {
    if (inspectionEvent.type !== '@xstate.event') return

    const event = inspectionEvent.event as AnyEventObject

    // Forward ACTOR_REPLY payloads to subscribers
    if (event.type === Type.ACTOR_REPLY) {
      const reply = (event as ReturnType<typeof Event.ACTOR_REPLY>).payload.message
      this._subject.next(reply as TEvent)
      return
    }

    // Forward DEAD_LETTER events
    if (event.type === Type.DEAD_LETTER) {
      this._subject.next(event as any)
      return
    }
  }

  send(event: TEvent | TEvent['type']): void {
    if (!this._opened) {
      this.open()
    }
    const normalizedEvent = typeof event === 'string' ? { type: event } : event
    this._actor.send(normalizedEvent as AnyEventObject)
  }

  open(): void {
    if (this._opened) return
    this._actor.start()
    this._opened = true
  }

  close(): void {
    if (!this._opened) return
    this._actor.stop()
    this._inspectionSub?.unsubscribe()
    this._subject.complete()
    this._opened = false
  }

  subscribe(observer: Partial<Observer<TEvent>>): Unsubscribable {
    return this._subject.subscribe(observer)
  }

  [Symbol.observable](): this {
    return this
  }

  '@@observable'(): this {
    return this
  }
}

// ============================================================================
// Public Factory Function
// ============================================================================

/**
 * Create a Mailbox from an actor logic definition
 *
 * @param logic The child actor logic to wrap in a mailbox
 * @param options Mailbox options
 * @returns A Mailbox instance
 *
 * @example
 * ```ts
 * const childMachine = createMachine({
 *   id: 'worker',
 *   initial: 'idle',
 *   states: {
 *     idle: {
 *       entry: Mailbox.actions.idle('worker'),
 *       on: { WORK: 'working' }
 *     },
 *     working: {
 *       entry: Mailbox.actions.reply({ type: 'DONE' }),
 *       always: 'idle'
 *     }
 *   }
 * })
 *
 * const mailbox = Mailbox.from(childMachine)
 * mailbox.open()
 * mailbox.send({ type: 'WORK' })
 * ```
 */
export function from<TLogic extends AnyActorLogic>(
  logic: TLogic,
  options?: MailboxOptions,
): Mailbox<EventObject> {
  return new MailboxImpl(logic, options)
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a Mailbox
 */
export function isMailbox(value: unknown): value is Mailbox {
  return (
    value !== null &&
    typeof value === 'object' &&
    'send' in value &&
    'address' in value &&
    'open' in value &&
    'close' in value
  )
}

/**
 * Check if a value is an Address
 */
export function isAddress(value: unknown): value is Address {
  return (
    value !== null &&
    typeof value === 'object' &&
    'send' in value &&
    'id' in value &&
    typeof (value as Address).send === 'function'
  )
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export const SimulatedClock = XStateSimulatedClock
export const waitFor = xstateWaitFor
