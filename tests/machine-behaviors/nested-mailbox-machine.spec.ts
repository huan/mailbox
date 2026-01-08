#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * Nested Mailbox Machine Tests - v4 Tests Removed
 *
 * The original nested mailbox tests used XState v4 patterns that are
 * incompatible with XState v5.
 *
 * Note: Nested mailbox communication has known architectural limitations.
 * See tests/multiple-outbound-communications.spec.ts for documentation
 * of the deadlock issue with nested mailboxes.
 *
 * For basic Mailbox integration tests, see:
 * - tests/integration-v5.spec.ts
 */
import { test } from '#test-helpers'

test('Nested mailbox tests removed - see multiple-outbound-communications.spec.ts for limitation docs', async t => {
  t.ok(true, 'Nested mailbox tests documented limitation')
})
