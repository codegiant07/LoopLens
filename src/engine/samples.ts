// Example programs, grouped for the picker. Every one is checked against real JavaScript in samples.test.ts.
export const GROUPS: { name: string; samples: [string, string][] }[] = [
  {
    name: "Basics",
    samples: [
      [
        "Call stack",
        `function greet(name) {
  return "Hello, " + name;
}

function welcome() {
  const msg = greet("Ada");
  console.log(msg);
}

welcome();
console.log("done");`,
      ],
      [
        "Closures",
        `function makeCounter() {
  let count = 0;
  return function () {
    count = count + 1;
    return count;
  };
}

const next = makeCounter();
console.log(next());
console.log(next());

const other = makeCounter();
console.log(other());`,
      ],
      [
        "Classes and this",
        `class Counter {
  constructor(name) {
    this.name = name;
    this.count = 0;
  }
  increment() {
    this.count++;
    return this;
  }
}

const c = new Counter("clicks");
c.increment().increment();
console.log(c.name, c.count);`,
      ],
    ],
  },
  {
    name: "Timers & the task queue",
    samples: [
      [
        "Timers run by delay",
        `setTimeout(() => console.log("slow"), 100);
setTimeout(() => console.log("fast"), 0);
setTimeout(() => console.log("medium"), 50);
console.log("sync");`,
      ],
      [
        "A loop blocks timers",
        `setTimeout(() => console.log("timer"), 0);

let total = 0;
for (let i = 0; i < 4; i++) {
  total = total + i;
}
console.log("loop done", total);`,
      ],
      [
        "var vs let in a loop",
        `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log("var", i), 0);
}
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log("let", j), 0);
}`,
      ],
      [
        "setInterval and clearInterval",
        `let ticks = 0;
const id = setInterval(() => {
  ticks++;
  console.log("tick", ticks);
  if (ticks === 3) clearInterval(id);
}, 100);

setTimeout(() => console.log("timeout at 250 ms"), 250);
console.log("interval started");`,
      ],
    ],
  },
  {
    name: "Promises & microtasks",
    samples: [
      [
        "setTimeout vs promise",
        `console.log("start");
setTimeout(() => console.log("timeout"), 0);
Promise.resolve().then(() => console.log("promise"));
console.log("end");`,
      ],
      [
        "Promise chain",
        `Promise.resolve(1)
  .then(x => {
    console.log("first", x);
    return x + 1;
  })
  .then(x => console.log("second", x));

console.log("sync");`,
      ],
      [
        "Two chains take turns",
        `Promise.resolve()
  .then(() => console.log("A1"))
  .then(() => console.log("A2"));

Promise.resolve()
  .then(() => console.log("B1"))
  .then(() => console.log("B2"));`,
      ],
      [
        "queueMicrotask",
        `setTimeout(() => console.log("task"), 0);
queueMicrotask(() => console.log("microtask"));
console.log("sync");`,
      ],
      [
        "Microtasks inside a task",
        `setTimeout(() => {
  console.log("task 1");
  Promise.resolve().then(() => console.log("microtask from task 1"));
}, 0);

setTimeout(() => console.log("task 2"), 0);`,
      ],
      [
        "Promise.all vs Promise.race",
        `const slow = new Promise(resolve => setTimeout(() => resolve("slow"), 100));
const fast = new Promise(resolve => setTimeout(() => resolve("fast"), 50));

Promise.race([slow, fast]).then(v => console.log("race:", v));
Promise.all([slow, fast]).then(v => console.log("all:", v.join(", ")));
console.log("waiting...");`,
      ],
      [
        "Promise .finally",
        `function load(ok) {
  return ok ? Promise.resolve("data") : Promise.reject("network error");
}

load(true)
  .then(v => console.log("got", v))
  .finally(() => console.log("hide spinner (1)"));

load(false)
  .catch(e => console.log("failed:", e))
  .finally(() => console.log("hide spinner (2)"));`,
      ],
    ],
  },
  {
    name: "async / await",
    samples: [
      [
        "async/await order",
        `console.log("A");

async function test() {
  console.log("B");
  await Promise.resolve();
  console.log("C");
}

test();

Promise.resolve().then(() => console.log("D"));

console.log("E");`,
      ],
      [
        "async returns a promise",
        `async function getNumber() {
  return 42;
}

const p = getNumber();
console.log("got a promise");
p.then(n => console.log("value", n));
console.log("end");`,
      ],
      [
        "Sleep with a promise",
        `function sleep(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function run() {
  console.log("start");
  await sleep(100);
  console.log("after 100 ms");
  await sleep(50);
  console.log("after 50 more ms");
}

run();
console.log("run() returned");`,
      ],
      [
        "await Promise.all",
        `function fetchItem(name, ms) {
  return new Promise(resolve => setTimeout(() => resolve(name), ms));
}

async function loadAll() {
  console.log("start both at once");
  const [a, b] = await Promise.all([fetchItem("users", 100), fetchItem("posts", 50)]);
  console.log("done:", a, b);
}

loadAll();`,
      ],
    ],
  },
  {
    name: "Errors",
    samples: [
      [
        "async error handling",
        `function fetchUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => id > 0 ? resolve("user" + id) : reject("bad id"), 100);
  });
}
async function main() {
  try {
    const u = await fetchUser(1);
    console.log("got", u);
    await fetchUser(-1);
  } catch (e) {
    console.log("caught", e);
  }
  console.log("done");
}
main();
console.log("after main");`,
      ],
      [
        "Promise .catch",
        `Promise.reject("oops")
  .then(() => console.log("skipped"))
  .catch(e => console.log("caught", e))
  .then(() => console.log("after catch"));

console.log("sync");`,
      ],
      [
        "try/catch and timers",
        `try {
  setTimeout(() => {
    throw new Error("boom");
  }, 0);
} catch (e) {
  console.log("never runs");
}
console.log("try block finished");`,
      ],
    ],
  },
];

export const SAMPLES: [string, string][] = GROUPS.flatMap((g) => g.samples);
