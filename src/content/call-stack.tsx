import type { ReactNode } from "react";
import Link, { Code, sampleCode as sample } from "./Link";

export default function CallStack({ viz }: { viz: ReactNode }) {
  return (
    <article className="prose">
      <p className="answer">
        The <strong>call stack</strong> is how JavaScript keeps track of which
        function is running and where to go back to when it finishes. Calling a
        function puts a new <em>frame</em> on top of the stack; returning takes
        it off. Only the frame on top runs, so JavaScript does one thing at a
        time.
      </p>

      <h2>Try it</h2>
      <p>
        In this example one function calls another. Press{" "}
        <strong>Next step</strong> and watch frames being added and removed in
        the <strong>Call stack</strong> panel, top first.
      </p>
      {viz}

      <h2>Step by step: what the example does</h2>
      <Code>{sample("Call stack")}</Code>
      <ol>
        <li>
          The script starts as the <strong>main script</strong> frame, at the
          bottom of the stack. The two function declarations are registered, but
          nothing inside them runs yet.
        </li>
        <li>
          <code>welcome()</code> is called on line 10, so a{" "}
          <code>welcome()</code> frame goes on top of the main script.
        </li>
        <li>
          Inside <code>welcome</code>, line 6 calls <code>greet("Ada")</code>. A{" "}
          <code>greet()</code> frame goes on top. It has its own variable{" "}
          <code>name</code>, and <code>welcome</code> pauses, waiting for the
          result.
        </li>
        <li>
          <code>greet</code> returns <code>"Hello, Ada"</code>. Its frame is
          removed, and <code>welcome</code> continues exactly where it stopped,
          storing the value in <code>msg</code>.
        </li>
        <li>
          <code>welcome</code> prints <samp>Hello, Ada</samp>, finishes, and its
          frame is removed too.
        </li>
        <li>
          Back in the main script, line 11 prints <samp>done</samp>. Then the
          main script finishes and the stack is empty.
        </li>
      </ol>

      <h2>What a stack frame holds</h2>
      <p>Each frame belongs to one function call and remembers:</p>
      <ul>
        <li>which function is running and the line it has reached;</li>
        <li>
          its parameters and local variables (its own{" "}
          <Link to="/javascript-execution-context">execution context</Link>);
        </li>
        <li>
          where to continue, and where to send the return value, when it
          finishes.
        </li>
      </ul>
      <p>
        Because a new frame is created for every call, two calls of the same
        function never share local variables, even if they run at the same time
        in the stack, as in recursion.
      </p>

      <h2>Last in, first out</h2>
      <p>
        A stack works like a pile of plates: the last frame added is the first
        one removed. A function can only finish after every function it called
        has finished. That is why <code>greet</code> above returns before{" "}
        <code>welcome</code>, even though <code>welcome</code> started first.
      </p>

      <h2>Recursion: a function calling itself</h2>
      <Code>{`function factorial(n) {
  if (n <= 1) return 1;          // base case: stop here
  return n * factorial(n - 1);   // waits for the smaller call
}

console.log(factorial(4)); // 24`}</Code>
      <p>
        Each call waits for the next, smaller one, so the stack grows to four{" "}
        <code>factorial</code> frames (<code>n</code> = 4, 3, 2, 1). Then the
        frames come off one by one, each multiplying the value it got back: 1,
        2, 6, 24. Paste this code into the visualizer with{" "}
        <strong>Edit code</strong> to watch the stack grow and shrink.
      </p>

      <h2>Stack overflow: &quot;Maximum call stack size exceeded&quot;</h2>
      <p>
        The stack has a size limit. A recursive function without a working base
        case keeps adding frames until the engine stops it with an error:{" "}
        <code>RangeError: Maximum call stack size exceeded</code> in Chrome and
        Node.js, or <code>InternalError: too much recursion</code> in Firefox.
        The fix is almost always a missing or unreachable base case, such as a
        condition that never becomes true.
      </p>

      <h2>One stack, one thing at a time</h2>
      <p>
        JavaScript has a single call stack per thread. While a long function is
        running, nothing else can: not a timer, not a click handler, not a
        promise callback. Callbacks wait outside the stack until it is empty,
        and the <Link to="/javascript-event-loop">event loop</Link> decides
        which one runs next.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>
            Thinking a <code>setTimeout</code> callback is on the stack while it
            waits.
          </strong>{" "}
          It isn&apos;t. It only gets a frame when the event loop runs it, after
          the current code has finished.
        </li>
        <li>
          <strong>Recursion without a base case</strong>, or with a base case
          that is never reached (for example counting up when the condition
          checks for a smaller number).
        </li>
        <li>
          <strong>Reading a stack trace upside down.</strong> In an error&apos;s
          stack trace, the first line is the function that was on top of the
          stack when the error happened; the lines below are the functions that
          called it.
        </li>
      </ul>

      <h2>What LoopLens simulates</h2>
      <p>
        The order of calls and returns is real: LoopLens runs your code in its
        own interpreter and records each step. The stack you see is a picture of
        that interpreter&apos;s state, with the top-level code shown as{" "}
        <strong>main script</strong>. LoopLens stops a run after 3,000 steps or
        40,000 operations to keep the page responsive, so very deep recursion
        ends with LoopLens&apos;s own limit message instead of a real
        &quot;Maximum call stack size exceeded&quot; error.
      </p>
    </article>
  );
}
