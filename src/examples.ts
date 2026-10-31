// Extra visualizer examples used only by topic pages (the picker's examples live in src/engine/samples.ts).
// Each one is checked against real JavaScript in examples.test.ts, like the engine's samples.
import { SAMPLES } from "./engine/samples";

export const PAGE_EXAMPLES: [string, string][] = [
  [
    "Hoisting and the TDZ",
    `console.log(greet("Ada"));

function greet(name) {
  const message = "Hello, " + name;
  return message;
}

try {
  console.log(total);
} catch (e) {
  console.log(e.name);
}
let total = 10;
console.log(total);`,
  ],
];

/** Code of an example by name (picker samples first, then page examples); the first sample if not found. */
export const exampleCode = (name?: string): string =>
  [...SAMPLES, ...PAGE_EXAMPLES].find((x) => x[0] === name)?.[1] ??
  SAMPLES[0][1];
