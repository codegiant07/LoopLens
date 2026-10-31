// Interpreter: parses with acorn, runs the program with generators, and records a snapshot after every step.
// Values made by the user's program are dynamic JavaScript, so they are typed as `any` on purpose.
import * as acorn from "acorn";
import type { Step, TraceResult } from "./types";

type Node = any; // acorn (ESTree) AST node
type Gen<T = any> = Generator<any, T, any>;
type Handler = Fn | ((v: any) => any);
type Reaction = { lab: string; onF?: Handler; onR?: Handler; child?: P };
type Timer = {
  id: number;
  due: number;
  lab: string;
  f: Fn;
  a: any[];
  every?: number;
};
type Job = { lab: string; run: () => void };
type Completion =
  | { t: "ret"; v: any }
  | { t: "brk" }
  | { t: "cnt" }
  | undefined;
type ThisBox = { v: any; ready: boolean }; // `this` of a function call; `ready` is false in a subclass constructor until super()

class Fn {
  name: string;
  line: number;
  home?: Cls; // class a method belongs to (lets a constructor call super())
  proto?: object; // prototype for `new` on a plain function
  constructor(
    public n: Node,
    public env: Env,
  ) {
    this.name = n.id ? n.id.name : "callback";
    this.line = n.loc.start.line;
  }
}
class Cls {
  ctor?: Fn;
  proto: any;
  statics: any;
  native?: () => void;
  constructor(
    public name: string,
    public parent: any,
    public line: number,
  ) {
    this.proto = Object.create(
      parent instanceof Cls
        ? parent.proto
        : parent
          ? parent.prototype
          : Object.prototype,
    );
    this.statics = Object.create(parent instanceof Cls ? parent.statics : null);
    protoName.set(this.proto, name);
  }
}
class P {
  cbs: Reaction[] = [];
  h = false;
  lock = false;
  constructor(
    public s: "pending" | "fulfilled" | "rejected" = "pending",
    public v?: any,
  ) {}
}
class Thr {
  constructor(public v: any) {}
} // a JavaScript value thrown by the user's program
class Unsup {
  constructor(public m: string) {}
} // stops the simulation with a message
class Env {
  v = new Map<string, any>();
  c = new Set<string>();
  tb?: ThisBox;
  home?: Cls;
  nt?: Cls;
  showThis = false;
  constructor(
    public p: Env | null,
    public name: string,
    public fn = false,
  ) {}
}

interface Machine {
  root: Env;
  g: Env;
  env: Env | null;
  stack: string[];
  web: Timer[];
  tasks: Timer[];
  micro: Job[];
  out: string[];
  steps: Step[];
  ps: P[];
  time: number;
  ops: number;
  line: number;
  loop: string;
  seq: number;
  resume: boolean;
}
let M: Machine,
  SRC = "";
const protoName = new WeakMap<object, string>(); // prototype -> class name, so instances print as `Dog {…}`

const PO: Record<string, (...a: any[]) => any> = {}; // the simulated Promise global
const te = (m: string) => new Thr(new TypeError(m));
const sync = (g: Gen) => {
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
};
const has = (e: Env | null, k: string) => {
  for (; e; e = e.p) if (e.v.has(k)) return true;
  return false;
};
const own = (v: any) =>
  v == null || v instanceof Fn || v instanceof P || v instanceof Cls
    ? []
    : Object.keys(Object(v)); // never expose simulator internals
const iter = (v: any): any[] => {
  if (v == null || typeof v[Symbol.iterator] != "function")
    throw te(fmt(v, true) + " is not iterable");
  return Array.from(v);
};
const BIN: Record<string, (a: any, b: any) => any> = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
  "%": (a, b) => a % b,
  "**": (a, b) => a ** b,
  "==": (a, b) => a == b,
  "!=": (a, b) => a != b,
  "===": (a, b) => a === b,
  "!==": (a, b) => a !== b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  instanceof: (a, b) => {
    if (b instanceof Cls)
      return Object.prototype.isPrototypeOf.call(b.proto, a);
    if (b instanceof Fn)
      return !!b.proto && Object.prototype.isPrototypeOf.call(b.proto, a);
    if (b === PO) return a instanceof P;
    if (typeof b == "function") return a instanceof b;
    throw te("Right-hand side of 'instanceof' is not callable");
  },
};
const bop = (o: string) => {
  const f = BIN[o];
  if (!f) throw new Unsup("Operator " + o + " is not supported yet.");
  return f;
};

const OK = new Set(
  (
    "Program ExpressionStatement VariableDeclaration VariableDeclarator FunctionDeclaration FunctionExpression ArrowFunctionExpression " +
    "BlockStatement ReturnStatement IfStatement ForStatement ForOfStatement WhileStatement BreakStatement ContinueStatement ThrowStatement " +
    "TryStatement CatchClause EmptyStatement Literal Identifier TemplateLiteral TemplateElement BinaryExpression LogicalExpression UnaryExpression " +
    "UpdateExpression AssignmentExpression CallExpression MemberExpression NewExpression ArrayExpression ObjectExpression Property AwaitExpression " +
    "ConditionalExpression ThisExpression ClassDeclaration ClassExpression ClassBody MethodDefinition Super " +
    "ObjectPattern ArrayPattern AssignmentPattern RestElement SpreadElement"
  ).split(" "),
);
const FRIENDLY: Record<string, string> = {
  PropertyDefinition: "class fields",
  PrivateIdentifier: "private #fields",
  StaticBlock: "static blocks",
};
function scan(n: any, bad: string[]): void {
  if (!n || typeof n != "object") return;
  if (Array.isArray(n)) return n.forEach((x) => scan(x, bad));
  if (!n.type) return;
  const at = " on line " + n.loc.start.line;
  if (n.type == "MemberExpression" && n.object.type == "Super")
    bad.push("super.property" + at);
  else if (!OK.has(n.type) || n.generator || n.regex)
    bad.push((FRIENDLY[n.type] ?? n.type) + (n.regex ? " (regex)" : "") + at);
  for (const k in n) if (k != "loc") scan(n[k], bad);
}

