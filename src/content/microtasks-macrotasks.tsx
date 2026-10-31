import type { ReactNode } from "react";
import Link, { Code, sampleCode as sample } from "./Link";

export default function Microtasks({ viz }: { viz: ReactNode }) {
  return (
    <article className="prose">
      <p className="answer">
        JavaScript has two main waiting lines for callbacks.{" "}
        <strong>Microtasks</strong> (promise callbacks, code after{" "}
        <code>await</code>, <code>queueMicrotask</code>) run as soon as the
        current code finishes, and <em>all</em> of them run before anything
        else. <strong>Macrotasks</strong>, simply called tasks in the HTML
        standard (timers, events, messages), run <em>one at a time</em>, with
        every microtask drained in between.
      </p>

      <h2>Try it</h2>
      <p>
        Here a timer callback creates a promise callback. Press{" "}
        <strong>Next step</strong> and watch the microtask run before the second
        timer, even though that timer was already waiting in the task queue.
      </p>
      {viz}

      <h2>Step by step: what the example does</h2>
      <Code>{sample("Microtasks inside a task")}</Code>
      <ol>
        <li>
          The script schedules two timers and finishes. Both callbacks move to
          the <strong>task queue</strong>.
        </li>
        <li>
          The event loop takes the <em>first</em> task. It prints{" "}
          <samp>task 1</samp> and creates a resolved promise, whose{" "}
          <code>.then</code> callback joins the <strong>microtask queue</strong>
          .
        </li>
        <li>
          Task 1 finishes. Before taking another task, the event loop empties
          the microtask queue, so <samp>microtask from task 1</samp> prints.
        </li>
        <li>
          Only now does the second task run and print <samp>task 2</samp>.
        </li>
      </ol>

      <h2>Which callbacks go where</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Microtask queue</th>
            <th scope="col">Task queue (macrotasks)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>.then</code>, <code>.catch</code>, <code>.finally</code>{" "}
              callbacks
            </td>
            <td>
              <code>setTimeout</code> and <code>setInterval</code> callbacks
            </td>
          </tr>
          <tr>
            <td>
              the rest of an <code>async</code> function after{" "}
              <code>await</code>
            </td>
            <td>user events such as clicks and key presses</td>
          </tr>
          <tr>
            <td>
              <code>queueMicrotask(fn)</code>
            </td>
            <td>
              <code>postMessage</code> and <code>MessageChannel</code> messages
            </td>
          </tr>
          <tr>
            <td>
              <code>MutationObserver</code> callbacks (browsers)
            </td>
            <td>network and file I/O callbacks; the main script itself</td>
          </tr>
        </tbody>
      </table>
      <p>
        <code>requestAnimationFrame</code> callbacks are neither: browsers run
        them just before drawing the next frame. Node.js adds its own queues,
        such as <code>process.nextTick</code> (which runs even before promise
        callbacks) and <code>setImmediate</code>.
      </p>

      <h2>The rule: one task, then all microtasks</h2>
      <Code>{`run one task
  → run microtasks until the microtask queue is empty
    (including microtasks added by other microtasks)
→ (browser) maybe update the screen
→ next task`}</Code>
      <p>
        This one rule explains most &quot;what prints first?&quot; puzzles. A
        small one:
      </p>
      <Code>{sample("queueMicrotask")}</Code>
      <p>
        The output is <samp>sync</samp>, <samp>microtask</samp>,{" "}
        <samp>task</samp>: the script is the current task, so it finishes first;
        the microtask runs as soon as the stack is empty; the timer has to wait
        for the next turn of the{" "}
        <Link to="/javascript-event-loop">event loop</Link>.
      </p>

      <h2>Microtasks that add microtasks</h2>
      <Code>{sample("Two chains take turns")}</Code>
      <p>
        This prints <samp>A1</samp>, <samp>B1</samp>, <samp>A2</samp>,{" "}
        <samp>B2</samp>. Each <code>.then</code> callback is only queued once
        the promise before it is resolved. So <samp>A2</samp> joins the queue
        after <samp>A1</samp> has run, behind <samp>B1</samp>, which was already
        waiting. The microtask queue keeps running until it is empty, so both
        chains finish before any task gets a turn.
      </p>

      <h2>Microtasks can starve everything else</h2>
      <Code>{`// Don't run this: the page never gets a chance to update.
function forever() {
  queueMicrotask(forever);
}
forever();`}</Code>
      <p>
        Because the event loop only moves on when the microtask queue is empty,
        a microtask that always schedules another one blocks timers, clicks and
        screen updates for good. A timer-based loop (
        <code>setTimeout(forever, 0)</code>) would not freeze the page, because
        every timer callback is a separate task.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>
            &quot;setTimeout(fn, 0) and a resolved promise run at the same
            time.&quot;
          </strong>{" "}
          The promise callback always runs first, because microtasks are drained
          before the next task.
        </li>
        <li>
          <strong>&quot;Only one microtask runs between tasks.&quot;</strong>{" "}
          All of them run, including new ones added along the way.
        </li>
        <li>
          <strong>Assuming Node.js behaves exactly like a browser.</strong> The
          promise rules are the same, but Node.js has extra queues and phases.
        </li>
      </ul>

      <h2>What LoopLens simulates</h2>
      <p>
        LoopLens models the task queue, the microtask queue and the rule between
        them, and its examples produce the same output order as real JavaScript
        (they are checked against Node.js). It supports promises,{" "}
        <code>await</code>, <code>queueMicrotask</code> and timers. DOM events,
        messages, <code>MutationObserver</code>,{" "}
        <code>requestAnimationFrame</code>, screen updates and Node.js-only
        queues are not simulated. Learn how promises create these microtasks in
        the <Link to="/javascript-promises">promises guide</Link>.
      </p>
    </article>
  );
}
