import * as types from '../duck/types.js'

/**
 * The default mailbox consists of two queues of messages: system messages and user messages.
 *
 * The system messages are used internally by the Actor Context to suspend and resume mailbox processing in case of failure.
 *  System messages are also used by internally to manage the Actor,
 *  e.g. starting, stopping and restarting it.
 *
 * User messages are sent to the actual Actor.
 *
 * @link https://proto.actor/docs/mailboxes/
 */
export const isMailboxType = (type?: null | string): boolean => !!type && Object.values<string>(types).includes(type)
