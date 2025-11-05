// Re-export fp-ts pipe and flow functions
export { pipe, flow, identity, constant } from 'fp-ts/lib/function.js';

// Additional utility: async pipe
export const pipeAsync = async <A, B>(
  value: A | Promise<A>,
  ...fns: Array<(arg: any) => any>
): Promise<B> => {
  let result = await value;
  for (const fn of fns) {
    result = await fn(result);
  }
  return result as B;
};
