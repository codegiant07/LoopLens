import type { ReactNode } from "react";
import Link, { Code, sampleCode as sample } from "./Link";

export default function Promises({ viz }: { viz: ReactNode }) {
  return (
    <article className="prose">
      <p className="answer">
        A <strong>promise</strong> is an object that stands for a value you will
        get later, or an error. It starts <em>pending</em> and settles exactly
        once, either <em>fulfilled</em> with a value or <em>rejected</em> with a
        reason. You react to it with <code>.then</code>, <code>.catch</code> and{" "}
        <code>.finally</code>, and those callbacks always run later, as
        microtasks.
      </p>

      <h2>Try it</h2>
      <p>
        This chain passes a value from one <code>.then</code> to the next. Press{" "}
        <strong>Next step</strong> and notice that <samp>sync</samp> prints
        first, although it is the last line.
      </p>
      {viz}

      <h2>Step by step: what the example does</h2>
      <Code>{sample("Promise chain")}</Code>
      <ol>
        <li>
          <code>Promise.resolve(1)</code> creates a promise that is already
          fulfilled with <code>1</code>.
        </li>
        <li>
          The first <code>.then</code> callback joins the{" "}
          <strong>microtask queue</strong> right away, because its promise is
          settled. It does not run yet. Each <code>.then</code> also returns a
          new promise, which the second <code>.then</code> waits for.
        </li>
        <li>
          <code>console.log("sync")</code> runs and the script finishes.
        </li>
        <li>
          The first callback runs, prints <samp>first 1</samp> and returns{" "}
          <code>2</code>. That fulfills the promise returned by the first{" "}
          <code>.then</code>, so the second callback joins the microtask queue.
        </li>
        <li>
          The second callback runs and prints <samp>second 2</samp>.
        </li>
      </ol>

      <h2>Creating a promise</h2>
      <Code>{`function sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}`}</Code>
      <p>
        The function passed to <code>new Promise</code> (the executor) runs{" "}
        <em>immediately</em> and synchronously. It starts the work, here a
        timer, and calls <code>resolve(value)</code> or{" "}
        <code>reject(reason)</code> when the work is done. Calling either one a
        second time does nothing: a promise settles only once. The{" "}
        <strong>Sleep with a promise</strong> example in the menu above uses
        this function with <code>await</code>.
      </p>

      <h2>Chaining with then</h2>
      <ul>
        <li>
          Every <code>.then</code> returns a <em>new</em> promise, so calls can
          be chained.
        </li>
        <li>
          Whatever a callback returns becomes the value of that new promise and
          is passed to the next <code>.then</code>.
        </li>
        <li>
          If a callback returns another promise, the chain waits for that
          promise to settle before moving on.
        </li>
        <li>
          If a callback throws, the new promise is rejected, and the chain jumps
          to the next <code>.catch</code>.
        </li>
      </ul>

      <h2>Handling errors with catch</h2>
      <Code>{sample("Promise .catch")}</Code>
      <p>
        This prints <samp>sync</samp>, <samp>caught oops</samp>,{" "}
        <samp>after catch</samp>. A rejection skips every <code>.then</code>{" "}
        success callback until it reaches a <code>.catch</code>. After{" "}
        <code>.catch</code> handles the error, the chain continues as fulfilled,
        so the last <code>.then</code> runs. A rejection that no{" "}
        <code>.catch</code> handles is reported as{" "}
        <code>Uncaught (in promise)</code>.
      </p>

      <h2>finally: run cleanup either way</h2>
      <Code>{sample("Promise .finally")}</Code>
      <p>
        <code>.finally</code> runs whether the promise was fulfilled or
        rejected, which makes it the place to hide a loading spinner or close a
        connection. Its callback receives no value, and the original result
        passes through to the next step unchanged (unless the callback itself
        throws).
      </p>

      <h2>Promise.all vs Promise.race</h2>
      <Code>{sample("Promise.all vs Promise.race")}</Code>
      <p>
        This prints <samp>waiting...</samp>, then <samp>race: fast</samp> after
        50 ms, then <samp>all: slow, fast</samp> after 100 ms.{" "}
        <code>Promise.race</code> settles with whichever promise settles first.{" "}
        <code>Promise.all</code> waits for all of them and keeps the results in
        the order you passed them in, not the order they finished. If any of
        them is rejected, <code>Promise.all</code> is rejected straight away.
      </p>

      <h2>Promises and async/await</h2>
      <p>
        An <code>async</code> function always returns a promise, and{" "}
        <code>await</code> pauses the function until a promise settles. The rest
        of the function then continues as a microtask, just like a{" "}
        <code>.then</code> callback. Choose <strong>async/await order</strong>{" "}
        in the example menu to see this. Which callbacks run first, and why, is
        covered in{" "}
        <Link to="/javascript-microtasks-macrotasks">
          microtasks vs macrotasks
        </Link>
        .
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>
            Forgetting to return inside <code>.then</code>.
          </strong>{" "}
          The next step then receives <code>undefined</code> and does not wait
          for any work started in the callback.
        </li>
        <li>
          <strong>Nesting instead of chaining.</strong> Return the inner promise
          and add the next <code>.then</code> to the outer chain.
        </li>
        <li>
          <strong>Thinking the executor runs later.</strong> The code inside{" "}
          <code>new Promise(...)</code> runs immediately; only the callbacks are
          delayed.
        </li>
        <li>
          <strong>Leaving rejections unhandled.</strong> End chains with a{" "}
          <code>.catch</code>, or use <code>try/catch</code> around{" "}
          <code>await</code>.
        </li>
      </ul>

      <h2>What LoopLens simulates</h2>
      <p>
        LoopLens uses its own promise implementation that follows the ECMAScript
        rules, including the extra microtask turns that <code>.finally</code>{" "}
        and returning a promise from <code>.then</code> cost, so the order of
        output matches real JavaScript. It supports <code>new Promise</code>,{" "}
        <code>Promise.resolve</code>, <code>reject</code>, <code>all</code> and{" "}
        <code>race</code>; <code>Promise.allSettled</code> and{" "}
        <code>Promise.any</code> are not supported yet. Timers use a virtual
        clock, and real network requests are not simulated. See how all of this
        fits together in the{" "}
        <Link to="/javascript-event-loop">event loop guide</Link>.
      </p>
    </article>
  );
}
