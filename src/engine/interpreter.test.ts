import { describe, it, expect } from "vitest";
import { trace, SAMPLES } from "./index";
const out = (src: string) => {
  const r = trace(src);
  return { err: r.err, out: r.steps.at(-1)?.out ?? [] };
};
describe("event loop ordering", () => {
  const expected: Record<string, string[]> = {
    "async/await order": ["A", "B", "E", "C", "D"],
    "setTimeout vs promise": ["start", "end", "promise", "timeout"],
    "var vs let in a loop": [
      "var 3",
      "var 3",
      "var 3",
      "let 0",
      "let 1",
      "let 2",
    ],
    "async error handling": [
      "after main",
      "got user1",
      "caught bad id",
      "done",
    ],
  };
  Object.entries(expected).forEach(([name, want]) =>
    it("sample: " + name, () =>
      expect(out(SAMPLES.find((s) => s[0] === name)![1]).out).toEqual(want),
    ),
  );
  it("promise returned from then costs extra ticks", () =>
    expect(
      out(`
Promise.resolve().then(() => { console.log(1); return Promise.resolve(); }).then(() => console.log(2));
Promise.resolve().then(() => console.log("a")).then(() => console.log("b")).then(() => console.log("c")).then(() => console.log("d"));`)
        .out,
    ).toEqual(["1", "a", "b", "c", "2", "d"]));
  it("timers fire by due time, then insertion order", () =>
    expect(
      out(
        `setTimeout(()=>console.log("b"),20);setTimeout(()=>console.log("a"),10);setTimeout(()=>console.log("c"),10);`,
      ).out,
    ).toEqual(["a", "c", "b"]));
  it("microtasks queued by tasks run before the next task", () =>
    expect(
      out(
        `setTimeout(()=>{console.log("t1");Promise.resolve().then(()=>console.log("m"))},0);setTimeout(()=>console.log("t2"),0);`,
      ).out,
    ).toEqual(["t1", "m", "t2"]));
});
describe("guards", () => {
  it("rejects unsupported syntax with a line number", () =>
    expect(trace("switch (1) {}").err).toMatch(/SwitchStatement.*line 1/));
  it("stops runaway loops", () =>
    expect(trace("while(true){}").err).toMatch(/infinite loop/));
  it("reports syntax errors", () =>
    expect(trace("let = ;").err).toMatch(/Syntax error/));
  it("const reassignment throws a catchable TypeError", () =>
    expect(
      out("try{const a=1;a=2}catch(e){console.log(e.message)}").out,
    ).toEqual(["Assignment to constant variable."]));
});
