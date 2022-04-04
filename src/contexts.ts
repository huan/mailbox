/**
 *   Wechaty Open Source Software - https://github.com/wechaty
 *
 *   @copyright 2022 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
 *
 */
/* eslint-disable sort-keys */
/**
 * XState Actors:
 *  @see https://xstate.js.org/docs/guides/actors.html#actor-api
 */

import {
  actions,
  AnyEventObject,
  SCXML,
  ActorRef,
  Interpreter,
  GuardMeta,
  State,
  EventObject,
}                     from 'xstate'

import {
  states,
  events,
}                   from './duck/mod.js'

import { isMailboxType }              from './is-mailbox-type.js'
import { MAILBOX_TARGET_MACHINE_ID }  from './constants.js'

const metaSymKey = Symbol('meta')

/**
 *
 * Huan(202112): The Actor Model here need to be improved.
 *  @see https://github.com/wechaty/bot5-assistant/issues/4
 *
 */
interface AnyEventObjectMeta {
  [metaSymKey]: {
    origin: SCXML.Event<AnyEventObject>['origin']
  }
}
type AnyEventObjectExt = AnyEventObject & AnyEventObjectMeta

interface Context {
  /**
   * current message: only the received events which should sent to child, is a `message`
   *
   * current message: actor module must only process one message one time
   *  a message will only start to be processed (send to the child)
   *  when the child is ready for processing the next message (in its idle state)
   */
  message?: AnyEventObjectExt
  /**
   * message queue: `queue` is for storing messages.
   *
   * a message is an event: (external events, which should be proxyed to the child)
   *  1. neither sent from mailbox
   *  2. nor from child
   *
   * TODO: Huan(202201): use yocto-queue to replace the array for better performance under high load
   */
  queue: AnyEventObjectExt[]
  index: number // current message index in queue
}

/**
 * use JSON.parse() to prevent the initial context from being changed
 */
function initialContext (): Context {
  const context: Context = {
    message  : undefined,
    queue    : [],
    index    : 0,
  }
  return JSON.parse(
    JSON.stringify(
      context,
    ),
  )
}

/**
 * Get the `origin` (session id of the xstate machine) from the event's `metaSymKey`
 *  we use it as the `address` of the Mailbox.
 */
const metaOrigin = (event?: null | AnyEventObjectExt) => (event && event[metaSymKey].origin) || ''

/**
 * Wrap an event by adding `metaSymKey` to the event with value `origin` to store the session id of the xstate machine
 */
const wrapEvent = (event: AnyEventObject, origin?: string) => {
  const wrappedEvent = ({
    ...event,
    [metaSymKey]: {
      origin,
    },
  })
  // console.info(`wrapEvent: ${wrappedEvent.type}@${metaOrigin(wrappedEvent)}`)
  return wrappedEvent
}

/**
 * Remove the `metaSymKey` from a wrapped event
 */
const unwrapEvent = (e: AnyEventObjectExt): AnyEventObject => {
  const wrappedEvent = {
    ...e,
  }
  // console.info(`unwrapEvent: ${wrappedEvent.type}@${metaOrigin(wrappedEvent)}`)

  delete (wrappedEvent as any)[metaSymKey]
  return wrappedEvent
}

/*********************
 *
 * Utils
 *
 *********************/

/**
 * Get session id by child id (with currying) from children
 */
const childSessionIdOf = (childId: string) => (children?: Record<string, ActorRef<any, any>>) => {
  if (!children) {
    return undefined
  }

  const child = children[childId] as undefined | Interpreter<any>
  if (!child) {
    throw new Error('can not found child id ' + childId)
  }

  if (!child.sessionId) {
    /**
     * Huan(202112):
     *
     * When we are not using the interpreter, we can not get the sessionId
     * for example, we are usint the `machine.transition(event)`
     */
    // console.error(new Error('can not found child sessionId from ' + CHILD_MACHINE_ID))
    return undefined
  }

  return child.sessionId
}

/**
 * Get snapshot by child id (with currying) from state
 */
const childSnapshotOf = (childId: string) => (state: State<Context, EventObject, any, any>) => {
  const child = state.children[childId]
  if (!child) {
    throw new Error('can not found child id ' + childId)
  }

  return child.getSnapshot()
}

