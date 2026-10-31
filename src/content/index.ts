// Article content for topic pages, keyed by route path. Each component receives the visualizer so it can place
// it under its "Try it" heading. Only the prerender (and `npm run dev`) imports these; the browser bundle doesn't.
import type { ReactNode } from "react";
import CallStack from "./call-stack";
import Closures from "./closures";
import EventLoop from "./event-loop";
import ExecutionContext from "./execution-context";
import Microtasks from "./microtasks-macrotasks";
import Promises from "./promises";

export const CONTENT: Record<string, (p: { viz: ReactNode }) => ReactNode> = {
  "/javascript-execution-context": ExecutionContext,
  "/javascript-call-stack": CallStack,
  "/javascript-event-loop": EventLoop,
  "/javascript-microtasks-macrotasks": Microtasks,
  "/javascript-promises": Promises,
  "/javascript-closures": Closures,
};
