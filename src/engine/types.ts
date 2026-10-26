export interface Step {
  k: string; note: string; line: number;
  stack: string[]; web: string[]; tasks: string[]; micro: string[]; out: string[];
  scope: [string, [string, string][]][]; loop: string; time: number;
}
export interface TraceResult { steps: Step[]; err?: string }
