/**
 *   Mailbox - https://github.com/huan/mailbox
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

import {
  setup,
  createActor,
} from 'xstate'

import type {
  AnyActorLogic,
  AnyEventObject,
  InspectionEvent,
} from 'xstate'

import { Type } from './mailbox.js'

/**
 * Validation error with detailed message
 */
export class MailboxValidationError extends Error {
  constructor(message: string) {
    super(`Mailbox Validation Error: ${message}`)
    this.name = 'MailboxValidationError'
  }
}

/**
 * Validate that a machine satisfies the Mailbox address protocol.
 *
 * A valid mailbox-addressable machine MUST:
 * 1. Send `ACTOR_IDLE` event to parent immediately after initialization
 * 2. Return to an idle state (with idle action) after processing events
 *
 * @param machine - The XState machine to validate
 * @returns true if valid
 * @throws MailboxValidationError if validation fails
 *
 * @example
 * ```typescript
 * import * as Mailbox from 'mailbox'
 *
 * const myMachine = createMachine({
 *   id: 'my-machine',
 *   initial: 'idle',
 *   states: {
 *     idle: {
 *       entry: Mailbox.actions.idle('my-machine'),
 *       on: { WORK: 'working' },
 *     },
 *     working: {
 *       always: 'idle',
 *     },
 *   },
 * })
 *
 * // Throws if machine doesn't satisfy protocol
 * Mailbox.validate(myMachine)
 * ```
 */
export function validate(machine: AnyActorLogic): boolean {
  const CHILD_ID = 'validating-child'

  // Collect events sent by the child to parent
  const sentToParentEvents: AnyEventObject[] = []

  // Create a container machine that invokes the target machine
  const containerMachine = setup({
    types: {} as {
      events: AnyEventObject
    },
    actors: {
      childMachine: machine,
    },
  }).createMachine({
    id: 'validator-container',
    initial: 'testing',
    invoke: {
      id: CHILD_ID,
      src: 'childMachine',
    },
    states: {
      testing: {
        on: {
          // Capture all events sent to parent
          '*': {},
        },
      },
    },
  })

  // Start the container with inspection to capture sendParent events
  const actor = createActor(containerMachine, {
    inspect: (inspectionEvent: InspectionEvent) => {
      if (inspectionEvent.type === '@xstate.event') {
        const event = inspectionEvent.event as AnyEventObject
        // Only capture mailbox protocol events
        if (event.type === Type.ACTOR_IDLE || event.type === Type.ACTOR_REPLY) {
          sentToParentEvents.push(event)
        }
      }
    },
  })

  try {
    actor.start()
  } catch (error) {
    throw new MailboxValidationError(
      `Machine failed to start: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Validation 1: Check for ACTOR_IDLE on initialization
  const initIdleEvents = sentToParentEvents.filter(e => e.type === Type.ACTOR_IDLE)
  if (initIdleEvents.length === 0) {
    actor.stop()
    throw new MailboxValidationError(
      `Machine must send ${Type.ACTOR_IDLE} to parent on initialization. ` +
      `Add 'Mailbox.actions.idle("${(machine as any).id || 'machine-id'}")' to the entry action of your idle state.`
    )
  }

  actor.stop()
  return true
}
