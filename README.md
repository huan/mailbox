# Mailbox

XState v5 Actor Mailbox - Queue and process messages sequentially for XState machines.

[![NPM Version](https://badge.fury.io/js/mailbox.svg)](https://www.npmjs.com/package/mailbox)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![ES Modules](https://img.shields.io/badge/ES-Modules-brightgreen)](https://github.com/Chatie/tsconfig/issues/16)

## Overview

Mailbox implements the Actor Mailbox pattern on top of XState v5:

- Incoming messages are **queued** and processed **one at a time**
- Child machine signals readiness via `Mailbox.actions.idle()` to receive next message
- Supports **reply** actions to send responses back to message senders
- Handles **dead letters** when mailbox capacity is exceeded

## Installation

```bash
npm install mailbox xstate
```

**Requirements:** Node.js >= 18, XState >= 5.0.0

## Quick Start

```typescript
import * as Mailbox from 'mailbox'
import { createMachine, assign } from 'xstate'

// Create a machine that processes work one item at a time
const workerMachine = createMachine({
  id: 'worker',
  initial: 'idle',
  context: { result: null },
  states: {
    idle: {
      // RULE 1: Signal readiness in idle state
      entry: Mailbox.actions.idle('worker'),
      on: {
        WORK: 'processing',
      },
    },
    processing: {
      entry: assign({ result: ({ event }) => event.data }),
      after: {
        100: {
          target: 'idle',
          // RULE 2: Reply when done
          actions: Mailbox.actions.reply(
            ({ context }) => ({ type: 'DONE', result: context.result })
          ),
        },
      },
    },
  },
})

// Wrap with mailbox
const mailbox = Mailbox.from(workerMachine)

// Subscribe to replies
mailbox.subscribe({
  next: (event) => console.log('Reply:', event),
})

// Open and send messages
mailbox.open()
mailbox.send({ type: 'WORK', data: 'task1' })
mailbox.send({ type: 'WORK', data: 'task2' })
mailbox.send({ type: 'WORK', data: 'task3' })

// All 3 will be processed sequentially, each receiving a DONE reply
```

## Key Rules

1. **Idle Action**: Your machine MUST call `Mailbox.actions.idle('machine-id')` in the entry action of the state where it's ready to accept messages.

2. **External Transitions**: Use external transitions to re-enter the idle state, triggering the entry action again.

3. **Reply Action**: Use `Mailbox.actions.reply(event)` to send responses back to the message sender.

## API

### `Mailbox.from(machine, options?)`

Wraps an XState machine with mailbox functionality.

```typescript
const mailbox = Mailbox.from(machine, {
  capacity: 100,        // Max queue size (default: Infinity)
  logger: console.log,  // Custom logger
  clock: new SimulatedClock(), // For testing
})
```

### `mailbox.send(event)`

Send an event to the mailbox queue.

### `mailbox.open()` / `mailbox.close()`

Start/stop the mailbox actor.

### `mailbox.subscribe(observer)`

Subscribe to outgoing events (replies).

### `mailbox.address`

Get the mailbox address for external communication.

### Actions

- `Mailbox.actions.idle(id)` - Signal the machine is ready for next message
- `Mailbox.actions.reply(event)` - Reply to the message sender
- `Mailbox.actions.proxy(id)(target)` - Forward events to another mailbox

### Type Guards

- `Mailbox.isMailbox(value)` - Check if value is a Mailbox
- `Mailbox.isAddress(value)` - Check if value is an Address
- `Mailbox.isMailboxType(type)` - Check if event type is internal Mailbox type

### Constants

- `Mailbox.Type` - Internal event types (ACTOR_IDLE, ACTOR_REPLY, DEAD_LETTER)
- `Mailbox.Event` - Event factory functions
- `Mailbox.State` - Mailbox states (Idle, Processing)

### Validation

```typescript
// Validate a machine satisfies the Mailbox protocol
Mailbox.validate(myMachine) // throws MailboxValidationError if invalid
```

### RxJS Observable Support

Mailbox implements the Observable protocol for RxJS interoperability:

```typescript
import { from } from 'rxjs'
import * as Mailbox from 'mailbox'

const mailbox = Mailbox.from(machine)
mailbox.open()

// Use RxJS operators
from(mailbox)
  .pipe(filter(e => e.type === 'DONE'))
  .subscribe(console.log)
```

## Testing

Use `SimulatedClock` for deterministic tests:

```typescript
import * as Mailbox from 'mailbox'

const clock = new Mailbox.SimulatedClock()
const mailbox = Mailbox.from(machine, { clock })

mailbox.open()
mailbox.send({ type: 'WORK' })

// Advance time
clock.increment(100)
await new Promise(r => setTimeout(r, 0))

// Assert results...
```

## The Problem Mailbox Solves

XState machines process events immediately. When multiple events arrive while processing, they can be lost:

```
Customer A: MAKE_COFFEE  → Processing...
Customer B: MAKE_COFFEE  → LOST! (machine is busy)
Customer C: MAKE_COFFEE  → LOST! (machine is busy)
```

With Mailbox, events are queued and processed sequentially:

```
Customer A: MAKE_COFFEE  → Queued → Processing → Done
Customer B: MAKE_COFFEE  → Queued → Processing → Done
Customer C: MAKE_COFFEE  → Queued → Processing → Done
```

## Breaking Changes (v1.0.0)

This version is a complete rewrite for XState v5. Breaking changes from v0.x:

- **Requires XState v5** - No longer compatible with XState v4
- **Removed `duckularize()`** - Use native XState v5 typed events instead
- **Removed `wrap()`** - Use `from()` instead
- **Removed internal context utilities** - XState v5 handles this natively
- **Simplified API** - Cleaner, more focused interface

### Migration from duckularize

Before (v0.x):
```typescript
import { createAction } from 'typesafe-actions'
const Event = { DING: createAction('DING')() }
const duckula = Mailbox.duckularize({ id: 'test', events: Event, ... })
```

After (v1.0):
```typescript
// Use plain objects and XState v5 native typing
const Type = { DING: 'DING' } as const
const Event = { DING: () => ({ type: Type.DING }) as const }
const machine = setup({
  types: { events: {} as { type: 'DING' } }
}).createMachine({ ... })
```

## License

Apache-2.0
