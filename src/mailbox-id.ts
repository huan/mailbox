export const mailboxId = (actorMachineId: string) => `${actorMachineId}<Mailbox>`
export const wrappedId = (actorMachineId: string) => `${mailboxId(actorMachineId)}<Wrapped>`
