import * as origin        from '../origin/mod.js'
import type { Context }   from '../context.js'

import { message } from './message.js'

/**
 * The origin (machine session, mailbox address) of the current message(event)
 *  1. `origin` is the session id of the child machine
 *  2. we use it as the `address` of the Mailbox.
 */
export const address = (ctx: Context) => origin.metaOrigin(message(ctx))
