import type { ReactNode } from "react";
import Link, { Code, sampleCode as sample } from "./Link";

export default function Closures({ viz }: { viz: ReactNode }) {
  return (
    <article className="prose">
      <p className="answer">
        A <strong>closure</strong> is a function together with the variables
        from the place where it was created. The function keeps access to those
        variables even after the outer function has returned. Every JavaScript
        function is a closure; it only becomes visible when a function is used
        outside the place it was written.
      </p>

      <h2>Try it</h2>
      <p>
        This counter remembers its count between calls. Press{" "}
        <strong>Next step</strong> and watch the{" "}
        <strong>Scope and variables</strong> panel: when <code>next()</code>{" "}
        runs, it still sees <code>makeCounter</code>&apos;s <code>count</code>,
        although <code>makeCounter</code> has finished.
      </p>
      {viz}

      <h2>Step by step: what the example does</h2>
      <Code>{sample("Closures")}</Code>
      <ol>
        <li>
          <code>makeCounter()</code> runs and creates a local variable{" "}
          <code>count = 0</code>.
        </li>
        <li>
          It returns the inner function without calling it. That function was
          created inside <code>makeCounter</code>, so it keeps a link to{" "}
          <code>makeCounter</code>&apos;s variables.
        </li>
        <li>
          <code>makeCounter</code>&apos;s frame leaves the call stack, but{" "}
          <code>count</code> is not thrown away: the returned function still
          refers to it.
        </li>
        <li>
          Each <code>next()</code> call adds 1 to that same <code>count</code>,
          so the output is <samp>1</samp>, then <samp>2</samp>.
        </li>
        <li>
          <code>makeCounter()</code> is called again for <code>other</code>.
          This creates a brand-new <code>count</code>, so <code>other()</code>{" "}
          prints <samp>1</samp>. The two counters never share a variable.
        </li>
      </ol>

      <h2>Lexical scope: where a function is written matters</h2>
      <p>
        JavaScript decides which variables a function can see from where the
        function is <em>written</em> in the code, not from where it is called.
        This is called lexical scope. When a function looks up a name, it checks
        its own variables first, then the scope it was created in, then that
        scope&apos;s parent, up to the global scope. A closure is simply that
        chain of scopes staying available for as long as the function exists.
        The{" "}
        <Link to="/javascript-execution-context">execution context page</Link>{" "}
        explains how these scopes are created.
      </p>

      <h2>Each call creates a new set of variables</h2>
      <p>
        Calling the outer function again doesn&apos;t reuse the old variables;
        it makes new ones. That is what makes closures useful for private state:
        nothing outside the counter can read or change <code>count</code> except
        through the function that closes over it.
      </p>
      <Code>{`function once(fn) {
  let done = false;
  return function (...args) {
    if (done) return;
    done = true;
    return fn(...args);
  };
}

const init = once(() => console.log("set up"));
init(); // set up
init(); // (nothing)`}</Code>
      <p>
        Here every function made by <code>once</code> gets its own{" "}
        <code>done</code> flag. Event handlers, timer callbacks and promise
        callbacks use closures in the same way to remember values from the code
        that created them.
      </p>

      <h2>The classic loop bug: var vs let</h2>
      <Code>{sample("var vs let in a loop")}</Code>
      <p>
        This prints <samp>var 3</samp> three times, then <samp>let 0</samp>,{" "}
        <samp>let 1</samp>, <samp>let 2</samp>. A <code>var</code> variable
        belongs to the whole function (or script), so all three callbacks close
        over the <em>same</em> <code>i</code>, and by the time the timers run,
        the loop has already set it to 3. A <code>let</code> in a{" "}
        <code>for</code> loop gets a fresh copy for every round, so each
        callback remembers its own <code>j</code>. To step through it, choose{" "}
        <strong>var vs let in a loop</strong> in the example menu above.
      </p>

      <h2>Closures and memory</h2>
      <p>
        Variables that a closure uses stay in memory for as long as the closure
        can still be called. That is usually what you want. It only becomes a
        problem when a long-lived function, such as an event listener that is
        never removed, keeps large data alive by accident. Removing the
        listener, or not referring to the data inside it, lets the engine free
        it.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>Expecting a closure to copy a value.</strong> It keeps the
          variable itself, so it sees later changes, as in the <code>var</code>{" "}
          loop.
        </li>
        <li>
          <strong>Thinking closures need special syntax.</strong> Any function
          that uses a variable from an outer scope is a closure.
        </li>
        <li>
          <strong>Assuming two calls share state.</strong> Each call of the
          outer function makes its own variables, like the two counters above.
        </li>
      </ul>

      <h2>What LoopLens simulates</h2>
      <p>
        Scopes and closures are real in LoopLens: its interpreter creates a new
        scope for every call and keeps it alive while a function refers to it,
        exactly as described here. The Scope panel lists the scopes the current
        code can see, innermost first. The{" "}
        <Link to="/javascript-call-stack">call stack</Link>, queues and clock
        are simulated.
      </p>
    </article>
  );
}
