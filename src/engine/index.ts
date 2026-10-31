import { trace as raw } from "./interpreter";
import type { TraceResult } from "./types";
export const trace = (src: string): TraceResult => raw(src);
export { SAMPLES, GROUPS } from "./samples";
export type { Step, TraceResult } from "./types";
