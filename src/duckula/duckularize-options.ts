import type * as duckula    from './duckula.js'

export interface DuckularizeOptionsArray <
  TID extends string,

  TType extends string,
  TEventKey extends string,
  TEvent extends duckula.Event<TEventKey, TType>,

  TStateKey extends string,
  TStateVal extends string,
  TState extends duckula.State<TStateKey, TStateVal>,

  TContext extends {},
> {
  id: TID
  events: [
    TEvent,
    TEventKey[],
  ]
  states: [
    TState,
    TStateKey[],
  ]
  initialContext: TContext
}

export interface DuckularizeOptionsObject <
  TID extends string,

  TType extends string,
  TEventKey extends string,
  TEvent extends duckula.Event<TEventKey, TType>,

  TStateKey extends string,
  TStateVal extends string,
  TState extends duckula.State<TStateKey, TStateVal>,

  TContext extends {},
> {
  id: TID
  events: TEvent
  states: TState
  initialContext: TContext
}

export type DuckularizeOptions<
  TID extends string,

  TType extends string,
  TEventKey extends string,
  TEvent extends duckula.Event<TEventKey, TType>,

  TStateKey extends string,
  TStateVal extends string,
  TState extends duckula.State<TStateKey, TStateVal>,

  TContext extends {},
> =
  | DuckularizeOptionsObject<TID, TType, TEventKey, TEvent, TStateKey, TStateVal, TState, TContext>
  | DuckularizeOptionsArray<TID, TType, TEventKey, TEvent, TStateKey, TStateVal, TState, TContext>