function fmt(v: any, q?: boolean, d = 0): string {
  if (typeof v == "string") return q ? "'" + v + "'" : v;
  if (v instanceof Fn) return "ƒ " + v.name;
  if (v instanceof Cls) return "class " + v.name;
  if (v instanceof P)
    return (
      "Promise {" +
      (v.s == "pending"
        ? "<pending>"
        : (v.s == "rejected" ? "<rejected> " : "") + fmt(v.v, true, d + 1)) +
      "}"
    );
  if (v instanceof Error) return v.name + ": " + v.message;
  if (Array.isArray(v))
    return d > 1
      ? "[…]"
      : "[" + v.map((x) => fmt(x, true, d + 1)).join(", ") + "]";
  if (v && typeof v == "object") {
    const cn = protoName.get(Object.getPrototypeOf(v)),
      pre = cn ? cn + " " : "";
    if (d > 1) return pre + "{…}";
    // a getter is shown as (...) like the browser console: running it here would record steps while recording a step
    return (
      pre +
      "{" +
      Object.keys(v)
        .map((k) => {
          const p = Object.getOwnPropertyDescriptor(v, k);
          return (
            k +
            ": " +
            (p && (p.get || p.set) ? "(...)" : fmt(v[k], true, d + 1))
          );
        })
        .join(", ") +
      "}"
    );
  }
  return String(v);
}
function scopes(): Step["scope"] {
  const r: Step["scope"] = [];
  for (let e: Env | null = M.env || M.g; e && e !== M.root; e = e.p) {
    const vars = [...e.v].map(([k, v]): [string, string] => [k, fmt(v, true)]);
    if (e.showThis && e.tb?.ready) vars.unshift(["this", fmt(e.tb.v, true)]);
    if (vars.length) r.push([e.name, vars]);
  }
  return r;
}
function snap(k: string, note: string) {
  if (M.steps.length > 3000)
    throw new Unsup(
      M.web.some((w) => w.every) || M.tasks.some((w) => w.every)
        ? "Stopped after 3,000 steps: a setInterval that is never cleared keeps running forever. Call clearInterval to stop it."
        : "Stopped after 3,000 steps to keep the page responsive.",
    );
  M.steps.push({
    k,
    note,
    line: M.line,
    stack: [...M.stack],
    web: M.web.map((w) => w.lab + " (at " + w.due + " ms)"),
    tasks: M.tasks.map((t) => t.lab),
    micro: M.micro.map((t) => t.lab),
    out: [...M.out],
    scope: scopes(),
    loop: M.loop,
    time: M.time,
  });
}
const enq = (lab: string, run: () => void, note: string) => {
  M.micro.push({ lab, run });
  snap("enq", note);
};

function look(e: Env | null, k: string) {
  for (; e; e = e.p) if (e.v.has(k)) return e.v.get(k);
  throw new Thr(new ReferenceError(k + " is not defined"));
}
function put(e: Env | null, k: string, v: any) {
  for (; e; e = e.p)
    if (e.v.has(k)) {
      if (e.c.has(k)) throw te("Assignment to constant variable.");
      e.v.set(k, v);
      return;
    }
  throw new Thr(new ReferenceError(k + " is not defined"));
}
function decl(e: Env, k: string, v: any, kind: string) {
  if (kind == "var") while (!e.fn) e = e.p!;
  e.v.set(k, v);
  if (kind == "const") e.c.add(k);
}
const thisEnv = (e: Env | null) => {
  for (; e; e = e.p) if (e.tb) return e;
  return null;
};

