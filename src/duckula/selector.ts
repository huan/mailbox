/* eslint-disable no-redeclare */

/**
 * Huan(202204): we have to use override function definition for different `source`
 *
 * The `source` must be seperate for the `Array` and `Object` type
 *  or the typing inference will be incorrect.
 *
 * TODO: merge the source as an union type to reduce the complexity
 */
export function selector <
 TKey extends string,
 TVal extends any,
 TMap extends { [key in TKey]: TVal },
> (source: TMap): TMap

export function selector <
  TKey extends string,
  TVal extends any,
  TMap extends { [key in TKey]: TVal },
  TSelectedKey extends TKey,
> (
  source: readonly [ TMap, readonly TSelectedKey[] ]
): {
  [K in TSelectedKey]: TMap[K]
}

/**
 * Pick the selected key from the source
 *
 * @param source
 * @returns
 */
export function selector <
  TKey extends string,
  TVal extends any,
  TMap extends { [key in TKey]: TVal },
  TSelectedKey extends TKey,
> (
  source: TMap | [ TMap, TSelectedKey[] ],
) {

  if (!Array.isArray(source)) {
    return source
  }

  const [ map, keys ] = source

  type SelectedMap = { [K in TSelectedKey]: TMap[K] }
  const SelectedMap = keys.reduce(
    (acc, cur) => ({
      ...acc,
      [cur]: map[cur],
    }),
    {},
  ) as SelectedMap

  return SelectedMap
}
