// Re-export fp-ts Either with convenience functions
export { Either, left, right, isLeft, isRight } from 'fp-ts/lib/Either.js';
export { map, chain, fold, getOrElse } from 'fp-ts/lib/Either.js';
import * as E from 'fp-ts/lib/Either.js';

// Additional utility functions
export const fromNullable = <E, A>(e: E) => (a: A | null | undefined): E.Either<E, A> =>
  a == null ? E.left(e) : E.right(a);

export const tryCatch = <E, A>(f: () => A, onError: (error: unknown) => E): E.Either<E, A> => {
  try {
    return E.right(f());
  } catch (error) {
    return E.left(onError(error));
  }
};

export const tryCatchAsync = async <E, A>(
  f: () => Promise<A>,
  onError: (error: unknown) => E
): Promise<E.Either<E, A>> => {
  try {
    const result = await f();
    return E.right(result);
  } catch (error) {
    return E.left(onError(error));
  }
};

// Convenience type for Either with Error on the left
export type Result<A> = E.Either<Error, A>;

export const ok = <A>(value: A): Result<A> => E.right(value);
export const err = (error: Error): Result<never> => E.left(error);
export const errMsg = (message: string): Result<never> => E.left(new Error(message));
