import type { ReactNode } from "react";
import Link, { Code, sampleCode as sample } from "./Link";

export default function EventLoop({ viz }: { viz: ReactNode }) {
  return (
    <article className="prose">
      <p className="answer">
        JavaScript runs one piece of code at a time, on a single{" "}
        <Link to="/javascript-call-stack">call stack</Link>. The{" "}
        <strong>event loop</strong> decides what runs next: first your whole
        script, then <em>every</em> waiting microtask (such as promise
        callbacks), then <em>one</em> task (such as a timer callback), and then
        it repeats. That is why a <code>setTimeout(…, 0)</code> callback runs
        after code that comes later in the file.
      </p>

      <h2>Try it</h2>
      <p>
        This example mixes a timer and a promise. Press{" "}
        <strong>Next step</strong> to move one step at a time, or{" "}
        <strong>Play</strong> to run it. Watch the call stack, the two queues
        and the console.
      </p>
      {viz}

      <h2>Step by step: what the example does</h2>
      <Code>{sample("setTimeout vs promise")}</Code>
      <ol>
        <li>
          <code>console.log("start")</code> runs right away and prints{" "}
          <samp>start</samp>.
        </li>
        <li>
          <code>setTimeout</code> hands its callback to a{" "}
          <strong>Web API</strong>: the browser starts a timer outside
          JavaScript. The script does not wait; it moves on.
        </li>
        <li>
          <code>Promise.resolve()</code> is already resolved, so its{" "}
          <code>.then</code> callback goes straight into the{" "}
          <strong>microtask queue</strong>. It can't run yet, because the script
          is still on the call stack.
        </li>
        <li>
          <code>console.log("end")</code> prints <samp>end</samp>. The script is
          finished and the call stack is empty.
        </li>
        <li>
          The event loop now empties the microtask queue: the <code>.then</code>{" "}
          callback runs and prints <samp>promise</samp>.
        </li>
        <li>
          With no microtasks left, the event loop takes <strong>one</strong>{" "}
          task from the task queue: the timer callback, which prints{" "}
          <samp>timeout</samp>.
        </li>
      </ol>
      <p>
        The output is <samp>start</samp>, <samp>end</samp>, <samp>promise</samp>
        , <samp>timeout</samp>, even though the timer was created first and
        asked for a delay of 0 ms.
      </p>

      <h2>The parts of the event loop</h2>
      <dl>
        <dt>Call stack</dt>
        <dd>
          Where JavaScript code actually runs, one function frame at a time.
          Nothing else can run until the stack is empty.
        </dd>
        <dt>Web APIs</dt>
        <dd>
          Features the browser (or Node.js) provides outside the JavaScript
          engine, such as timers, network requests and DOM events. They wait in
          the background and hand a callback back when they are ready.
        </dd>
        <dt>Task queue (also called the macrotask queue)</dt>
        <dd>
          Callbacks from timers, user events and I/O wait here for their turn.
        </dd>
        <dt>Microtask queue</dt>
        <dd>
          Promise callbacks (<code>.then</code>, <code>.catch</code>,{" "}
          <code>.finally</code>), the code after an <code>await</code>, and{" "}
          <code>queueMicrotask</code> callbacks wait here. This queue has
          priority over the task queue. The{" "}
          <Link to="/javascript-microtasks-macrotasks">
            microtasks and macrotasks guide
          </Link>{" "}
          covers which API uses which queue.
        </dd>
        <dt>Event loop</dt>
        <dd>
          The rule that moves the next piece of work onto the call stack
          whenever it becomes empty.
        </dd>
      </dl>

      <h2>One turn of the loop</h2>
      <Code>{`┌─► 1. Run one task (the very first task is your whole script)
│   2. Run ALL microtasks, including any added while they run
│   3. Browser only: update the screen if a new frame is due
└── 4. Take the next task and repeat`}</Code>
      <p>
        Step 2 is the important difference between the two queues. The event
        loop takes tasks <strong>one at a time</strong>, but it keeps running
        microtasks until that queue is empty. If a microtask keeps scheduling
        new microtasks, tasks and screen updates never get a turn, and the page
        freezes.
      </p>

      <h2>Why setTimeout(fn, 0) is not instant</h2>
      <p>
        A delay of 0 means &quot;as soon as possible&quot;, not &quot;now&quot;.
        The callback has to wait for three things:
      </p>
      <ul>
        <li>
          the code that is running now must finish and leave the call stack
          empty;
        </li>
        <li>every waiting microtask runs first;</li>
        <li>
          the timer itself has a minimum delay. Browsers raise very short
          delays, for example to at least 4 ms once timers are nested about five
          levels deep, and they slow timers down further in background tabs.
        </li>
      </ul>
      <p>
        The number you pass to <code>setTimeout</code> is a minimum waiting
        time, never a promise of exact timing.
      </p>

      <h2>Long-running code blocks everything</h2>
      <p>
        While the call stack is busy, the event loop cannot hand it anything
        else, not even a timer that is already due:
      </p>
      <Code>{sample("A loop blocks timers")}</Code>
      <p>
        The timer is ready almost immediately, but its callback only runs after
        the loop has finished and <samp>loop done 6</samp> has been printed. A
        loop that takes seconds would delay the timer by seconds, and in a
        browser it would also freeze clicks, typing and painting. Long work is
        usually split into smaller pieces, or moved to a Web Worker, which runs
        on its own thread. To step through it, choose{" "}
        <strong>A loop blocks timers</strong> in the example menu above.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>&quot;setTimeout with 0 runs next.&quot;</strong> Every
          microtask that is already waiting runs before it.
        </li>
        <li>
          <strong>&quot;Promises run in the background.&quot;</strong> Waiting
          can happen in the background (a timer, a network request), but promise
          callbacks themselves run on the same single call stack, one at a time.
        </li>
        <li>
          <strong>
            &quot;try/catch around setTimeout catches its errors.&quot;
          </strong>{" "}
          The callback runs later, in a different task, after the{" "}
          <code>try</code> block has already finished. The{" "}
          <strong>try/catch and timers</strong> example shows this.
        </li>
      </ul>

      <h2>What LoopLens simulates</h2>
      <p>
        LoopLens runs your code in its own interpreter so it can record every
        step. The order of console output matches real JavaScript; its examples
        are checked against Node.js. The call stack, the Web APIs, both queues
        and the clock are simulated: time is virtual and jumps straight to the
        next timer, so a 100 ms timer doesn&apos;t really take 100 ms. Screen
        updates, user events, network requests, minimum timer delays, and
        Node.js-only features such as <code>process.nextTick</code> and{" "}
        <code>setImmediate</code> are not modeled.
      </p>
    </article>
  );
}
