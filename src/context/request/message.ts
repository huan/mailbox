import type { Context }   from '../context.js'

/**
 * The current message(event) that is being processed by the Mailbox system
 */
export const message = (ctx: Context) => ctx.message
