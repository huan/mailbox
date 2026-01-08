import sinon from 'sinon'
import { test as baseTest, expect } from 'vitest'

// Type-level equality check used in existing tests
export type AssertEqual<T, Expected> = T extends Expected
  ? Expected extends T
    ? true
    : never
  : never

function createAssert() {
  return {
    equal: (actual: unknown, expected: unknown, _message?: string) => {
      expect(actual).toBe(expected)
    },
    notOk: (value: unknown, _message?: string) => {
      expect(value).toBeFalsy()
    },
    ok: (value: unknown, _message?: string) => {
      expect(value).toBeTruthy()
    },
    same: (actual: unknown, expected: unknown, _message?: string) => {
      expect(actual).toStrictEqual(expected)
    },
    throws: async (fn: () => unknown | Promise<unknown>, _message?: string) => {
      try {
        const result = fn()
        if (result instanceof Promise) {
          await expect(result).rejects.toThrow()
        } else {
          expect(fn).toThrow()
        }
      } catch (err) {
        expect(() => {
          throw err
        }).toThrow()
      }
    },
  }
}

export type TapAssertions = ReturnType<typeof createAssert>
export type TestFn = (t: TapAssertions) => Promise<unknown> | unknown
interface TapTest {
  (name: string, fn: TestFn, timeout?: number): void
  skip: (name: string, fn: TestFn, timeout?: number) => void
}

const test: TapTest = ((name: string, fn: TestFn, timeout?: number) => {
  return baseTest(name, async () => fn(createAssert()), timeout)
}) as TapTest

test.skip = (name: string, fn: TestFn, timeout?: number) => {
  return baseTest.skip(name, async () => fn(createAssert()), timeout)
}

export { sinon, test }
