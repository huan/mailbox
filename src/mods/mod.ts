/**
 * Mailbox - XState v5 Native Implementation
 *
 * Main module exports for the Mailbox library.
 */

// Core mailbox functionality
export {
  // Main factory function
  from,
  // Type guards
  isMailbox,
  isAddress,
  isMailboxType,
  // Event types and state
  Type,
  Event,
  State,
  // Options and interfaces
  type Mailbox as Interface,
  type MailboxOptions as Options,
  type Address,
  // Actions for child machines
  actions,
  // XState utilities
  SimulatedClock,
  waitFor,
} from '../mailbox.js'

// Version
export { VERSION } from '../version.js'

// Nil/null objects
export * as nil from '../nil.js'

// Validation utility
export {
  validate,
  MailboxValidationError,
} from '../validate.js'
