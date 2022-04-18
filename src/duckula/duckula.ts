import type {
  ActionCreator,
  ActionCreatorTypeMetadata,
}                                 from 'typesafe-actions'
import type { AnyStateMachine }   from 'xstate'

export type Type <K extends string, V extends string> = {
  [key in K]: V
}

export type State <K extends string, V extends string> = {
  [key in K]: V
}

export type Event <K extends string, TType extends string> = {
  [key in K]: ActionCreator<TType> & ActionCreatorTypeMetadata<TType>
}

export interface Duckula <
  TID extends string = string,

  TEvent extends Event<string, string> = Event<string, string>,
  TState extends State<string, string> = State<string, string>,
  TType  extends Type<string, string> = Type<string, string>,

  TContext extends {} = {},
  TMachine extends AnyStateMachine = AnyStateMachine,
> {
  ID: TID
  Type: TType
  Event: TEvent
  State: TState
  machine: TMachine
  initialContext: () => TContext
}
