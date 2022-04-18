/* eslint-disable sort-keys */
/* eslint-disable no-redeclare */
import {
  ActionCreator,
  ActionCreatorTypeMetadata,
  getType,
}                               from 'typesafe-actions'
import type { Optional }        from 'utility-types'

import type {
  DuckularizeOptions,
  DuckularizeOptionsArray,
  DuckularizeOptionsObject,
}                                     from './duckularize-options.js'
import { selector }                   from './selector.js'
import type * as D                    from './duckula.js'

/**
 * Huan(202204): we have to use override function definition for different `options`
 *
 * The `options` must be seperate for the `Array` and `Object` type
 *  or the typing inference will be incorrect.
 *
 * TODO: merge the options as an union type to reduce the complexity
 */
export function duckularize <
  TID extends string,

  TType extends string,
  TEventKey extends string,
  TEvent extends D.Event<TEventKey, TType>,

  TStateKey extends string,
  TStateVal extends string,
  TState extends D.State<TStateKey, TStateVal>,

  TContext extends {},
> (
  options: DuckularizeOptionsArray<TID, TType, TEventKey, TEvent, TStateKey, TStateVal, TState, TContext>,
): Optional<
  D.Duckula<
    TID,
    { [K in TEventKey]: TEvent[K] },
    { [K in TStateKey]: TState[K] },
    { [K in TEventKey]: TEvent[K] extends ActionCreator<infer TType> & ActionCreatorTypeMetadata<infer TType> ? TType : never },
    TContext
  >,
  'machine'
>

export function duckularize <
  TID extends string,

  TType extends string,
  TEventKey extends string,
  TEvent extends D.Event<TEventKey, TType>,

  TStateKey extends string,
  TStateVal extends string,
  TState extends D.State<TStateKey, TStateVal>,

  TContext extends {},
> (
  options: DuckularizeOptionsObject<TID, TType, TEventKey, TEvent, TStateKey, TStateVal, TState, TContext>,
): Optional<
  D.Duckula<
    TID,
    TEvent,
    TState,
    { [K in keyof TEvent]: TEvent[K] extends ActionCreator<infer TType> & ActionCreatorTypeMetadata<infer TType> ? TType : never },
    TContext
  >,
  'machine'
>

export function duckularize <
  TID extends string,

  TType extends string,
  TEventKey extends string,
  TEvent extends D.Event<TEventKey, TType>,

  TStateKey extends string,
  TStateVal extends string,
  TState extends D.State<TStateKey, TStateVal>,

  TContext extends {},
> (
  options: DuckularizeOptions<TID, TType, TEventKey, TEvent, TStateKey, TStateVal, TState, TContext>,
): Optional<
  D.Duckula<
    TID,
    { [K in TEventKey]: TEvent[K] },
    { [K in TStateKey]: TState[K] },
    { [K in TEventKey]: TEvent[K] extends ActionCreator<infer TType> & ActionCreatorTypeMetadata<infer TType> ? TType : never },
    TContext
  >,
  'machine'
> {
  /**
   * Huan(202204) make TypeScript overload happy for `selector()`
   * TODO: how to fix it? (make it clean by removing the "isArray ? : " condition)
   */
  const State = Array.isArray(options.states) ? selector(options.states) : selector(options.states)
  const Event = Array.isArray(options.events) ? selector(options.events) : selector(options.events)

  /**
   * Type
   */
  type Type = { [K in keyof typeof Event]: typeof Event[K] extends ActionCreator<infer TType> & ActionCreatorTypeMetadata<infer TType> ? TType : never }
  const Type = Object.keys(Event).reduce(
    (acc, cur) => ({
      ...acc,
      [cur]: getType(Event[cur as keyof typeof Event]),
    }),
    {},
  ) as Type

  /**
   * Huan(202204): do we need JSON parse/stringify
   *  to make sure the initial context is always unmutable?
   */
  const initialContext: () => typeof options.initialContext
    = () => JSON.parse(
      JSON.stringify(
        options.initialContext,
      ),
    )

  const duckula = {
    ID: options.id,
    Event,
    State,
    Type,
    initialContext,
  }

  return duckula
}
