import { trace as raw, SAMPLES as S } from './interpreter';
import type { TraceResult } from './types';
export const trace = (src: string): TraceResult => raw(src);
export const SAMPLES: [string, string][] = S as [string, string][];
export type { Step, TraceResult } from './types';
