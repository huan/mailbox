import * as origin        from './origin.js'
import type { Context }   from './context.js'

/**
 * The current message(event) that is being processed by the Mailbox system
 */
export const message = (ctx: Context) => ctx.message

/**
 * The origin (machine session, mailbox address) of the current message(event)
 *  1. `origin` is the session id of the child machine
 *  2. we use it as the `address` of the Mailbox.
 */
export const address = (ctx: Context) => origin.metaOrigin(message(ctx))

/**
 * The type of the current message(event)
 */
export const type = (ctx: Context) => message(ctx)?.type