/**
 * Check condition of whether an event is sent from the session/child id (with currying)
 */
const condEventSentFrom = (id: string) =>
  (meta: GuardMeta<any, AnyEventObject>): boolean => !!(meta._event.origin) && (
    /**
     * 1. `source` as `sessionId` (origin)
     */
    meta._event.origin === id
    /**
     * 2. `source` as `childId`
     */
    || meta._event.origin === childSessionIdOf(id)(meta.state.children)
  )

/**
 * Check condition of whether an event can be accepted by the child id (with currying)
 */
const condEventCanBeAcceptedByChildOf = (childId = MAILBOX_TARGET_MACHINE_ID) =>
  (state: State<any, EventObject, any, any>, event: string) =>
    !!childSnapshotOf(childId)(state).can(event)

/**
 * Send an event to the current processing message of the Mailbox.
 *
 *  send the CHILD_RESPONSE.payload.message to the child message origin
 */
const sendChildReply = (machineName: string) => actions.choose<Context, ReturnType<typeof events.CHILD_REPLY>>([
  {
    /**
     * I. validate the event, make it as the reply of actor if it valid
     */
    cond: (ctx, _, { _event, state }) =>
      // 1. current event is sent from CHILD_MACHINE_ID
      (!!_event.origin && _event.origin === childSessionIdOf(MAILBOX_TARGET_MACHINE_ID)(state.children))
      // 2. the message has valid origin for which we are going to reply to
      && !!childMessageOrigin(ctx),
    actions: [
      actions.log((ctx, e) => `contexts.sendChildReply [${e.payload.message.type}] to [${childMessage(ctx)?.type}]@${childMessageOrigin(ctx)}`, machineName),
      actions.send(
        (_, e) => e.payload.message,
        { to: ctx => childMessageOrigin(ctx)! },
      ),
    ],
  },
  /**
   * II. send invalid event to Dead Letter Queue (DLQ)
   */
  {
    actions: [
      actions.log((_, e, { _event }) => `contexts.sendChildReply dead letter [${e.payload.message.type}]@${_event.origin || ''}`, machineName),
      actions.send((_, e, { _event }) => events.DEAD_LETTER(
        e.payload.message,
        `message ${e.payload.message.type}@${_event.origin || ''} dropped`,
      )),
    ],
  },
]) as any

/**************************
 *
 * sub state of: queue
 *
 **************************/

/**
 * wrap an event as a message and enqueue it to ctx.queue as a new message
 */
const assignEnqueue = actions.assign<Context, AnyEventObject>({
  queue: (ctx, e, { _event }) => [
    ...ctx.queue,
    wrapEvent(e, _event.origin),
  ],
})

/**
 * dequeue ctx.queue by updating the index by increasing 1 (current message pointer move forward)
 */
const assignDequeue = actions.assign<Context>({
  // message: ctx => ctx.queue.shift()!,
  index: ctx => ctx.index + 1,
}) as any

/**
 * Reset the queue and index
 */
const assignEmptyQueue = actions.assign<Context>({
  queue: _ => [],
  index: _ => 0,
}) as any

const queueSize          = (ctx: Context) => ctx.queue.length - ctx.index
const queueMessage       = (ctx: Context) => ctx.queue[ctx.index]
const queueMessageType   = (ctx: Context) => ctx.queue[ctx.index]?.type

/**
 * `origin` is the session id of the child machine
 *  we use it as the `address` of the Mailbox.
 */
const queueMessageOrigin = (ctx: Context) => metaOrigin(queueMessage(ctx))