// Read a property, with the simulator's own Promise, function and class objects handled specially.
function gm(o: any, k: any): any {
  if (o == null)
    throw te("Cannot read properties of " + o + " (reading '" + k + "')");
  if (k == "constructor" || k == "__proto__" || k == "prototype")
    throw new Unsup("Access to “" + k + "” is blocked.");
  if (o instanceof P)
    return k == "then"
      ? (f: any, g: any) => tu(o, "then", f, g)
      : k == "catch"
        ? (g: any) => tu(o, "catch", undefined, g)
        : k == "finally"
          ? (f: any) => tf(o, f)
          : undefined;
  if (o instanceof Fn) return k == "name" ? o.name : undefined;
  if (o instanceof Cls)
    return k == "name" ? o.name : Reflect.get(o.statics, k, o); // static getters see the class as `this`
  return o[k];
}
function setStatic(c: Cls, k: any, v: any) {
  for (let s = c.statics; s; s = Object.getPrototypeOf(s)) {
    const d = Object.getOwnPropertyDescriptor(s, k);
    if (d) {
      if (d.set) return void d.set.call(c, v);
      if (d.get) return;
      break;
    }
  }
  c.statics[k] = v;
}
function* asg(L: Node, v: any, env: Env): Gen<void> {
  if (L.type == "Identifier") return put(env, L.name, v);
  const o = yield* ev(L.object, env),
    k = L.computed ? yield* ev(L.property, env) : L.property.name;
  if (o == null) throw te("Cannot set properties of " + o);
  if (o instanceof Cls) return setStatic(o, k, v);
  o[k] = v;
}
// Destructuring: bind a pattern (`{a, b}`, `[x, ...rest]`, `c = 1`) to a value. kind is var/let/const, or 'assign'.
function* bind(p: Node, v: any, env: Env, kind: string): Gen<void> {
  switch (p.type) {
    case "Identifier":
      if (kind == "assign") put(env, p.name, v);
      else decl(env, p.name, v, kind);
      return;
    case "MemberExpression":
      return yield* asg(p, v, env);
    case "AssignmentPattern":
      if (v === undefined) {
        v = yield* ev(p.right, env);
        if (
          v instanceof Fn &&
          v.name == "callback" &&
          p.left.type == "Identifier"
        )
          v.name = p.left.name;
      }
      return yield* bind(p.left, v, env, kind);
    case "ArrayPattern": {
      const items = iter(v);
      for (let i = 0; i < p.elements.length; i++) {
        const e = p.elements[i];
        if (e?.type == "RestElement")
          yield* bind(e.argument, items.slice(i), env, kind);
        else if (e) yield* bind(e, items[i], env, kind);
      }
      return;
    }
    case "ObjectPattern": {
      if (v == null) {
        const f = p.properties[0];
        throw te(
          f && f.type == "Property" && !f.computed
            ? "Cannot destructure property '" +
                (f.key.name ?? f.key.value) +
                "' of '" +
                v +
                "' as it is " +
                v +
                "."
            : "Cannot destructure '" + v + "' as it is " + v + ".",
        );
      }
      const used: string[] = [];
      for (const q of p.properties) {
        if (q.type == "RestElement") {
          const r: any = {};
          for (const k of own(v)) if (!used.includes(k)) r[k] = v[k];
          yield* bind(q.argument, r, env, kind);
          continue;
        }
        const k = q.computed
          ? yield* ev(q.key, env)
          : (q.key.name ?? q.key.value);
        used.push(String(k));
        yield* bind(q.value, gm(v, k), env, kind);
      }
      return;
    }
    default:
      throw new Unsup(p.type + " is not supported.");
  }
}
function* call(f: any, t: any, a: any[], nm: string): Gen {
  if (f instanceof Fn) return yield* callFn(f, t, a);
  if (f instanceof Cls)
    throw te(
      "Class constructor " + f.name + " cannot be invoked without 'new'",
    );
  if (typeof f != "function")
    throw te(nm + " is not a function (or this simulator does not support it)");
  try {
    return f.apply(t, a);
  } catch (e: any) {
    // a built-in like reduce or sort can't run the simulator's functions; say so instead of showing its internal error
    if (e instanceof TypeError && a.some((x) => x instanceof Fn))
      throw new Unsup(
        nm +
          "() with a callback is not supported yet. Only map, forEach and filter can run callbacks.",
      );
    throw e instanceof Error ? new Thr(e) : e;
  }
}
function* arrCb(k: string, arr: any[], f: Fn): Gen {
  const o: any[] = [];
  for (let j = 0; j < arr.length; j++) {
    const v = yield* callFn(f, undefined, [arr[j], j, arr]);
    if (k == "map") o.push(v);
    else if (k == "filter" && v) o.push(arr[j]);
  }
  return k == "forEach" ? undefined : o;
}
// Evaluate a list of arguments or array items, expanding `...spread`.
function* list(xs: Node[], env: Env): Gen<any[]> {
  const r: any[] = [];
  for (const x of xs) {
    if (!x)
      r.push(undefined); // array hole: [1, , 3]
    else if (x.type == "SpreadElement")
      r.push(...iter(yield* ev(x.argument, env)));
    else r.push(yield* ev(x, env));
  }
  return r;
}
// Getter/setter on an object or class: runs the user's function with the object as `this`.
function accessor(
  target: any,
  key: any,
  kind: "get" | "set",
  f: Fn,
  enumerable: boolean,
) {
  const old = Object.getOwnPropertyDescriptor(target, key);
  const d: PropertyDescriptor =
    old && !("value" in old) ? old : { configurable: true, enumerable };
  if (kind == "get")
    d.get = function (this: any) {
      return sync(callFn(f, this, []));
    };
  else
    d.set = function (this: any, v: any) {
      sync(callFn(f, this, [v]));
    };
  Object.defineProperty(target, key, d);
}

