import type { ReactNode } from "react";
import Link, { Code, sampleCode as sample } from "./Link";

export default function ExecutionContext({ viz }: { viz: ReactNode }) {
  return (
    <article className="prose">
      <p className="answer">
        An <strong>execution context</strong> is the environment JavaScript sets
        up to run a piece of code. There is one <em>global</em> context for your
        script, and a new <em>function</em> context every time a function is
        called. Each context holds the variables and functions that code can
        use, a link to the outer scope, and the value of <code>this</code>. Some
        of this is set up <em>before</em> the first line runs, which is why
        hoisting happens.
      </p>

      <h2>Try it</h2>
      <p>
        This example calls a function before its declaration and reads a{" "}
        <code>let</code> variable too early. Press <strong>Next step</strong>{" "}
        and watch the call stack and the <strong>Scope and variables</strong>{" "}
        panel.
      </p>
      {viz}

      <h2>Step by step: what the example does</h2>
      <Code>{sample("Hoisting and the TDZ")}</Code>
      <ol>
        <li>
          Before line 1 runs, the global context is created. The function
          declaration <code>greet</code> is stored in full, so it can be called
          from the very first line. <code>total</code> is known too, but as a{" "}
          <code>let</code> it stays <em>uninitialized</em>.
        </li>
        <li>
          Line 1 calls <code>greet("Ada")</code>. A new function context goes on
          the <Link to="/javascript-call-stack">call stack</Link>, with its own{" "}
          <code>name</code> and <code>message</code>.
        </li>
        <li>
          <code>greet</code> returns <samp>Hello, Ada</samp>, its context is
          removed, and the global code continues.
        </li>
        <li>
          Reading <code>total</code> before its <code>let</code> line throws a{" "}
          <code>ReferenceError</code>. The <code>catch</code> block prints its
          name: <samp>ReferenceError</samp>.
        </li>
        <li>
          The line <code>let total = 10</code> runs, so <code>total</code>{" "}
          finally gets a value and the last line prints <samp>10</samp>.
        </li>
      </ol>

      <h2>Two phases: creation, then execution</h2>
      <p>
        When a context starts, JavaScript first goes through the code to set it
        up (the <strong>creation phase</strong>) and only then runs it line by
        line (the <strong>execution phase</strong>). In the creation phase it:
      </p>
      <ul>
        <li>creates every function declaration in full;</li>
        <li>
          creates every <code>var</code> variable with the value{" "}
          <code>undefined</code>;
        </li>
        <li>
          registers <code>let</code>, <code>const</code> and <code>class</code>{" "}
          names without a value;
        </li>
        <li>
          links the context to its outer scope, the scope the function was
          written in;
        </li>
        <li>
          decides the value of <code>this</code> (for function calls, from how
          the function is called).
        </li>
      </ul>

      <h2>Hoisting, declaration by declaration</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Declaration</th>
            <th scope="col">Used before its line</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>function f() {"{}"}</code>
            </td>
            <td>Works: the whole function is ready.</td>
          </tr>
          <tr>
            <td>
              <code>var x = 1</code>
            </td>
            <td>
              <code>x</code> is <code>undefined</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>let x = 1</code>, <code>const x = 1</code>
            </td>
            <td>
              <code>ReferenceError</code> (temporal dead zone).
            </td>
          </tr>
          <tr>
            <td>
              <code>class C {"{}"}</code>
            </td>
            <td>
              <code>ReferenceError</code> (temporal dead zone).
            </td>
          </tr>
          <tr>
            <td>
              <code>var f = function () {"{}"}</code>
            </td>
            <td>
              <code>f</code> is <code>undefined</code>, so <code>f()</code>{" "}
              throws a <code>TypeError</code>.
            </td>
          </tr>
        </tbody>
      </table>
      <Code>{`console.log(x); // undefined: var x already exists
var x = 1;
console.log(x); // 1`}</Code>
      <p>
        <strong>Note:</strong> LoopLens can&apos;t show <code>var</code>{" "}
        hoisting yet. If you paste this code into the visualizer, it reports a{" "}
        <code>ReferenceError</code> instead of printing <code>undefined</code>.
        Real JavaScript prints <code>undefined</code>, then <code>1</code>.
      </p>

      <h2>The temporal dead zone</h2>
      <p>
        The time between the start of a scope and the line that declares a{" "}
        <code>let</code>, <code>const</code> or <code>class</code> is called the{" "}
        <strong>temporal dead zone</strong> (TDZ). The name exists, so it hides
        any outer variable with the same name, but reading it throws. This
        catches the bugs that <code>var</code> hides, where code silently works
        with <code>undefined</code>.
      </p>

      <h2>How this is decided</h2>
      <ul>
        <li>
          <strong>Method call</strong> <code>obj.method()</code>:{" "}
          <code>this</code> is <code>obj</code>.
        </li>
        <li>
          <strong>Plain call</strong> <code>fn()</code>: <code>this</code> is{" "}
          <code>undefined</code> in strict mode (and in modules and classes), or
          the global object in old non-strict scripts.
        </li>
        <li>
          <strong>Constructor call</strong> <code>new Fn()</code>:{" "}
          <code>this</code> is the new object.
        </li>
        <li>
          <strong>Arrow functions</strong> have no <code>this</code> of their
          own; they use the <code>this</code> of the context they were written
          in.
        </li>
      </ul>
      <p>
        The <strong>Classes and this</strong> example in the menu above shows{" "}
        <code>this</code> inside a class&apos;s methods.
      </p>

      <h2>Contexts, the call stack and closures</h2>
      <p>
        Execution contexts are what the call stack holds: the global context
        sits at the bottom, and each function call pushes a new one on top. When
        a function returns, its context leaves the stack, but its variables can
        live on if an inner function still refers to them. That is a{" "}
        <Link to="/javascript-closures">closure</Link>.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>
          <strong>&quot;let and const aren&apos;t hoisted.&quot;</strong> They
          are registered early; they just can&apos;t be read before their line.
        </li>
        <li>
          <strong>Calling a function expression before its line.</strong> Only
          function <em>declarations</em> are hoisted in full.
        </li>
        <li>
          <strong>
            Expecting <code>this</code> to follow where a function is written.
          </strong>{" "}
          For regular functions it depends on how the function is called; only
          arrow functions take it from where they are written.
        </li>
      </ul>

      <h2>What LoopLens simulates</h2>
      <p>
        LoopLens creates a real scope for the script and for every call, hoists
        function declarations and enforces the temporal dead zone, so the
        example above behaves exactly like real JavaScript (it is checked
        against Node.js). It follows strict-mode rules for <code>this</code>.
        Not supported yet: <code>var</code> hoisting, <code>this</code> at the
        top level of a script, and the <code>arguments</code> object.
      </p>
    </article>
  );
}
