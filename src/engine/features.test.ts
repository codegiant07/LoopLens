import { describe, it, expect } from 'vitest';
import { trace } from './index';
import { realJS } from './realjs';

// Each snippet must give exactly the same console output as real JavaScript, with no simulator error.
const same = (name: string, code: string) => it(name, async () => {
  const r = trace(code);
  expect(r.err).toBeUndefined();
  expect(r.steps.at(-1)!.out).toEqual(await realJS(code));
  expect(r.steps.every(s => s.note.trim().length > 0)).toBe(true);
});

describe('destructuring, defaults, rest and spread', () => {
  same('object pattern with nesting, defaults and rest', `const {a, b: {c}, d = 4, ...rest} = {a: 1, b: {c: 2}, e: 5, f: 6};
console.log(a, c, d, JSON.stringify(rest));`);
  same('array pattern with holes, defaults and rest', `const [x, , y = 3, ...more] = [1, 2, undefined, 4, 5];
console.log(x, y, JSON.stringify(more));`);
  same('swap with array assignment', `let p = 1, q = 2;
[p, q] = [q, p];
console.log(p, q);`);
  same('parameters: patterns, defaults and rest', `function f({name, age = 30}, [first, second] = [], ...others) {
  return name + " " + age + " " + first + " " + second + " " + others.length;
}
console.log(f({name: "Ada"}, [1, 2], 3, 4));
console.log(f({name: "Bo", age: 5}));`);
  same('default parameter that is a function', `function run(cb = () => "default") { return cb(); }
console.log(run(), run(() => "given"));`);
  same('for...of with destructuring', `const m = new Map([["a", 1], ["b", 2]]);
for (const [k, v] of m) console.log(k, v);
for (const {id} of [{id: 7}, {id: 8}]) console.log(id);`);
  same('catch parameter destructuring', `try { throw {code: 42, msg: "bad"}; } catch ({code, msg}) { console.log(code, msg); }`);
  same('destructuring null throws a TypeError', `try { const {a} = null; } catch (e) { console.log(e.name, e.message); }
try { const [z] = 5; } catch (e) { console.log(e.name); }`);
  same('spread in arrays, calls and objects', `const a = [1, 2];
const b = [0, ...a, 3];
console.log(JSON.stringify(b), Math.max(...b));
const o = {x: 1, y: 2};
console.log(JSON.stringify({...o, y: 3, z: 4}), [..."hi"].length);`);
});

describe('this, classes, getters, setters and static', () => {
  same('method this', `const counter = { count: 0, inc() { this.count++; return this.count; } };
counter.inc();
console.log(counter.inc());`);
  same('arrow functions keep the outer this', `const obj = { items: [1, 2, 3], total: 0, sum() { this.items.forEach(x => { this.total += x; }); return this.total; } };
console.log(obj.sum());`);
  same('class with constructor and method', `class Animal {
  constructor(name) { this.name = name; }
  speak() { return this.name + " makes a sound"; }
}
const a = new Animal("Rex");
console.log(a.speak(), a instanceof Animal, typeof Animal);`);
  same('inheritance with super() and method overriding', `class Animal { constructor(n) { this.name = n; } speak() { return this.name + " ..."; } }
class Dog extends Animal {
  constructor(n) { super(n); this.tricks = 0; }
  speak() { return this.name + " barks"; }
  learn() { this.tricks++; return this; }
}
const d = new Dog("Fido");
d.learn().learn();
console.log(d.speak(), d.tricks, d instanceof Dog, d instanceof Animal, JSON.stringify(d));`);
  same('subclass without a constructor', `class A { constructor(x) { this.x = x; } }
class B extends A { double() { return this.x * 2; } }
console.log(new B(21).double());`);
  same('getters, setters and static methods', `class Temp {
  constructor(c) { this._c = c; Temp.made = (Temp.made || 0) + 1; }
  get f() { return this._c * 9 / 5 + 32; }
  set f(v) { this._c = (v - 32) * 5 / 9; }
  static fromF(f) { const t = new Temp(0); t.f = f; return t; }
}
const t = Temp.fromF(212);
console.log(t._c, t.f, Temp.made);`);
  same('static getter sees the class as this, and is inherited', `class Cfg { static get label() { return "cfg:" + this.name; } }
class Sub extends Cfg {}
console.log(Cfg.label, Sub.label);`);
  same('getter and setter in an object literal', `const user = {
  first: "Ada", last: "L",
  get full() { return this.first + " " + this.last; },
  set full(v) { [this.first, this.last] = v.split(" "); }
};
user.full = "Grace Hopper";
console.log(user.full, user.first);`);
  same('custom error class', `class ValidationError extends Error {
  constructor(msg) { super(msg); this.name = "ValidationError"; }
}
try { throw new ValidationError("bad input"); }
catch (e) { console.log(e.name, e.message, e instanceof ValidationError, e instanceof Error); }`);
  same('calling a class without new throws', `class X {}
try { X(); } catch (e) { console.log(e.name, e.message); }`);
  same('using this before super() throws', `class A {}
class B extends A { constructor() { this.x = 1; super(); } }
try { new B(); } catch (e) { console.log(e.name, e.message); }`);
  same('new on a plain function', `function Point(x, y) { this.x = x; this.y = y; }
const pt = new Point(1, 2);
console.log(pt.x + pt.y, pt instanceof Point);`);
  same('async method', `class Api {
  constructor() { this.calls = 0; }
  async get(v) { this.calls++; await null; return v * 2; }
}
const api = new Api();
api.get(2).then(r => console.log("got", r, api.calls));
console.log("sync", api.calls);`);
  same('class expression and chaining', `const Shape = class { area() { return 0; } };
class Cart {
  constructor() { this.items = []; }
  add(p) { this.items.push(p); return this; }
  count() { return this.items.map(i => i.price).filter(p => p > 0).length; }
}
console.log(new Shape().area(), new Cart().add({price: 3}).add({price: 0}).count());`);
});

