import * as origin        from './origin.js'
import type { Context }   from './context.js'

/**
 * The current message(event) that is being processed by the Mailbox system
 */
export const message = (ctx: Context) => ctx.message

/**
 * The origin (machine session, mailbox address) of the current message(event)
 */
export const messageOrigin = (ctx: Context) => origin.metaOrigin(message(ctx))

/**
 * The type of the current message(event)
 */
export const messageType = (ctx: Context) => message(ctx)?.type
