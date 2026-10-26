// Types for the part of Node's vm module that samples.test.ts uses, so the project doesn't need @types/node.
declare module 'node:vm' {
  export function createContext(sandbox: object): object;
  export function runInContext(code: string, context: object): unknown;
  const vm: { createContext: typeof createContext; runInContext: typeof runInContext };
  export default vm;
}
