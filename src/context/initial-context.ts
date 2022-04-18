import type { Context } from './context.js'

/**
 * use JSON.parse() to prevent the initial context from being changed
 */
export function initialContext (): Context {
  const context: Context = {
    index    : 0,
    message  : undefined,
    queue    : [],
  }
  return JSON.parse(
    JSON.stringify(
      context,
    ),
  )
}
