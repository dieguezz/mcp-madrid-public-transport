// Re-export fp-ts Option with convenience functions
import * as O from 'fp-ts/lib/Option.js';

export type Option<A> = O.Option<A>;
export const some = O.some;
export const none = O.none;
export const isSome = O.isSome;
export const isNone = O.isNone;
export const map = O.map;
export const chain = O.chain;
export const fold = O.fold;
export const getOrElse = O.getOrElse;

// Additional utility functions
export const fromNullable = <A>(a: A | null | undefined): O.Option<A> =>
  a == null ? O.none : O.some(a);

export const fromPredicate = <A>(predicate: (a: A) => boolean) => (a: A): O.Option<A> =>
  predicate(a) ? O.some(a) : O.none;

export const tryCatch = <A>(f: () => A): O.Option<A> => {
  try {
    return O.some(f());
  } catch {
    return O.none;
  }
};

// Convert Option to Either
import { left as eitherLeft, right as eitherRight } from 'fp-ts/lib/Either.js';

export const toEither = <E, A>(onNone: () => E) => (opt: O.Option<A>): import('fp-ts/lib/Either.js').Either<E, A> => {
  if (O.isNone(opt)) {
    return eitherLeft(onNone());
  }
  return eitherRight(opt.value);
};
