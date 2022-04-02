import * as Mailbox       from 'mailbox'
import { createMachine }  from 'xstate'
import assert             from 'assert'

async function main () {
  const machine = createMachine({})
  const mailbox = Mailbox.from(machine)

  mailbox.open()
  assert.ok(mailbox.address, 'should get address from mailbox')

  assert.notEqual(Mailbox.VERSION, '0.0.0', 'version must be updated instead of 0.0.0 before publish!')

  console.log(`Mailbox v${Mailbox.VERSION} smoke testing passed!`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
