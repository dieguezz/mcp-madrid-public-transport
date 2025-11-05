// Task represents an async computation that cannot fail
export type Task<A> = () => Promise<A>;

export const of = <A>(a: A): Task<A> => () => Promise.resolve(a);

export const map = <A, B>(f: (a: A) => B) => (task: Task<A>): Task<B> =>
  async () => f(await task());

export const chain = <A, B>(f: (a: A) => Task<B>) => (task: Task<A>): Task<B> =>
  async () => {
    const a = await task();
    return f(a)();
  };

export const run = <A>(task: Task<A>): Promise<A> => task();

// TaskEither represents an async computation that can fail
import { left as eitherLeft, right as eitherRight } from 'fp-ts/lib/Either.js';

export type TaskEither<E, A> = () => Promise<import('fp-ts/lib/Either.js').Either<E, A>>;

export const tryCatch = <E, A>(
  f: () => Promise<A>,
  onError: (error: unknown) => E
): TaskEither<E, A> => async () => {
  try {
    const result = await f();
    return eitherRight(result);
  } catch (error) {
    return eitherLeft(onError(error));
  }
};
