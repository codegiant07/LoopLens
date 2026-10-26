// @ts-nocheck  (engine extracted from the phase 1 prototype; internals get strict types in phase 3)
import * as acorn from 'acorn';

class Fn{constructor(n,env){this.n=n;this.env=env;this.name=n.id?n.id.name:'callback';this.line=n.loc.start.line}}
class P{constructor(s,v){this.s=s||'pending';this.v=v;this.cbs=[]}}
class Thr{constructor(v){this.v=v}}
class Unsup{constructor(m){this.m=m}}
class Env{constructor(p,name,fn){this.p=p;this.name=name;this.fn=fn;this.v=new Map();this.c=new Set()}}
let M,SRC=[];
const PO={},te=m=>new Thr(new TypeError(m)),sync=g=>{let r=g.next();while(!r.done)r=g.next();return r.value},has=(e,k)=>{for(;e;e=e.p)if(e.v.has(k))return 1;return 0};
const BIN={'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>a/b,'%':(a,b)=>a%b,'**':(a,b)=>a**b,'==':(a,b)=>a==b,'!=':(a,b)=>a!=b,'===':(a,b)=>a===b,'!==':(a,b)=>a!==b,'<':(a,b)=>a<b,'<=':(a,b)=>a<=b,'>':(a,b)=>a>b,'>=':(a,b)=>a>=b};
const bop=o=>{const f=BIN[o];if(!f)throw new Unsup('Operator '+o+' is not supported yet.');return f};
const OK=new Set('Program ExpressionStatement VariableDeclaration VariableDeclarator FunctionDeclaration FunctionExpression ArrowFunctionExpression BlockStatement ReturnStatement IfStatement ForStatement ForOfStatement WhileStatement BreakStatement ContinueStatement ThrowStatement TryStatement CatchClause EmptyStatement Literal Identifier TemplateLiteral TemplateElement BinaryExpression LogicalExpression UnaryExpression UpdateExpression AssignmentExpression CallExpression MemberExpression NewExpression ArrayExpression ObjectExpression Property AwaitExpression ConditionalExpression'.split(' '));
function scan(n,b){if(!n||typeof n!='object')return;if(Array.isArray(n))return n.forEach(x=>scan(x,b));if(!n.type)return;
if(!OK.has(n.type)||n.generator||n.regex||(n.type=='Property'&&n.kind!='init'))b.push(n.type+(n.regex?' (regex)':'')+' on line '+n.loc.start.line);for(const k in n)if(k!='loc')scan(n[k],b)}
function fmt(v,q,d=0){if(typeof v=='string')return q?"'"+v+"'":v;if(v instanceof Fn)return 'ƒ '+v.name;
if(v instanceof P)return 'Promise {'+(v.s=='pending'?'<pending>':(v.s=='rejected'?'<rejected> ':'')+fmt(v.v,1,d+1))+'}';
if(v instanceof Error)return v.name+': '+v.message;if(Array.isArray(v))return d>1?'[…]':'['+v.map(x=>fmt(x,1,d+1)).join(', ')+']';
if(v&&typeof v=='object')return d>1?'{…}':'{'+Object.keys(v).map(k=>k+': '+fmt(v[k],1,d+1)).join(', ')+'}';return String(v)}
function scopes(){const r=[];for(let e=M.env||M.g;e&&e!==M.root;e=e.p)if(e.v.size)r.push([e.name,[...e.v].map(([k,v])=>[k,fmt(v,1)])]);return r}
function snap(k,note){if(M.steps.length>3000)throw new Unsup('Stopped after 3,000 steps to keep the page responsive.');
M.steps.push({k,note,line:M.line,stack:[...M.stack],web:M.web.map(w=>w.lab+' (at '+w.due+' ms)'),tasks:M.tasks.map(t=>t.lab),micro:M.micro.map(t=>t.lab),out:[...M.out],scope:scopes(),loop:M.loop,time:M.time})}
const enq=(lab,run,note)=>{M.micro.push({lab,run});snap('enq',note)};
function look(e,k){for(;e;e=e.p)if(e.v.has(k))return e.v.get(k);throw new Thr(new ReferenceError(k+' is not defined'))}
function put(e,k,v){for(;e;e=e.p)if(e.v.has(k)){if(e.c.has(k))throw te('Assignment to constant variable.');e.v.set(k,v);return}throw new Thr(new ReferenceError(k+' is not defined'))}
function decl(e,k,v,kind){if(kind=='var')while(!e.fn)e=e.p;e.v.set(k,v);if(kind=='const')e.c.add(k)}
function gm(o,k){if(o==null)throw te("Cannot read properties of "+o+" (reading '"+k+"')");if(k=='constructor'||k=='__proto__'||k=='prototype')throw new Unsup('Access to “'+k+'” is blocked.');
if(o instanceof P)return k=='then'?(f,g)=>tu(o,'then',f,g):k=='catch'?g=>tu(o,'catch',undefined,g):undefined;if(o instanceof Fn)return k=='name'?o.name:undefined;return o[k]}
function* asg(L,v,env){if(L.type=='Identifier')return put(env,L.name,v);const o=yield*ev(L.object,env),k=L.computed?yield*ev(L.property,env):L.property.name;if(o==null)throw te('Cannot set properties of '+o);o[k]=v}
function* call(f,t,a,nm){if(f instanceof Fn)return yield*callFn(f,t,a);if(typeof f!='function')throw te(nm+' is not a function (or this simulator does not support it)');try{return f.apply(t,a)}catch(e){throw e instanceof Error?new Thr(e):e}}
function* arrCb(k,arr,f){const o=[];for(let j=0;j<arr.length;j++){const v=yield*callFn(f,undefined,[arr[j],j,arr]);if(k=='map')o.push(v);else if(k=='filter'&&v)o.push(arr[j])}return k=='forEach'?undefined:o}
function* ev(n,env){switch(n.type){
case'Literal':return n.value;case'Identifier':return look(env,n.name);
case'FunctionExpression':case'ArrowFunctionExpression':return new Fn(n,env);
case'TemplateLiteral':{let s='';for(let k=0;k<n.quasis.length;k++){s+=n.quasis[k].value.cooked;if(k<n.expressions.length)s+=fmt(yield*ev(n.expressions[k],env))}return s}
case'BinaryExpression':{const a=yield*ev(n.left,env),b=yield*ev(n.right,env);return bop(n.operator)(a,b)}
case'LogicalExpression':{const a=yield*ev(n.left,env),o=n.operator;return(o=='&&'?!a:o=='||'?a:a!=null)?a:yield*ev(n.right,env)}
case'UnaryExpression':{if(n.operator=='typeof'&&n.argument.type=='Identifier'&&!has(env,n.argument.name))return'undefined';const a=yield*ev(n.argument,env);
switch(n.operator){case'typeof':return a instanceof Fn?'function':typeof a;case'!':return!a;case'-':return-a;case'+':return+a;case'void':return;default:throw new Unsup('Operator '+n.operator+' is not supported yet.')}}
case'ConditionalExpression':return(yield*ev(n.test,env))?yield*ev(n.consequent,env):yield*ev(n.alternate,env);
case'ArrayExpression':{const r=[];for(const x of n.elements)r.push(yield*ev(x,env));return r}
case'ObjectExpression':{const o={};for(const p of n.properties){const k=p.computed?yield*ev(p.key,env):(p.key.name??p.key.value),v=yield*ev(p.value,env);if(v instanceof Fn&&v.name=='callback')v.name=String(k);o[k]=v}return o}
case'MemberExpression':{const o=yield*ev(n.object,env);return gm(o,n.computed?yield*ev(n.property,env):n.property.name)}
case'AwaitExpression':return yield(yield*ev(n.argument,env));
case'AssignmentExpression':{let v=yield*ev(n.right,env);if(n.operator!='='){const f=bop(n.operator.slice(0,-1));v=f(yield*ev(n.left,env),v)}yield*asg(n.left,v,env);return v}
case'UpdateExpression':{const o=yield*ev(n.argument,env),nv=n.operator=='++'?o+1:o-1;yield*asg(n.argument,nv,env);return n.prefix?nv:o}
case'CallExpression':{const c=n.callee;let t,f,k;if(c.type=='MemberExpression'){t=yield*ev(c.object,env);k=c.computed?yield*ev(c.property,env):c.property.name;f=gm(t,k)}else f=yield*ev(c,env);
const a=[];for(const x of n.arguments)a.push(yield*ev(x,env));if(Array.isArray(t)&&['map','forEach','filter'].includes(k)&&a[0] instanceof Fn)return yield*arrCb(k,t,a[0]);return yield*call(f,t,a,k||c.name||'value')}
case'NewExpression':{const f=yield*ev(n.callee,env),a=[];for(const x of n.arguments)a.push(yield*ev(x,env));
if(f===PO){const p=new P();M.ps.push(p);if(!(a[0] instanceof Fn))throw te('Promise resolver is not a function');try{yield*callFn(a[0],undefined,[v=>resolveP(p,v),e=>rejectP(p,e)])}catch(e){if(e instanceof Thr)rejectP(p,e.v);else throw e}return p}
if(f instanceof Fn)throw new Unsup('new on your own functions is not supported yet.');return Reflect.construct(f,a)}
default:throw new Unsup(n.type+' is not supported.')}}
const NOTE={VariableDeclaration:'make a variable and store its value.',IfStatement:'check the condition and run only the matching branch.',ForStatement:'start a loop: it checks the condition before every round.',WhileStatement:'loop while the condition is true.',ForOfStatement:'loop over each item.',ReturnStatement:'send a value back to the caller and leave the function.',ThrowStatement:'throw an error: jump to the nearest catch.',TryStatement:'run the block; if it throws, run catch.',ExpressionStatement:'run this expression.',BreakStatement:'leave the loop.',ContinueStatement:'skip to the next round.'};
function hoist(ss,env){for(const s of ss)if(s.type=='FunctionDeclaration')env.v.set(s.id.name,new Fn(s,env))}
function* body(ss,env){hoist(ss,env);for(const s of ss){const c=yield*ex(s,env);if(c)return c}}
function* ex(n,env){if(++M.ops>40000)throw new Unsup('Stopped after 40,000 operations (possible infinite loop).');M.line=n.loc.start.line;M.env=env;const T=n.type;
if(T!='BlockStatement'&&T!='FunctionDeclaration'&&T!='EmptyStatement'&&!(T=='ExpressionStatement'&&/Call|Await/.test(n.expression.type)))snap('run','Line '+M.line+': '+NOTE[T].replace(/^./,c=>c.toUpperCase()).replace(/\.$/,'')+'. Code: '+SRC.slice(n.start,n.end).split('\n')[0].slice(0,60));
switch(T){
case'ExpressionStatement':yield*ev(n.expression,env);return;
case'VariableDeclaration':for(const d of n.declarations){const v=d.init?yield*ev(d.init,env):undefined;if(v instanceof Fn&&v.name=='callback')v.name=d.id.name;decl(env,d.id.name,v,n.kind)}return;
case'ReturnStatement':return{t:'ret',v:n.argument?yield*ev(n.argument,env):undefined};
case'BreakStatement':return{t:'brk'};case'ContinueStatement':return{t:'cnt'};
case'ThrowStatement':throw new Thr(yield*ev(n.argument,env));
case'BlockStatement':return yield*body(n.body,new Env(env,'block'));
case'IfStatement':if(yield*ev(n.test,env))return yield*ex(n.consequent,env);if(n.alternate)return yield*ex(n.alternate,env);return;
case'WhileStatement':while(yield*ev(n.test,env)){const c=yield*ex(n.body,env);if(c){if(c.t=='ret')return c;if(c.t=='brk')break}}return;
case'ForStatement':{let le=new Env(env,'loop');if(n.init)n.init.type=='VariableDeclaration'?yield*ex(n.init,le):yield*ev(n.init,le);
while(!n.test||(yield*ev(n.test,le))){const c=yield*ex(n.body,new Env(le,'block'));if(c){if(c.t=='ret')return c;if(c.t=='brk')break}const ne=new Env(env,'loop');le.v.forEach((v,k)=>ne.v.set(k,v));le.c.forEach(k=>ne.c.add(k));le=ne;if(n.update)yield*ev(n.update,le)}return}
case'ForOfStatement':{for(const x of Array.from(yield*ev(n.right,env))){const le=new Env(env,'loop');decl(le,n.left.declarations[0].id.name,x,n.left.kind);const c=yield*ex(n.body,le);if(c){if(c.t=='ret')return c;if(c.t=='brk')break}}return}
case'TryStatement':{let c;try{try{c=yield*ex(n.block,env)}catch(e){if(e instanceof Error)e=new Thr(e);if(e instanceof Thr&&n.handler){const ce=new Env(env,'catch');if(n.handler.param)ce.v.set(n.handler.param.name,e.v);c=yield*ex(n.handler.body,ce)}else throw e}}finally{if(n.finalizer)yield*ex(n.finalizer,env)}return c}
default:return}}
function* callFn(f,t,a){const n=f.n,env=new Env(f.env,f.name,true),nm=f.name+'()',prev=M.env;n.params.forEach((p,k)=>env.v.set(p.name,a[k]));
const run=function*(){if(n.expression)return yield*ev(n.body,env);const c=yield*body(n.body.body,env);return c&&c.t=='ret'?c.v:undefined};
if(n.async){const p=new P();M.ps.push(p);step(run(),p,nm,undefined,0,env);M.env=prev;return p}
M.stack.push(nm);M.env=env;snap('call','Calling '+nm+' with ('+a.map(x=>fmt(x,1)).join(', ')+'). A new frame goes on top of the call stack, with its own scope.');let r;
try{r=yield*run()}finally{M.stack.pop()}M.env=prev;snap('ret',nm+' is done, so its frame is popped off the stack.');return r}
function step(it,p,nm,v,thr,env){M.stack.push(nm);M.env=env;snap(thr===undefined?'call':'call',env&&!M.resume?'Calling async '+nm+'. It runs like a normal function until the first await.':nm+' wakes up and continues right after its await.');M.resume=0;let r;
try{r=thr?it.throw(new Thr(v)):it.next(v)}catch(e){M.stack.pop();if(e instanceof Thr){rejectP(p,e.v);return}throw e}
if(r.done){M.stack.pop();snap('ret',nm+' finished, so its promise is resolved with the return value.');resolveP(p,r.value);return}
snap('await','await pauses '+nm+'. The rest of its code is saved for later, the frame leaves the stack, and the caller carries on.');M.stack.pop();
const pr=r.value instanceof P?r.value:new P('fulfilled',r.value);
thenRaw(pr,{lab:'resume '+nm,onF:x=>{M.resume=1;step(it,p,nm,x,0,env)},onR:e=>{M.resume=1;step(it,p,nm,e,1,env)}})}
function thenRaw(p,r){p.h=1;p.s=='pending'?p.cbs.push(r):react(p,r)}
function react(p,r){enq(r.lab,()=>{const h=p.s=='fulfilled'?r.onF:r.onR;if(!h){if(r.child)(p.s=='fulfilled'?resolveP:rejectP)(r.child,p.v);return}
try{const v=h instanceof Fn?sync(callFn(h,undefined,[p.v])):h(p.v);if(r.child)resolveP(r.child,v)}catch(e){if(e instanceof Thr&&r.child)rejectP(r.child,e.v);else throw e}},r.lab+' joins the microtask queue because the promise it waits for is settled.')}
function settle(p,s,v){if(p.s!='pending')return;p.s=s;p.v=v;const c=p.cbs;p.cbs=[];c.forEach(r=>react(p,r))}
function resolveP(p,v){if(p.s!='pending'||p.lock)return;if(v instanceof P){p.lock=1;enq('adopt inner promise',()=>thenRaw(v,{lab:'adopt',onF:x=>settle(p,'fulfilled',x),onR:e=>settle(p,'rejected',e)}),'Resolving a promise with another promise costs extra microtask ticks: the engine must “adopt” it.')}else settle(p,'fulfilled',v)}
function rejectP(p,e){if(p.s=='pending'&&!p.lock)settle(p,'rejected',e)}
function tu(p,k,f,g){const c=new P(),h=f||g;M.ps.push(c);thenRaw(p,{lab:'.'+k+'('+(h instanceof Fn?h.name+' @L'+h.line:'…')+')',onF:f instanceof Fn?f:undefined,onR:g instanceof Fn?g:undefined,child:c});return c}
PO.resolve=v=>v instanceof P?v:new P('fulfilled',v);PO.reject=e=>new P('rejected',e);
function setup(r){const d=(k,v)=>r.v.set(k,v),lg=k=>(...a)=>{const s=a.map(x=>fmt(x)).join(' ');M.out.push((k=='log'?'':k+': ')+s);snap('log','console.'+k+' prints “'+s+'” to the console.')};
d('console',{log:lg('log'),error:lg('error'),warn:lg('warn')});for(const k of['Math','JSON','Object','Array','Number','String','Error','TypeError','parseInt','parseFloat','Map','Set'])d(k,globalThis[k]);
d('undefined',undefined);d('NaN',NaN);d('Infinity',Infinity);d('Promise',PO);
d('setTimeout',(f,ms,...a)=>{if(!(f instanceof Fn))throw te('setTimeout needs a function');const id=++M.seq;M.web.push({id,due:M.time+(+ms||0),lab:'timer: '+f.name+' @L'+f.line,f,a});snap('timer','setTimeout does not run the callback now. The browser (a Web API) starts a timer for '+(+ms||0)+' ms; only then the callback can go to the task queue.');return id});
d('clearTimeout',id=>{M.web=M.web.filter(w=>w.id!=id);snap('timer','clearTimeout cancelled the timer.')});
d('queueMicrotask',f=>enq('queueMicrotask: '+f.name+' @L'+f.line,()=>sync(callFn(f,undefined,[])),'queueMicrotask puts the callback straight into the microtask queue.'))}
function unc(e){if(e instanceof Thr){M.stack=[];M.out.push('Uncaught '+fmt(e.v));snap('err','Error thrown and nothing caught it: '+fmt(e.v)+'. The browser logs it and the event loop keeps going.')}else throw e}
function loop(){for(;;){
if(M.micro.length){const j=M.micro.shift();M.stack=[];M.env=null;M.loop='micro';snap('micro','The call stack is empty, so the event loop empties the microtask queue first. Running: '+j.lab);try{j.run()}catch(e){unc(e)}continue}
if(M.tasks.length){const t=M.tasks.shift();M.stack=[];M.env=null;M.loop='task';snap('task','No microtasks left, so the event loop takes ONE task from the task queue: '+t.lab);try{sync(callFn(t.f,undefined,t.a))}catch(e){unc(e)}continue}
if(M.web.length){M.web.sort((a,b)=>a.due-b.due||a.id-b.id);M.time=Math.max(M.time,M.web[0].due);M.loop='task';while(M.web.length&&M.web[0].due<=M.time){const w=M.web.shift();M.tasks.push(w);snap('timer',w.lab+' finished waiting. The browser moves its callback from Web APIs to the task queue.')}continue}break}
M.loop='done';M.stack=[];M.env=null;M.line=0;for(const p of M.ps)if(p.s=='rejected'&&!p.h){M.out.push('Uncaught (in promise) '+fmt(p.v));snap('err','A promise was rejected and nothing handled it.')}snap('done','Nothing left to run. The event loop is idle.')}
function trace(src){SRC=src;const root=new Env(null,'root',true),g=new Env(root,'global',true);M={root,g,env:g,stack:[],web:[],tasks:[],micro:[],out:[],steps:[],ps:[],time:0,ops:0,line:1,loop:'sync',seq:0};
let ast;try{ast=acorn.parse(src,{ecmaVersion:2022,locations:true})}catch(e){return{steps:[],err:'Syntax error: '+e.message+(/await/.test(src)?' (top-level await is not supported; wrap it in an async function).':'')}}
const bad=[];scan(ast,bad);if(bad.length)return{steps:[],err:'Not supported yet: '+[...new Set(bad)].join('; ')+'.'};
setup(root);try{M.stack=['main script'];snap('start','The whole script runs as ONE task on the call stack. Lines run top to bottom.');try{sync(body(ast.body,g))}catch(e){unc(e)}
M.stack=[];M.env=null;M.line=0;snap('ret','The main script is finished and the stack is empty. Now the event loop checks the queues.');loop()}catch(e){if(e instanceof Unsup)return{steps:M.steps,err:e.m};return{steps:M.steps,err:'Internal simulator error: '+e.message}}return{steps:M.steps}}
export {trace};