describe('Promise.all, Promise.race and finally', () => {
  same('all waits for every item, race takes the first', `const slow = new Promise(r => setTimeout(() => r("slow"), 100));
const fast = new Promise(r => setTimeout(() => r("fast"), 50));
Promise.all([slow, fast, 3]).then(v => console.log("all", JSON.stringify(v)));
Promise.race([slow, fast]).then(v => console.log("race", v));
console.log("sync");`);
  same('all rejects as soon as one item rejects', `Promise.all([Promise.resolve(1), Promise.reject("no"), new Promise(r => setTimeout(() => r(), 50))])
  .then(() => console.log("never"), e => console.log("all failed:", e));`);
  same('all and race microtask timing', `Promise.all([1, 2]).then(v => console.log("all", v.length));
Promise.resolve().then(() => console.log("a")).then(() => console.log("b")).then(() => console.log("c"));
Promise.race([1]).then(v => console.log("race", v));`);
  same('all with an empty list', `Promise.all([]).then(v => console.log("empty", v.length));
Promise.resolve().then(() => console.log("t1"));`);
  same('finally costs extra microtask ticks', `Promise.resolve(1).finally(() => console.log("fin")).then(v => console.log("value", v));
Promise.resolve().then(() => console.log("a")).then(() => console.log("b")).then(() => console.log("c")).then(() => console.log("d")).then(() => console.log("e"));`);
  same('finally on a rejection passes the error on', `Promise.reject(new Error("x")).finally(() => console.log("cleanup")).catch(e => console.log("caught", e.message));`);
  same('an error inside finally replaces the value', `Promise.resolve(1).finally(() => { throw new Error("f"); }).catch(e => console.log("caught", e.message));`);
  same('finally waits for a promise it returns', `Promise.resolve("v")
  .finally(() => new Promise(r => setTimeout(() => { console.log("cleanup done"); r(); }, 50)))
  .then(v => console.log("then", v));`);
  same('await Promise.all with destructuring', `async function main() {
  const [a, b] = await Promise.all([new Promise(r => setTimeout(() => r(1), 50)), 2]);
  console.log(a + b);
}
main();`);
});

describe('setInterval and clearInterval', () => {
  same('ticks until cleared, between other timers', `let n = 0;
const id = setInterval(() => {
  n++;
  console.log("tick", n);
  if (n === 3) clearInterval(id);
}, 100);
setTimeout(() => console.log("timeout at 250"), 250);`);
  same('microtasks run after each tick', `let k = 0;
const id = setInterval(() => {
  k++;
  Promise.resolve().then(() => console.log("micro", k));
  console.log("tick", k);
  if (k === 2) clearInterval(id);
}, 50);`);
  same('clearTimeout also stops an interval', `const id = setInterval(() => console.log("tick"), 100);
setTimeout(() => { clearTimeout(id); console.log("cleared"); }, 150);`);
});

describe('clear messages for what is still unsupported', () => {
  const err = (code: string) => trace(code).err;
  it('class fields', () => expect(err('class A { x = 1; }')).toBe('Not supported yet: class fields on line 1.'));
  it('private #fields', () => expect(err('class A { #x() {} }')).toMatch(/private #fields on line 1/));
  it('super.property', () => expect(err('class A { m() {} }\nclass B extends A { m() { return super.m(); } }')).toMatch(/super\.property on line 2/));
  it('top-level this', () => expect(err('console.log(this);')).toMatch(/`this` outside a function or class/));
  it('Promise.allSettled', () => expect(trace('Promise.allSettled([]);').steps.at(-1)!.out[0]).toMatch(/allSettled is not a function/));
  it('array methods with callbacks other than map, forEach and filter', () => expect(err('[3, 1].sort((a, b) => a - b);')).toBe('sort() with a callback is not supported yet. Only map, forEach and filter can run callbacks.'));
  it('storing a function with a built-in still works', () => expect(trace('const q = []; q.push(() => 1); console.log(q.length);').steps.at(-1)!.out).toEqual(['1']));
  it('a setInterval that never stops', () => expect(err('setInterval(() => {}, 10);')).toMatch(/setInterval that is never cleared/));
});

describe('what the step view shows', () => {
  const steps = (code: string) => trace(code).steps;
  it('instances print with their class name', () => expect(steps('class Dog { constructor() { this.n = 1; } }\nconsole.log(new Dog());').at(-1)!.out).toEqual(['Dog {n: 1}']));
  it('getters show as (...) instead of running', () => expect(steps('console.log({ get x() { return 1; } });').at(-1)!.out).toEqual(['{x: (...)}']));
  it('a method frame shows `this` in the scope view', () => {
    const s = steps('const o = { n: 1, f() { return this.n; } };\no.f();').find(x => x.stack.includes('f()'))!;
    expect(s.scope[0]).toEqual(['f', [['this', '{n: 1, f: ƒ f}']]]);
  });
  it('constructor frames are named new <Class>()', () => expect(steps('class Dog { constructor() {} }\nnew Dog();').some(x => x.stack.includes('new Dog()'))).toBe(true));
  it('an interval tick is explained', () => expect(steps('const id = setInterval(() => clearInterval(id), 10);').some(x => /ticked\. Its callback goes to the task queue/.test(x.note))).toBe(true));
});
