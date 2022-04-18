import * as origin        from './origin.js'
import type { Context }   from './context.js'

/**
 * The current message(event) that is being processed by the Mailbox system
 */
export const childMessage = (ctx: Context) => ctx.message

/**
 * The origin (machine session, mailbox address) of the current message(event)
 */
export const childMessageOrigin = (ctx: Context) => origin.metaOrigin(childMessage(ctx))

/**
 * The type of the current message(event)
 */
export const childMessageType = (ctx: Context) => childMessage(ctx)?.type