function* makeClass(n: Node, env: Env): Gen<Cls> {
  let parent: any;
  if (n.superClass) {
    parent = yield* ev(n.superClass, env);
    if (!(parent instanceof Cls) && typeof parent != "function")
      throw te(
        "Class extends value " +
          fmt(parent, true) +
          " is not a constructor or null",
      );
  }
  const name = n.id ? n.id.name : "anonymous",
    c = new Cls(name, parent, n.loc.start.line);
  for (const m of n.body.body) {
    const k = m.computed ? yield* ev(m.key, env) : (m.key.name ?? m.key.value),
      f = new Fn(m.value, env);
    f.name = m.kind == "constructor" ? "new " + name : String(k);
    f.home = c;
    if (m.kind == "constructor") {
      c.ctor = f;
      continue;
    }
    const target = m.static ? c.statics : c.proto;
    if (m.kind == "method")
      Object.defineProperty(target, k, {
        value: f,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    else accessor(target, k, m.kind, f, false);
  }
  return c;
}
// `new` on a class: run the constructors from child to parent; super() creates `this` in a subclass.
function* construct(c: any, a: any[], nt: Cls): Gen<object> {
  if (!(c instanceof Cls)) {
    // a built-in parent such as Error
    nt.native ??= Object.assign(function () {}, { prototype: nt.proto });
    try {
      return Reflect.construct(c, a, nt.native);
    } catch (e: any) {
      throw e instanceof Error ? new Thr(e) : e;
    }
  }
  if (c.ctor) {
    const base = c.parent === undefined,
      box: ThisBox = {
        v: base ? Object.create(nt.proto) : undefined,
        ready: base,
      };
    const r = yield* callFn(c.ctor, box.v, a, box, nt);
    if (r !== null && typeof r == "object") return r;
    if (!box.ready)
      throw new Thr(
        new ReferenceError(
          "Must call super constructor in derived class before accessing 'this' or returning from derived constructor",
        ),
      );
    return box.v;
  }
  if (c.parent !== undefined) return yield* construct(c.parent, a, nt);
  return Object.create(nt.proto);
}

function* ev(n: Node, env: Env): Gen {
  switch (n.type) {
    case "Literal":
      return n.value;
    case "Identifier":
      return look(env, n.name);
    case "ThisExpression": {
      const e = thisEnv(env);
      if (!e)
        throw new Unsup(
          "`this` outside a function or class is not supported yet (in a browser script it is the window object).",
        );
      if (!e.tb!.ready)
        throw new Thr(
          new ReferenceError(
            "Must call super constructor in derived class before accessing 'this' or returning from derived constructor",
          ),
        );
      return e.tb!.v;
    }
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      return new Fn(n, env);
    case "ClassExpression":
      return yield* makeClass(n, env);
    case "TemplateLiteral": {
      let s = "";
      for (let k = 0; k < n.quasis.length; k++) {
        s += n.quasis[k].value.cooked;
        if (k < n.expressions.length)
          s += fmt(yield* ev(n.expressions[k], env));
      }
      return s;
    }
    case "BinaryExpression": {
      const a = yield* ev(n.left, env),
        b = yield* ev(n.right, env);
      return bop(n.operator)(a, b);
    }
    case "LogicalExpression": {
      const a = yield* ev(n.left, env),
        o = n.operator;
      return (o == "&&" ? !a : o == "||" ? a : a != null)
        ? a
        : yield* ev(n.right, env);
    }
    case "UnaryExpression": {
      if (
        n.operator == "typeof" &&
        n.argument.type == "Identifier" &&
        !has(env, n.argument.name)
      )
        return "undefined";
      const a = yield* ev(n.argument, env);
      switch (n.operator) {
        case "typeof":
          return a instanceof Fn || a instanceof Cls ? "function" : typeof a;
        case "!":
          return !a;
        case "-":
          return -a;
        case "+":
          return +a;
        case "void":
          return;
        default:
          throw new Unsup("Operator " + n.operator + " is not supported yet.");
      }
    }
    case "ConditionalExpression":
      return (yield* ev(n.test, env))
        ? yield* ev(n.consequent, env)
        : yield* ev(n.alternate, env);
    case "ArrayExpression":
      return yield* list(n.elements, env);
    case "ObjectExpression": {
      const o: any = {};
      for (const p of n.properties) {
        if (p.type == "SpreadElement") {
          const v = yield* ev(p.argument, env);
          for (const k of own(v)) o[k] = v[k];
          continue;
        }
        const k = p.computed
          ? yield* ev(p.key, env)
          : (p.key.name ?? p.key.value);
        if (p.kind == "get" || p.kind == "set") {
          const f = new Fn(p.value, env);
          f.name = String(k);
          accessor(o, k, p.kind, f, true);
          continue;
        }
        const v = yield* ev(p.value, env);
        if (v instanceof Fn && v.name == "callback") v.name = String(k);
        o[k] = v;
      }
      return o;
    }
    case "MemberExpression": {
      const o = yield* ev(n.object, env);
      return gm(o, n.computed ? yield* ev(n.property, env) : n.property.name);
    }
    case "AwaitExpression":
      return yield yield* ev(n.argument, env);
    case "AssignmentExpression": {
      if (n.left.type == "ObjectPattern" || n.left.type == "ArrayPattern") {
        const v = yield* ev(n.right, env);
        yield* bind(n.left, v, env, "assign");
        return v;
      }
      let v = yield* ev(n.right, env);
      if (n.operator != "=")
        v = bop(n.operator.slice(0, -1))(yield* ev(n.left, env), v);
      yield* asg(n.left, v, env);
      return v;
    }
    case "UpdateExpression": {
      const o = yield* ev(n.argument, env),
        nv = n.operator == "++" ? o + 1 : o - 1;
      yield* asg(n.argument, nv, env);
      return n.prefix ? nv : o;
    }
    case "CallExpression": {
      const c = n.callee;
      if (c.type == "Super") {
        // super(...) inside a subclass constructor creates `this`
        const e = thisEnv(env)!,
          a = yield* list(n.arguments, env);
        if (e.tb!.ready)
          throw new Thr(
            new ReferenceError("Super constructor may only be called once"),
          );
        e.tb!.v = yield* construct(e.home!.parent, a, e.nt!);
        e.tb!.ready = true;
        return undefined;
      }
      let t: any, f: any, k: any;
      if (c.type == "MemberExpression") {
        t = yield* ev(c.object, env);
        k = c.computed ? yield* ev(c.property, env) : c.property.name;
        f = gm(t, k);
      } else f = yield* ev(c, env);
      const a = yield* list(n.arguments, env);
      if (
        Array.isArray(t) &&
        ["map", "forEach", "filter"].includes(k) &&
        a[0] instanceof Fn
      )
        return yield* arrCb(k, t, a[0]);
      return yield* call(f, t, a, k || c.name || "value");
    }
    case "NewExpression": {
      const f = yield* ev(n.callee, env),
        a = yield* list(n.arguments, env);
      if (f === PO) {
        const p = new P();
        M.ps.push(p);
        if (!(a[0] instanceof Fn))
          throw te("Promise resolver is not a function");
        try {
          yield* callFn(a[0], undefined, [
            (v: any) => resolveP(p, v),
            (e: any) => rejectP(p, e),
          ]);
        } catch (e: any) {
          if (e instanceof Thr) rejectP(p, e.v);
          else throw e;
        }
        return p;
      }
      if (f instanceof Cls) return yield* construct(f, a, f);
      if (f instanceof Fn) {
        if (f.n.type == "ArrowFunctionExpression" || f.n.async)
          throw te(f.name + " is not a constructor");
        if (!f.proto) {
          f.proto = {};
          protoName.set(f.proto, f.name);
        }
        const o = Object.create(f.proto),
          r = yield* callFn(f, o, a);
        return r !== null && typeof r == "object" ? r : o;
      }
      return Reflect.construct(f, a);
    }
    default:
      throw new Unsup(n.type + " is not supported.");
  }
}

const NOTE: Record<string, string> = {
  VariableDeclaration: "make a variable and store its value.",
  IfStatement: "check the condition and run only the matching branch.",
  ForStatement: "start a loop: it checks the condition before every round.",
  WhileStatement: "loop while the condition is true.",
  ForOfStatement: "loop over each item.",
  ReturnStatement: "send a value back to the caller and leave the function.",
  ThrowStatement: "throw an error: jump to the nearest catch.",
  TryStatement: "run the block; if it throws, run catch.",
  ExpressionStatement: "run this expression.",
  BreakStatement: "leave the loop.",
  ContinueStatement: "skip to the next round.",
  ClassDeclaration:
    "create a class: a blueprint that new uses to build objects.",
};
function hoist(ss: Node[], env: Env) {
  for (const s of ss)
    if (s.type == "FunctionDeclaration") env.v.set(s.id.name, new Fn(s, env));
}
function* body(ss: Node[], env: Env): Gen<Completion> {
  hoist(ss, env);
  for (const s of ss) {
    const c = yield* ex(s, env);
    if (c) return c;
  }
}

function* ex(n: Node, env: Env): Gen<Completion> {
  if (++M.ops > 40000)
    throw new Unsup(
      "Stopped after 40,000 operations (possible infinite loop).",
    );
  M.line = n.loc.start.line;
  M.env = env;
  const T = n.type;
  if (
    T != "BlockStatement" &&
    T != "FunctionDeclaration" &&
    T != "EmptyStatement" &&
    !(T == "ExpressionStatement" && /Call|Await/.test(n.expression.type))
  )
    snap(
      "run",
      "Line " +
        M.line +
        ": " +
        NOTE[T].replace(/^./, (c) => c.toUpperCase()).replace(/\.$/, "") +
        ". Code: " +
        SRC.slice(n.start, n.end).split("\n")[0].slice(0, 60),
    );
  switch (T) {
    case "ExpressionStatement":
      yield* ev(n.expression, env);
      return;
    case "VariableDeclaration":
      for (const d of n.declarations) {
        const v = d.init ? yield* ev(d.init, env) : undefined;
        if (d.id.type != "Identifier") {
          yield* bind(d.id, v, env, n.kind);
          continue;
        }
        if (v instanceof Fn && v.name == "callback") v.name = d.id.name;
        decl(env, d.id.name, v, n.kind);
      }
      return;
    case "ClassDeclaration":
      decl(env, n.id.name, yield* makeClass(n, env), "let");
      return;
    case "ReturnStatement":
      return {
        t: "ret",
        v: n.argument ? yield* ev(n.argument, env) : undefined,
      };
    case "BreakStatement":
      return { t: "brk" };
    case "ContinueStatement":
      return { t: "cnt" };
    case "ThrowStatement":
      throw new Thr(yield* ev(n.argument, env));
    case "BlockStatement":
      return yield* body(n.body, new Env(env, "block"));
    case "IfStatement":
      if (yield* ev(n.test, env)) return yield* ex(n.consequent, env);
      if (n.alternate) return yield* ex(n.alternate, env);
      return;
    case "WhileStatement":
      while (yield* ev(n.test, env)) {
        const c = yield* ex(n.body, env);
        if (c) {
          if (c.t == "ret") return c;
          if (c.t == "brk") break;
        }
      }
      return;
    case "ForStatement": {
      let le = new Env(env, "loop");
      if (n.init)
        n.init.type == "VariableDeclaration"
          ? yield* ex(n.init, le)
          : yield* ev(n.init, le);
      while (!n.test || (yield* ev(n.test, le))) {
        const c = yield* ex(n.body, new Env(le, "block"));
        if (c) {
          if (c.t == "ret") return c;
          if (c.t == "brk") break;
        }
        const ne = new Env(env, "loop"); // each round gets a fresh copy, so closures keep their own `let` value
        le.v.forEach((v, k) => ne.v.set(k, v));
        le.c.forEach((k) => ne.c.add(k));
        le = ne;
        if (n.update) yield* ev(n.update, le);
      }
      return;
    }
    case "ForOfStatement": {
      const L = n.left;
      for (const x of iter(yield* ev(n.right, env))) {
        const le = new Env(env, "loop");
        if (L.type != "VariableDeclaration") yield* bind(L, x, env, "assign");
        else if (L.declarations[0].id.type == "Identifier")
          decl(le, L.declarations[0].id.name, x, L.kind);
        else yield* bind(L.declarations[0].id, x, le, L.kind);
        const c = yield* ex(n.body, le);
        if (c) {
          if (c.t == "ret") return c;
          if (c.t == "brk") break;
        }
      }
      return;
    }
    case "TryStatement": {
      let c: Completion;
      try {
        try {
          c = yield* ex(n.block, env);
        } catch (e: any) {
          if (e instanceof Error) e = new Thr(e);
          if (e instanceof Thr && n.handler) {
            const ce = new Env(env, "catch"),
              pm = n.handler.param;
            if (pm?.type == "Identifier") ce.v.set(pm.name, e.v);
            else if (pm) yield* bind(pm, e.v, ce, "let");
            c = yield* ex(n.handler.body, ce);
          } else throw e;
        }
      } finally {
        if (n.finalizer) yield* ex(n.finalizer, env);
      }
      return c;
    }
    default:
      return;
  }
}

// Does this function's own code (including arrow functions inside it) use `this`? Then the scope view shows it.
function usesThis(n: Node): boolean {
  if (n.__this === undefined) {
    const walk = (x: any, top: boolean): boolean => {
      if (!x || typeof x != "object") return false;
      if (Array.isArray(x)) return x.some((y) => walk(y, false));
      if (x.type == "ThisExpression" || x.type == "Super") return true;
      if (
        !top &&
        (x.type == "FunctionExpression" ||
          x.type == "FunctionDeclaration" ||
          x.type == "ClassDeclaration" ||
          x.type == "ClassExpression")
      )
        return false;
      for (const k in x)
        if (k != "loc" && k != "__this" && walk(x[k], false)) return true;
      return false;
    };
    n.__this = walk(n.body, true);
  }
  return n.__this;
}
function* callFn(f: Fn, t: any, a: any[], box?: ThisBox, nt?: Cls): Gen {
  const n = f.n,
    env = new Env(f.env, f.name, true),
    nm = f.name + "()",
    prev = M.env;
  if (n.type != "ArrowFunctionExpression") {
    env.tb = box ?? { v: t, ready: true };
    env.home = f.home;
    env.nt = nt;
    env.showThis = usesThis(n);
  }
  if (n.params.every((p: Node) => p.type == "Identifier"))
    n.params.forEach((p: Node, k: number) => env.v.set(p.name, a[k]));
  else {
    try {
      for (let k = 0; k < n.params.length; k++) {
        const p = n.params[k];
        if (p.type == "RestElement")
          yield* bind(p.argument, a.slice(k), env, "let");
        else yield* bind(p, a[k], env, "let");
      }
    } catch (e: any) {
      if (n.async && e instanceof Thr) {
        const p = new P("rejected", e.v);
        M.ps.push(p);
        return p;
      }
      throw e;
    }
  }
  const run = function* (): Gen {
    if (n.expression) return yield* ev(n.body, env);
    const c = yield* body(n.body.body, env);
    return c && c.t == "ret" ? c.v : undefined;
  };
  if (n.async) {
    const p = new P();
    M.ps.push(p);
    step(run(), p, nm, undefined, false, env);
    M.env = prev;
    return p;
  }
  M.stack.push(nm);
  M.env = env;
  snap(
    "call",
    "Calling " +
      nm +
      " with (" +
      a.map((x) => fmt(x, true)).join(", ") +
      "). A new frame goes on top of the call stack, with its own scope.",
  );
  let r;
  try {
    r = yield* run();
  } finally {
    M.stack.pop();
  }
  M.env = prev;
  snap("ret", nm + " is done, so its frame is popped off the stack.");
  return r;
}
// Run an async function until its next await (or the end), then schedule the rest as a microtask.
function step(it: Gen, p: P, nm: string, v: any, thr: boolean, env: Env) {
  M.stack.push(nm);
  M.env = env;
  snap(
    "call",
    !M.resume
      ? "Calling async " +
          nm +
          ". It runs like a normal function until the first await."
      : nm + " wakes up and continues right after its await.",
  );
  M.resume = false;
  let r;
  try {
    r = thr ? it.throw(new Thr(v)) : it.next(v);
  } catch (e: any) {
    M.stack.pop();
    if (e instanceof Thr) {
      rejectP(p, e.v);
      return;
    }
    throw e;
  }
  if (r.done) {
    M.stack.pop();
    snap(
      "ret",
      nm + " finished, so its promise is resolved with the return value.",
    );
    resolveP(p, r.value);
    return;
  }
  snap(
    "await",
    "await pauses " +
      nm +
      ". The rest of its code is saved for later, the frame leaves the stack, and the caller carries on.",
  );
  M.stack.pop();
  const pr = r.value instanceof P ? r.value : new P("fulfilled", r.value);
  thenRaw(pr, {
    lab: "resume " + nm,
    onF: (x) => {
      M.resume = true;
      step(it, p, nm, x, false, env);
    },
    onR: (e) => {
      M.resume = true;
      step(it, p, nm, e, true, env);
    },
  });
}

function thenRaw(p: P, r: Reaction) {
  p.h = true;
  if (p.s == "pending") p.cbs.push(r);
  else react(p, r);
}
function react(p: P, r: Reaction) {
  enq(
    r.lab,
    () => {
      const h = p.s == "fulfilled" ? r.onF : r.onR;
      if (!h) {
        if (r.child) (p.s == "fulfilled" ? resolveP : rejectP)(r.child, p.v);
        return;
      }
      try {
        const v = h instanceof Fn ? sync(callFn(h, undefined, [p.v])) : h(p.v);
        if (r.child) resolveP(r.child, v);
      } catch (e: any) {
        if (e instanceof Thr && r.child) rejectP(r.child, e.v);
        else throw e;
      }
    },
    r.lab +
      " joins the microtask queue because the promise it waits for is settled.",
  );
}
function settle(p: P, s: "fulfilled" | "rejected", v: any) {
  if (p.s != "pending") return;
  p.s = s;
  p.v = v;
  const c = p.cbs;
  p.cbs = [];
  c.forEach((r) => react(p, r));
}
function resolveP(p: P, v: any) {
  if (p.s != "pending" || p.lock) return;
  if (v instanceof P) {
    p.lock = true;
    enq(
      "adopt inner promise",
      () =>
        thenRaw(v, {
          lab: "adopt",
          onF: (x) => settle(p, "fulfilled", x),
          onR: (e) => settle(p, "rejected", e),
        }),
      "Resolving a promise with another promise costs extra microtask ticks: the engine must “adopt” it.",
    );
  } else settle(p, "fulfilled", v);
}
function rejectP(p: P, e: any) {
  if (p.s == "pending" && !p.lock) settle(p, "rejected", e);
}
function tu(p: P, k: string, f: any, g: any) {
  const c = new P(),
    h = f || g;
  M.ps.push(c);
  thenRaw(p, {
    lab:
      "." + k + "(" + (h instanceof Fn ? h.name + " @L" + h.line : "…") + ")",
    onF: f instanceof Fn ? f : undefined,
    onR: g instanceof Fn ? g : undefined,
    child: c,
  });
  return c;
}
// .finally(f): runs f, then passes the original value or error on (as the spec does, through one more promise).
function tf(p: P, f: any) {
  const c = new P();
  M.ps.push(c);
  if (!(f instanceof Fn)) {
    thenRaw(p, { lab: ".finally(…)", child: c });
    return c;
  }
  const after = (lab: string, pass: () => any) => {
    const q = new P();
    thenRaw(PO.resolve(sync(callFn(f, undefined, []))), {
      lab,
      onF: pass,
      child: q,
    });
    return q;
  };
  thenRaw(p, {
    lab: ".finally(" + f.name + " @L" + f.line + ")",
    child: c,
    onF: (v) => after("finally passes the value on", () => v),
    onR: (e) =>
      after("finally passes the error on", () => {
        throw new Thr(e);
      }),
  });
  return c;
}
// Promise.all / Promise.race: watch every item; all waits for every value, race takes the first to settle.
function combine(xs: any, k: "all" | "race") {
  const p = new P();
  M.ps.push(p);
  let items: any[];
  try {
    items = iter(xs);
  } catch (e: any) {
    p.s = "rejected";
    p.v = e.v;
    return p;
  }
  const vals: any[] = [];
  let left = items.length;
  if (k == "all" && !left) settle(p, "fulfilled", vals);
  items.forEach((x, i) =>
    thenRaw(PO.resolve(x), {
      lab: "Promise." + k + " item " + (i + 1),
      onF:
        k == "all"
          ? (v) => {
              vals[i] = v;
              if (--left == 0) resolveP(p, vals);
            }
          : (v) => resolveP(p, v),
      onR: (e) => rejectP(p, e),
    }),
  );
  return p;
}
PO.resolve = (v) => (v instanceof P ? v : new P("fulfilled", v));
PO.reject = (e) => new P("rejected", e);
PO.all = (xs) => combine(xs, "all");
PO.race = (xs) => combine(xs, "race");

function setup(r: Env) {
  const d = (k: string, v: any) => r.v.set(k, v);
  const lg =
    (k: string) =>
    (...a: any[]) => {
      const s = a.map((x) => fmt(x)).join(" ");
      M.out.push((k == "log" ? "" : k + ": ") + s);
      snap("log", "console." + k + " prints “" + s + "” to the console.");
    };
  const cancel = (id: any) => {
    M.web = M.web.filter((w) => w.id != id);
    M.tasks = M.tasks.filter((w) => w.id != id);
  };
  d("console", { log: lg("log"), error: lg("error"), warn: lg("warn") });
  for (const k of [
    "Math",
    "JSON",
    "Object",
    "Array",
    "Number",
    "String",
    "Error",
    "TypeError",
    "parseInt",
    "parseFloat",
    "Map",
    "Set",
  ])
    d(k, (globalThis as any)[k]);
  d("undefined", undefined);
  d("NaN", NaN);
  d("Infinity", Infinity);
  d("Promise", PO);
  d("setTimeout", (f: any, ms: any, ...a: any[]) => {
    if (!(f instanceof Fn)) throw te("setTimeout needs a function");
    const id = ++M.seq;
    M.web.push({
      id,
      due: M.time + (+ms || 0),
      lab: "timer: " + f.name + " @L" + f.line,
      f,
      a,
    });
    snap(
      "timer",
      "setTimeout does not run the callback now. The browser (a Web API) starts a timer for " +
        (+ms || 0) +
        " ms; only then the callback can go to the task queue.",
    );
    return id;
  });
  d("setInterval", (f: any, ms: any, ...a: any[]) => {
    if (!(f instanceof Fn)) throw te("setInterval needs a function");
    const id = ++M.seq,
      every = Math.max(1, +ms || 0);
    M.web.push({
      id,
      due: M.time + every,
      lab: "interval: " + f.name + " @L" + f.line,
      f,
      a,
      every,
    });
    snap(
      "timer",
      "setInterval does not run the callback now. The browser starts a repeating timer: every " +
        every +
        " ms its callback goes to the task queue, until clearInterval stops it.",
    );
    return id;
  });
  d("clearTimeout", (id: any) => {
    cancel(id);
    snap("timer", "clearTimeout cancelled the timer.");
  });
  d("clearInterval", (id: any) => {
    cancel(id);
    snap("timer", "clearInterval stopped the repeating timer.");
  });
  d("queueMicrotask", (f: any) =>
    enq(
      "queueMicrotask: " + f.name + " @L" + f.line,
      () => sync(callFn(f, undefined, [])),
      "queueMicrotask puts the callback straight into the microtask queue.",
    ),
  );
}
function unc(e: any) {
  if (!(e instanceof Thr)) throw e;
  M.stack = [];
  M.out.push("Uncaught " + fmt(e.v));
  snap(
    "err",
    "Error thrown and nothing caught it: " +
      fmt(e.v) +
      ". The browser logs it and the event loop keeps going.",
  );
}
function loop() {
  for (;;) {
    if (M.micro.length) {
      const j = M.micro.shift()!;
      M.stack = [];
      M.env = null;
      M.loop = "micro";
      snap(
        "micro",
        "The call stack is empty, so the event loop empties the microtask queue first. Running: " +
          j.lab,
      );
      try {
        j.run();
      } catch (e) {
        unc(e);
      }
      continue;
    }
    if (M.tasks.length) {
      const t = M.tasks.shift()!;
      M.stack = [];
      M.env = null;
      M.loop = "task";
      snap(
        "task",
        "No microtasks left, so the event loop takes ONE task from the task queue: " +
          t.lab,
      );
      try {
        sync(callFn(t.f, undefined, t.a));
      } catch (e) {
        unc(e);
      }
      continue;
    }
    if (M.web.length) {
      M.web.sort((a, b) => a.due - b.due || a.id - b.id);
      M.time = Math.max(M.time, M.web[0].due);
      M.loop = "task";
      while (M.web.length && M.web[0].due <= M.time) {
        const w = M.web.shift()!;
        M.tasks.push(w);
        if (w.every) {
          // a repeating timer starts waiting for its next tick right away
          M.web.push({ ...w, due: w.due + w.every });
          snap(
            "timer",
            w.lab +
              " ticked. Its callback goes to the task queue, and the timer starts waiting for the next tick.",
          );
        } else
          snap(
            "timer",
            w.lab +
              " finished waiting. The browser moves its callback from Web APIs to the task queue.",
          );
      }
      continue;
    }
    break;
  }
  M.loop = "done";
  M.stack = [];
  M.env = null;
  M.line = 0;
  for (const p of M.ps)
    if (p.s == "rejected" && !p.h) {
      M.out.push("Uncaught (in promise) " + fmt(p.v));
      snap("err", "A promise was rejected and nothing handled it.");
    }
  snap("done", "Nothing left to run. The event loop is idle.");
}

function trace(src: string): TraceResult {
  SRC = src;
  const root = new Env(null, "root", true),
    g = new Env(root, "global", true);
  M = {
    root,
    g,
    env: g,
    stack: [],
    web: [],
    tasks: [],
    micro: [],
    out: [],
    steps: [],
    ps: [],
    time: 0,
    ops: 0,
    line: 1,
    loop: "sync",
    seq: 0,
    resume: false,
  };
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 2022, locations: true });
  } catch (e: any) {
    return {
      steps: [],
      err:
        "Syntax error: " +
        e.message +
        (/await/.test(src)
          ? " (top-level await is not supported; wrap it in an async function)."
          : ""),
    };
  }
  const bad: string[] = [];
  scan(ast, bad);
  if (bad.length)
    return {
      steps: [],
      err: "Not supported yet: " + [...new Set(bad)].join("; ") + ".",
    };
  setup(root);
  try {
    M.stack = ["main script"];
    snap(
      "start",
      "The whole script runs as ONE task on the call stack. Lines run top to bottom.",
    );
    try {
      sync(body((ast as Node).body, g));
    } catch (e) {
      unc(e);
    }
    M.stack = [];
    M.env = null;
    M.line = 0;
    snap(
      "ret",
      "The main script is finished and the stack is empty. Now the event loop checks the queues.",
    );
    loop();
  } catch (e: any) {
    if (e instanceof Unsup) return { steps: M.steps, err: e.m };
    return { steps: M.steps, err: "Internal simulator error: " + e.message };
  }
  return { steps: M.steps };
}
export { trace };