const queueAcceptingMessageWithCapacity = (machineName: string) => (capacity = Infinity) => actions.choose<Context, AnyEventObject>([
  {
    // 1. Mailbox.Types.* is system messages, skip them
    cond: (_, e) => isMailboxType(e.type),
    actions: [],  // skip
  },
  {
    // 2. Child events (origin from child machine) are handled by child machine, skip them
    cond: (_, __, meta) => condEventSentFrom(MAILBOX_TARGET_MACHINE_ID)(meta),
    actions: [],  // skip
  },
  {
    /**
     * 3. If the child is idle, add the incoming message to queue by wrapping the `_event.origin` meta data
     */
    cond: (_, __, { state }) => state.matches({ child: states.idle }),
    actions: [
      actions.log((_, e, { _event }) => `contexts.queueAcceptingMessageWithCapacity(${capacity}) queue [${e.type}]@${_event.origin || ''} for child(idle)`, machineName),
      assignEnqueue,  // <- wrapping `_event.origin` inside
      actions.send((_, e) => events.NEW_MESSAGE(e.type)),
    ],
  },
  /**
   *
   * Child is **BUSY**
   *
   */
  {
    /**
     * 4. Forward to child when the child can accept this new arrived event even it's busy
     *    for prevent deaadlock when child actor want to receive events at BUSY state.
     */
    cond: (_, e, { state }) => condEventCanBeAcceptedByChildOf(MAILBOX_TARGET_MACHINE_ID)(state, e.type),
    actions: [
      actions.log((_, e) => `contexts.queueAcceptingMessageWithCapacity(${capacity}) forward [${e.type}](acceptable) to child(busy)`, machineName),
      actions.forwardTo(MAILBOX_TARGET_MACHINE_ID), // <- keep the original of event by forwarding(`forwardTo`, instead of `send`) it
    ],
  },
  {
    /**
     * 5. Bounded mailbox: out of capicity, send them to Dead Letter Queue (DLQ)
     */
    cond: ctx => queueSize(ctx) > capacity,
    actions: [
      actions.log((ctx, e, { _event }) => `contexts.queueAcceptingMessageWithCapacity(${capacity}) dead letter [${e.type}]@${_event.origin || ''} because queueSize(${queueSize(ctx)}) > capacity(${capacity}): child(busy) out of capacity`, machineName),
      actions.send((ctx, e) => events.DEAD_LETTER(e, `queueSize(${queueSize(ctx)} out of capacity(${capacity})`)),
    ],
  },
  {
    /**
     * 6. Add incoming message to queue by wrapping the `_event.origin` meta data
     */
    actions: [
      actions.log((_, e, { _event }) => `contexts.queueAcceptingMessageWithCapacity(${capacity}) queue [${e.type}]@${_event.origin || ''} to child(busy)`, machineName),
      assignEnqueue,  // <- wrapping `_event.origin` inside
      actions.send((_, e) => events.NEW_MESSAGE(e.type)),
    ],
  },

]) as any

/**************************
 *
 * substate of: Child
 *
 *************************/

/**
 * The current message(event) that is being processed by the Mailbox system
 */
const childMessage = (ctx: Context) => ctx.message
/**
 * The origin (machine session, mailbox address) of the current message(event)
 */
const childMessageOrigin = (ctx: Context) => metaOrigin(childMessage(ctx))
/**
 * The type of the current message(event)
 */
const childMessageType = (ctx: Context) => childMessage(ctx)?.type

/**
 * Save the message(event) in DEQUEUE event to ctx.message
 */
const assignChildMessage = actions.assign<Context, ReturnType<typeof events.DEQUEUE>>({
  message: (_, e) => e.payload.message,
})

/**
 * Send ctx.message (current message) to child
 */
const sendChildMessage = actions.send<Context, any>(
  ctx => childMessage(ctx)!,
  { to: MAILBOX_TARGET_MACHINE_ID },
) as any

/**************
 *
 * exports
 *
 **************/
export {
  type Context,
  type AnyEventObjectExt,
  metaSymKey,
  initialContext,
  metaOrigin,
  unwrapEvent,
  /**
   * actions.assign<Context>({...})
   */
  assignEnqueue,
  assignDequeue,
  assignEmptyQueue,
  assignChildMessage,
  /**
   * actions.send(...)
   */
  sendChildMessage,
  sendChildReply,
  /**
   * ctx.message helpers
   */
  childMessage,
  childMessageOrigin,
  childMessageType,
  /**
   * ctx.queue helpers
   */
  queueSize,
  queueMessage,
  queueMessageType,
  queueMessageOrigin,
  queueAcceptingMessageWithCapacity,
  /**
   * cond: ...
   */
  condEventSentFrom,
  condEventCanBeAcceptedByChildOf,
}
