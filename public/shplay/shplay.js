//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (e, t) => () => (e && (t = e(e = 0)), t), n = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, r = class {
	_dense = [];
	_sparse = [];
	_count = 0;
	add(e) {
		let t = this._sparse[e];
		return t !== void 0 && t >= 0 && t < this._count && this._dense[t] === e ? !1 : (this._sparse[e] = this._count, this._dense[this._count++] = e, !0);
	}
	remove(e) {
		let t = this._sparse[e];
		if (t === void 0 || t < 0 || t >= this._count || this._dense[t] !== e) return !1;
		this._count--;
		let n = this._dense[this._count];
		return this._dense[t] = n, this._sparse[n] = t, this._sparse[e] = -1, !0;
	}
	has(e) {
		let t = this._sparse[e];
		return t !== void 0 && t >= 0 && t < this._count && this._dense[t] === e;
	}
	get dense() {
		return this._dense;
	}
	get count() {
		return this._count;
	}
	[Symbol.iterator]() {
		let e = 0, t = this._dense, n = this._count;
		return { next() {
			return e < n ? {
				value: t[e++],
				done: !1
			} : {
				done: !0,
				value: void 0
			};
		} };
	}
}, i = class {
	_set = new r();
	_nextId = 1;
	_freelist = [];
	add() {
		let e = this._freelist.length > 0 ? this._freelist.pop() : this._nextId++;
		return this._set.add(e), e;
	}
	remove(e) {
		this._set.remove(e) && this._freelist.push(e);
	}
	exists(e) {
		return this._set.has(e);
	}
	all() {
		return this._set._dense.slice(0, this._set._count);
	}
	get dense() {
		return this._set._dense;
	}
	get alive() {
		return this._set._count;
	}
	get count() {
		return this._set._count;
	}
}, a = 31, o = class {
	_nextBit = 0;
	_gen = 0;
	_map = /* @__PURE__ */ new Map();
	_masks = [[]];
	has(e, t) {
		let n = this._map.get(t);
		return n ? ((this._masks[n.gen][e] ?? 0) & n.bit) !== 0 : !1;
	}
	add(e, t) {
		let n = this.ensure(t), r = this._masks[n.gen][e] ?? 0;
		return r & n.bit ? !1 : (this._masks[n.gen][e] = r | n.bit, !0);
	}
	remove(e, t) {
		let n = this._map.get(t);
		if (!n) return !1;
		let r = this._masks[n.gen][e] ?? 0;
		return r & n.bit ? (this._masks[n.gen][e] = r & ~n.bit, !0) : !1;
	}
	getAll(e) {
		let t = [];
		for (let [n, r] of this._map) (this._masks[r.gen][e] ?? 0) & r.bit && t.push(n);
		return t;
	}
	clear(e) {
		for (let t = 0; t <= this._gen; t++) this._masks[t][e] = 0;
	}
	ensure(e) {
		let t = this._map.get(e);
		return t || (this._nextBit >= a && (this._gen++, this._nextBit = 0, this._masks.push([])), t = {
			gen: this._gen,
			bit: 1 << this._nextBit++
		}, this._map.set(e, t), t);
	}
};
function s(e) {
	return (...t) => ({
		type: e,
		terms: t
	});
}
var c = s("add"), l = s("remove"), u = class {
	_observers = [];
	subscribe(e, t) {
		let n = {
			hook: e,
			callback: t
		};
		return this._observers.push(n), () => {
			let e = this._observers.indexOf(n);
			e >= 0 && this._observers.splice(e, 1);
		};
	}
	notifyAdd(e, t, n) {
		for (let { hook: r, callback: i } of this._observers) r.type === "add" && this.triggered(e, r.terms, t, n) && i(e);
	}
	notifyRemove(e, t, n) {
		for (let { hook: r, callback: i } of this._observers) r.type === "remove" && this.triggered(e, r.terms, t, n) && i(e);
	}
	triggered(e, t, n, r) {
		let i = !1;
		for (let a of t) if (a === n) i = !0;
		else if (!r.has(e, a)) return !1;
		return i;
	}
}, d = Symbol("qop"), f = Symbol("hop");
function p(e) {
	return typeof e == "object" && !!e && d in e;
}
function m(e) {
	return typeof e == "object" && !!e && f in e;
}
function h(...e) {
	return {
		[d]: "not",
		components: e
	};
}
function g(e) {
	return {
		[f]: !0,
		relation: e
	};
}
function _(e) {
	let t = [], n = [], r = [], i = null;
	for (let a of e) if (m(a)) i = a;
	else if (p(a)) {
		let e = a[d];
		e === "not" ? n.push(...a.components) : e === "and" ? t.push(...a.components) : e === "or" && r.push(a.components);
	} else t.push(a);
	return {
		required: t,
		excluded: n,
		orGroups: r,
		hierarchy: i
	};
}
function v(e, t, n) {
	for (let r of t.required) if (!n.has(e, r)) return !1;
	for (let r of t.excluded) if (n.has(e, r)) return !1;
	for (let r of t.orGroups) {
		let t = !1;
		for (let i of r) if (n.has(e, i)) {
			t = !0;
			break;
		}
		if (!t) return !1;
	}
	return !0;
}
var y = class {
	_queries = [];
	_hashMap = /* @__PURE__ */ new Map();
	_componentIds = /* @__PURE__ */ new Map();
	_nextComponentId = 0;
	register(e, t, n, i) {
		let a = this.hash(e), o = this._hashMap.get(a);
		if (o) return o;
		let s = /* @__PURE__ */ new Set();
		for (let t of e.required) s.add(t);
		for (let t of e.excluded) s.add(t);
		for (let t of e.orGroups) for (let e of t) s.add(e);
		let c = new r();
		for (let r = 0; r < i; r++) {
			let i = n[r];
			v(i, e, t) && c.add(i);
		}
		return o = {
			compiled: e,
			set: c,
			allComponents: s,
			sortedCache: null,
			sortedDirty: !0
		}, this._queries.push(o), this._hashMap.set(a, o), o;
	}
	onComponentChanged(e, t, n) {
		for (let r = 0; r < this._queries.length; r++) {
			let i = this._queries[r];
			i.allComponents.has(t) && (v(e, i.compiled, n) ? i.set.add(e) && (i.sortedDirty = !0) : i.set.remove(e) && (i.sortedDirty = !0));
		}
	}
	onEntityRemoved(e) {
		for (let t = 0; t < this._queries.length; t++) {
			let n = this._queries[t];
			n.set.remove(e) && (n.sortedDirty = !0);
		}
	}
	clear() {
		this._queries.length = 0, this._hashMap.clear(), this._componentIds.clear(), this._nextComponentId = 0;
	}
	componentId(e) {
		let t = this._componentIds.get(e);
		return t === void 0 && (t = this._nextComponentId++, this._componentIds.set(e, t)), t;
	}
	hash(e) {
		let t = e.required.map((e) => this.componentId(e)).sort((e, t) => e - t), n = e.excluded.map((e) => this.componentId(e)).sort((e, t) => e - t), r = e.orGroups.map((e) => e.map((e) => this.componentId(e)).sort((e, t) => e - t).join(",")).sort();
		return `${t.join(",")};${n.join(",")};${r.join("|")}`;
	}
};
//#endregion
//#region ../../shallot/packages/shallot/src/engine/ecs/strings.ts
function b(e) {
	return e.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").toLowerCase();
}
function x(e) {
	return e.replace(/-([a-z])/g, (e, t) => t.toUpperCase());
}
function S(e) {
	return "0x" + (e >>> 0).toString(16).padStart(6, "0");
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/ecs/relation.ts
var C = Symbol("rel"), w = Symbol("target"), T = Symbol("pair"), ee = Symbol("exclusive"), E = Symbol("autoRemove"), te = /* @__PURE__ */ new Map(), D = Object.freeze([]);
function O(e, t) {
	let n = te.get(e);
	n || (n = /* @__PURE__ */ new Map(), te.set(e, n));
	let r = n.get(t);
	return r || (r = {
		[T]: !0,
		[C]: e,
		[w]: t
	}, n.set(t, r)), r;
}
function ne(e) {
	let t = ((e) => O(t, e));
	return t[C] = !0, e?.exclusive && (t[ee] = !0), e?.autoRemoveSubject && (t[E] = !0), t;
}
function re(e, t) {
	return typeof e == "function" && e[C] ? e(t) : O(e, t);
}
function ie(e) {
	return typeof e == "object" && !!e && e[T] === !0;
}
function ae(e) {
	return e?.[C];
}
function oe(e) {
	return e?.[w];
}
var se = ne(), ce = class {
	_relations = /* @__PURE__ */ new Map();
	_reverse = /* @__PURE__ */ new Map();
	_host;
	constructor(e) {
		this._host = e;
	}
	add(e, t, n) {
		if (t[ee]) for (let r of this.targets(e, t)) r !== n && this.remove(e, t, r);
		let r = this._relations.get(e);
		r || (r = /* @__PURE__ */ new Map(), this._relations.set(e, r));
		let i = r.get(t);
		i || (i = /* @__PURE__ */ new Set(), r.set(t, i)), i.add(n);
		let a = this._reverse.get(n);
		a || (a = /* @__PURE__ */ new Set(), this._reverse.set(n, a)), a.add(e);
		let o = O(t, n), s = O(t, se);
		this._host.components.add(e, o), this._host.components.add(e, s), this._host.notifyQueryChanged(e, o), this._host.notifyQueryChanged(e, s), this._host.notifyAdd(e, o), this._host.notifyAdd(e, s);
	}
	remove(e, t, n) {
		let r = this._relations.get(e);
		if (!r) return;
		let i = r.get(t);
		if (!i?.has(n)) return;
		i.delete(n);
		let a = O(t, n);
		if (this._host.notifyRemove(e, a), this._host.components.remove(e, a), this._host.notifyQueryChanged(e, a), i.size === 0) {
			r.delete(t);
			let n = O(t, se);
			this._host.notifyRemove(e, n), this._host.components.remove(e, n), this._host.notifyQueryChanged(e, n);
		}
		this._reverse.get(n)?.delete(e);
	}
	targets(e, t) {
		let n = this._relations.get(e)?.get(t);
		if (!n) return D;
		let r = [];
		for (let e of n) r.push(e);
		return r;
	}
	onEntityRemoved(e) {
		let t = this._relations.get(e);
		if (t) {
			for (let [n, r] of t) for (let t of r) {
				let r = O(n, t);
				this._host.notifyRemove(e, r), this._host.components.remove(e, r), this._reverse.get(t)?.delete(e);
			}
			this._relations.delete(e);
		}
		let n = this._reverse.get(e);
		if (!n) return;
		let r = [];
		for (let t of n) {
			let n = this._relations.get(t);
			if (n) for (let [i, a] of n) {
				if (!a.has(e)) continue;
				a.delete(e);
				let o = O(i, e);
				if (this._host.notifyRemove(t, o), this._host.components.remove(t, o), this._host.notifyQueryChanged(t, o), a.size === 0) {
					n.delete(i);
					let e = O(i, se);
					this._host.notifyRemove(t, e), this._host.components.remove(t, e), this._host.notifyQueryChanged(t, e);
				}
				i[E] && r.push(t);
			}
		}
		this._reverse.delete(e);
		for (let e of r) this._host.entityExists(e) && this._host.removeEntity(e);
	}
}, le = /* @__PURE__ */ new Map();
function k(e, t) {
	let n = ne({
		exclusive: t?.exclusive,
		autoRemoveSubject: t?.autoRemoveSubject
	}), r = {
		name: b(e),
		relation: n,
		exclusive: t?.exclusive,
		autoRemoveSubject: t?.autoRemoveSubject
	};
	return le.set(r.name, r), r;
}
function ue(e) {
	return le.get(b(e));
}
function de(e) {
	le.set(e.name, e);
}
var fe = k("child-of", {
	exclusive: !0,
	autoRemoveSubject: !0
}), pe = k("target", { exclusive: !0 }), me = class extends Error {
	constructor(e = "Circular dependency detected") {
		super(e), this.name = "CycleError";
	}
};
function he(e, t) {
	if (e.length === 0) return [];
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
	for (let t of e) n.set(t, /* @__PURE__ */ new Set()), r.set(t, 0);
	for (let [e, i] of t) !n.has(e) || !n.has(i) || (n.get(e).add(i), r.set(i, r.get(i) + 1));
	ge(e, n);
	let i = [], a = [];
	for (let t of e) r.get(t) === 0 && i.push(t);
	for (; i.length > 0;) {
		let e = i.shift();
		a.push(e);
		for (let t of n.get(e)) {
			let e = r.get(t) - 1;
			r.set(t, e), e === 0 && i.push(t);
		}
	}
	return a;
}
function ge(e, t) {
	let n = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
	function i(e) {
		if (r.has(e)) return !0;
		if (n.has(e)) return !1;
		n.add(e), r.add(e);
		for (let n of t.get(e)) if (i(n)) return !0;
		return r.delete(e), !1;
	}
	for (let t of e) if (i(t)) throw new me();
}
var _e = {
	FIXED_DT: 1 / 60,
	DEFAULT_DT: 1 / 60,
	MAX_FIXED_STEPS: 4
}, ve = class extends Error {
	constructor(e) {
		super(e), this.name = "OrderingError";
	}
}, ye = class {
	_systems = /* @__PURE__ */ new Set();
	_systemsVersion = 0;
	_accumulator = 0;
	_initialized = /* @__PURE__ */ new WeakSet();
	_cache = /* @__PURE__ */ new Map();
	_cacheVersion = -1;
	_time = {
		deltaTime: 0,
		rawDeltaTime: 0,
		fixedDeltaTime: _e.FIXED_DT,
		elapsed: 0,
		fixedSteps: 0,
		fixedTick: 0,
		throttled: !1,
		fenceWaitMs: 0
	};
	_names = /* @__PURE__ */ new Map();
	_nameCounters = /* @__PURE__ */ new Map();
	_cpu = /* @__PURE__ */ new Map();
	mode = void 0;
	get systems() {
		return this._systems;
	}
	get systemsVersion() {
		return this._systemsVersion;
	}
	get accumulator() {
		return this._accumulator;
	}
	set accumulator(e) {
		this._accumulator = e;
	}
	get time() {
		return this._time;
	}
	get cpu() {
		return this._cpu;
	}
	reportCpu(e, t) {
		this._cpu.set(e, (this._cpu.get(e) ?? 0) + t);
	}
	reportFenceWait(e) {
		this._time.fenceWaitMs = e;
	}
	register(e, t) {
		if (this._systems.add(e), this._systemsVersion++, t !== void 0) {
			let n = t || "?", r = this._nameCounters.get(n) ?? 0;
			this._nameCounters.set(n, r + 1), this._names.set(e, `${n}/${r}`);
		}
	}
	unregister(e) {
		this._systems.delete(e) && this._systemsVersion++;
	}
	step(e, t = _e.DEFAULT_DT) {
		let n = _e.FIXED_DT, r = n * _e.MAX_FIXED_STEPS;
		this._cpu.clear(), this._time.rawDeltaTime = t, this._time.throttled = t > r, t = Math.min(t, r), this._time.deltaTime = t, this._time.elapsed += t, this._accumulator += t, this.runGroup(e, "setup");
		let i = 0;
		for (; this._accumulator >= n;) this._time.deltaTime = n, this._time.fixedTick++, this.runGroup(e, "fixed"), this._accumulator -= n, i++;
		this._time.fixedSteps = i, this._time.deltaTime = t, this.runGroup(e, "simulation"), this.runGroup(e, "draw");
	}
	runGroup(e, t) {
		for (let n of this.getSorted(t)) {
			if (this.mode !== void 0) {
				let e = n.annotations?.mode ?? "play";
				if (e !== "always" && e !== this.mode) continue;
			}
			if (this._initialized.has(n) || (n.setup?.(e), this._initialized.add(n)), n.update) {
				let t = performance.now();
				n.update(e);
				let r = performance.now() - t, i = this._names.get(n) ?? "?";
				this._cpu.set(i, (this._cpu.get(i) ?? 0) + r);
			}
		}
	}
	getSorted(e) {
		this._systemsVersion !== this._cacheVersion && (this._cache.clear(), this._cacheVersion = this._systemsVersion);
		let t = this._cache.get(e);
		if (t) return t;
		let n = Array.from(this._systems), r = be(n.filter((t) => (t.group ?? "simulation") === e), n);
		return this._cache.set(e, r), r;
	}
};
function be(e, t) {
	Se(e, t ?? e);
	let n = e.filter((e) => e.first), r = e.filter((e) => e.last), i = e.filter((e) => !e.first && !e.last);
	return [
		...he(n, xe(n)),
		...he(i, xe(i)),
		...he(r, xe(r))
	];
}
function xe(e) {
	let t = [];
	for (let n of e) {
		for (let r of n.before ?? []) e.includes(r) && t.push([n, r]);
		for (let r of n.after ?? []) e.includes(r) && t.push([r, n]);
	}
	return t;
}
function Se(e, t) {
	for (let n of e) {
		if (n.first && n.last) throw new ve("System cannot have both first and last constraints");
		let e = n.group ?? "simulation";
		for (let r of n.before ?? []) Ce(r, e, t);
		for (let r of n.after ?? []) Ce(r, e, t);
	}
}
function Ce(e, t, n) {
	if (!n.includes(e)) return;
	let r = e.group ?? "simulation";
	if (r !== t) throw new ve(`Cross-group constraint: ${t} references ${r}`);
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/utils/math.ts
var we = Math.PI / 180, Te = 180 / Math.PI, Ee = {
	r: 0,
	g: 0,
	b: 0
};
function De(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
function Oe(e) {
	return e <= .0031308 ? e * 12.92 : 1.055 * e ** (1 / 2.4) - .055;
}
function ke(e) {
	return Ee.r = De((e >> 16 & 255) / 255), Ee.g = De((e >> 8 & 255) / 255), Ee.b = De((e & 255) / 255), Ee;
}
var Ae = [
	0,
	0,
	0
];
function je(e, t, n) {
	let r = Math.sqrt(e * e + t * t + n * n);
	return r < 1e-4 ? (Ae[0] = 0, Ae[1] = -1, Ae[2] = 0) : (Ae[0] = e / r, Ae[1] = t / r, Ae[2] = n / r), Ae;
}
function Me(e, t, n) {
	return e < t ? t : e > n ? n : e;
}
function Ne(e, t, n) {
	let r = e * we * .5, i = t * we * .5, a = n * we * .5, o = Math.cos(r), s = Math.sin(r), c = Math.cos(i), l = Math.sin(i), u = Math.cos(a), d = Math.sin(a);
	return {
		x: s * c * u + o * l * d,
		y: o * l * u - s * c * d,
		z: o * c * d + s * l * u,
		w: o * c * u - s * l * d
	};
}
function Pe(e, t, n, r) {
	let i = e + e, a = t + t, o = n + n, s = e * i, c = e * a, l = e * o, u = t * a, d = t * o, f = n * o, p = r * i, m = r * a, h = r * o, g = l + m, _ = Math.asin(g < -1 ? -1 : g > 1 ? 1 : g);
	return g > -.9999999 && g < .9999999 ? {
		x: Math.atan2(p - d, 1 - (s + u)) * Te,
		y: _ * Te,
		z: Math.atan2(h - c, 1 - (u + f)) * Te
	} : {
		x: Math.atan2(d + p, 1 - (s + f)) * Te,
		y: _ * Te,
		z: 0
	};
}
function Fe(e, t, n, r, i) {
	if (e <= 0) throw Error(`Invalid FOV: ${e} (must be > 0)`);
	if (t <= 0) throw Error(`Invalid aspect ratio: ${t} (must be > 0)`);
	if (n === r) throw Error(`Invalid depth planes: near === far (${n})`);
	i ||= new Float32Array(16);
	let a = 1 / Math.tan(e * Math.PI / 360), o = 1 / (n - r);
	return i[0] = a / t, i[1] = 0, i[2] = 0, i[3] = 0, i[4] = 0, i[5] = a, i[6] = 0, i[7] = 0, i[8] = 0, i[9] = 0, i[10] = r * o, i[11] = -1, i[12] = 0, i[13] = 0, i[14] = r * n * o, i[15] = 0, i;
}
function Ie(e, t, n, r, i) {
	if (e <= 0) throw Error(`Invalid orthographic size: ${e} (must be > 0)`);
	if (t <= 0) throw Error(`Invalid aspect ratio: ${t} (must be > 0)`);
	if (n === r) throw Error(`Invalid depth planes: near === far (${n})`);
	i ||= new Float32Array(16);
	let a = 1 / (e * t), o = 1 / e, s = 1 / (n - r);
	return i[0] = a, i[1] = 0, i[2] = 0, i[3] = 0, i[4] = 0, i[5] = o, i[6] = 0, i[7] = 0, i[8] = 0, i[9] = 0, i[10] = s, i[11] = 0, i[12] = 0, i[13] = 0, i[14] = n * s, i[15] = 1, i;
}
function A(e, t, n) {
	n ||= new Float32Array(16);
	for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) n[i * 4 + r] = e[r] * t[i * 4] + e[r + 4] * t[i * 4 + 1] + e[r + 8] * t[i * 4 + 2] + e[r + 12] * t[i * 4 + 3];
	return n;
}
function Le(e, t) {
	t ||= new Float32Array(16);
	let n = e[0], r = e[1], i = e[2], a = e[4], o = e[5], s = e[6], c = e[8], l = e[9], u = e[10], d = e[12], f = e[13], p = e[14];
	return t[0] = n, t[1] = a, t[2] = c, t[3] = 0, t[4] = r, t[5] = o, t[6] = l, t[7] = 0, t[8] = i, t[9] = s, t[10] = u, t[11] = 0, t[12] = -(n * d + r * f + i * p), t[13] = -(a * d + o * f + s * p), t[14] = -(c * d + l * f + u * p), t[15] = 1, t;
}
function Re(e, t) {
	let n = t ?? new Float32Array(24), r = e;
	n[0] = r[3] + r[0], n[1] = r[7] + r[4], n[2] = r[11] + r[8], n[3] = r[15] + r[12], n[4] = r[3] - r[0], n[5] = r[7] - r[4], n[6] = r[11] - r[8], n[7] = r[15] - r[12], n[8] = r[3] + r[1], n[9] = r[7] + r[5], n[10] = r[11] + r[9], n[11] = r[15] + r[13], n[12] = r[3] - r[1], n[13] = r[7] - r[5], n[14] = r[11] - r[9], n[15] = r[15] - r[13], n[16] = r[2], n[17] = r[6], n[18] = r[10], n[19] = r[14], n[20] = r[3] - r[2], n[21] = r[7] - r[6], n[22] = r[11] - r[10], n[23] = r[15] - r[14];
	for (let e = 0; e < 6; e++) {
		let t = Math.hypot(n[e * 4], n[e * 4 + 1], n[e * 4 + 2]);
		t > 0 && (n[e * 4] /= t, n[e * 4 + 1] /= t, n[e * 4 + 2] /= t, n[e * 4 + 3] /= t);
	}
	return n;
}
function ze(e, t, n, r, i, a, o = 0, s = 1, c = 0, l) {
	let u = e - r, d = t - i, f = n - a, p = Math.sqrt(u * u + d * d + f * f);
	p < 1e-6 ? (u = 0, d = 0, f = 1) : (p = 1 / p, u *= p, d *= p, f *= p);
	let m = s * f - c * d, h = c * u - o * f, g = o * d - s * u, _ = Math.sqrt(m * m + h * h + g * g);
	_ < 1e-6 && (Math.abs(d) > .9 ? (m = 1, h = 0, g = 0) : (m = -f, h = 0, g = u), _ = Math.sqrt(m * m + h * h + g * g)), _ = 1 / _, m *= _, h *= _, g *= _;
	let v = d * g - f * h, y = f * m - u * g, b = u * h - d * m, x = -(m * e + h * t + g * n), S = -(v * e + y * t + b * n), C = -(u * e + d * t + f * n);
	return l ||= new Float32Array(16), l[0] = m, l[1] = v, l[2] = u, l[3] = 0, l[4] = h, l[5] = y, l[6] = d, l[7] = 0, l[8] = g, l[9] = b, l[10] = f, l[11] = 0, l[12] = x, l[13] = S, l[14] = C, l[15] = 1, l;
}
function Be(e, t, n, r, i, a, o) {
	o ||= new Float32Array(16);
	let s = 1 / (t - e), c = 1 / (r - n), l = 1 / (i - a);
	return o[0] = 2 * s, o[1] = 0, o[2] = 0, o[3] = 0, o[4] = 0, o[5] = 2 * c, o[6] = 0, o[7] = 0, o[8] = 0, o[9] = 0, o[10] = l, o[11] = 0, o[12] = -(t + e) * s, o[13] = -(r + n) * c, o[14] = i * l, o[15] = 1, o;
}
function Ve(e, t, n, r) {
	let i = r ?? new Float32Array(24), a = [
		[
			-1,
			-1,
			t
		],
		[
			1,
			-1,
			t
		],
		[
			-1,
			1,
			t
		],
		[
			1,
			1,
			t
		],
		[
			-1,
			-1,
			n
		],
		[
			1,
			-1,
			n
		],
		[
			-1,
			1,
			n
		],
		[
			1,
			1,
			n
		]
	];
	for (let t = 0; t < 8; t++) {
		let [n, r, o] = a[t], s = e, c = s[0] * n + s[4] * r + s[8] * o + s[12], l = s[1] * n + s[5] * r + s[9] * o + s[13], u = s[2] * n + s[6] * r + s[10] * o + s[14], d = s[3] * n + s[7] * r + s[11] * o + s[15];
		i[t * 3] = c / d, i[t * 3 + 1] = l / d, i[t * 3 + 2] = u / d;
	}
	return i;
}
function He(e, t) {
	t ||= new Float32Array(16);
	let n = e[0], r = e[1], i = e[2], a = e[3], o = e[4], s = e[5], c = e[6], l = e[7], u = e[8], d = e[9], f = e[10], p = e[11], m = e[12], h = e[13], g = e[14], _ = e[15], v = n * s - r * o, y = n * c - i * o, b = n * l - a * o, x = r * c - i * s, S = r * l - a * s, C = i * l - a * c, w = u * h - d * m, T = u * g - f * m, ee = u * _ - p * m, E = d * g - f * h, te = d * _ - p * h, D = f * _ - p * g, O = v * D - y * te + b * E + x * ee - S * T + C * w;
	return Math.abs(O) < 1e-10 ? t : (O = 1 / O, t[0] = (s * D - c * te + l * E) * O, t[1] = (i * te - r * D - a * E) * O, t[2] = (h * C - g * S + _ * x) * O, t[3] = (f * S - d * C - p * x) * O, t[4] = (c * ee - o * D - l * T) * O, t[5] = (n * D - i * ee + a * T) * O, t[6] = (g * b - m * C - _ * y) * O, t[7] = (u * C - f * b + p * y) * O, t[8] = (o * te - s * ee + l * w) * O, t[9] = (r * ee - n * te - a * w) * O, t[10] = (m * S - h * b + _ * v) * O, t[11] = (d * b - u * S - p * v) * O, t[12] = (s * T - o * E - c * w) * O, t[13] = (n * E - r * T + i * w) * O, t[14] = (h * y - m * x - g * v) * O, t[15] = (u * x - d * y + f * v) * O, t);
}
function Ue(e, t, n, r, i, a, o = 0, s = 1, c = 0) {
	if (!Number.isFinite(e) || !Number.isFinite(t) || !Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(i) || !Number.isFinite(a)) throw Error(`lookAt received NaN: eye=[${e},${t},${n}], target=[${r},${i},${a}]`);
	let l = e - r, u = t - i, d = n - a, f = Math.sqrt(l * l + u * u + d * d);
	f === 0 ? d = 1 : (f = 1 / f, l *= f, u *= f, d *= f);
	let p = s * d - c * u, m = c * l - o * d, h = o * u - s * l, g = Math.sqrt(p * p + m * m + h * h);
	g < 1e-6 && (Math.abs(d) > Math.abs(l) ? o += 1e-4 : c += 1e-4, p = s * d - c * u, m = c * l - o * d, h = o * u - s * l, g = Math.sqrt(p * p + m * m + h * h)), g < 1e-6 ? (p = 1, m = 0, h = 0) : (g = 1 / g, p *= g, m *= g, h *= g);
	let _ = u * h - d * m, v = d * p - l * h, y = l * m - u * p, b = p + v + d, x, S, C, w;
	if (b > 0) {
		let e = .5 / Math.sqrt(b + 1);
		x = .25 / e, S = (y - u) * e, C = (l - h) * e, w = (m - _) * e;
	} else if (p > v && p > d) {
		let e = 2 * Math.sqrt(1 + p - v - d);
		x = (y - u) / e, S = .25 * e, C = (_ + m) / e, w = (l + h) / e;
	} else if (v > d) {
		let e = 2 * Math.sqrt(1 + v - p - d);
		x = (l - h) / e, S = (_ + m) / e, C = .25 * e, w = (y + u) / e;
	} else {
		let e = 2 * Math.sqrt(1 + d - p - v);
		x = (m - _) / e, S = (l + h) / e, C = (y + u) / e, w = .25 * e;
	}
	return {
		x: S,
		y: C,
		z: w,
		w: x
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/utils/shape.ts
var j = {
	Box: 0,
	Sphere: 1,
	Capsule: 2,
	Plane: 3,
	Mesh: 255
};
//#endregion
//#region ../../shallot/packages/shallot/src/engine/utils/registry.ts
function We(e) {
	let t = [], n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = 0;
	return {
		add(a, o) {
			if (o) {
				let e = n.get(o);
				if (e !== void 0) return t[e] = a, i++, e;
			}
			if (t.length >= e) throw Error(`registry limit reached (${e})`);
			let s = t.length;
			return t.push(a), o && (n.set(o, s), r.set(s, o)), i++, s;
		},
		set(e, n) {
			if (e < 0 || e >= t.length) throw Error(`registry set out of bounds: ${e}`);
			t[e] = n, i++;
		},
		get(e) {
			return t[e];
		},
		getByName(e) {
			return n.get(e);
		},
		getName(e) {
			return r.get(e);
		},
		all() {
			return t;
		},
		count() {
			return t.length;
		},
		clear() {
			t.length = 0, n.clear(), r.clear(), i++;
		},
		get version() {
			return i;
		}
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/ecs/capacity.ts
var Ge = new Map([
	[Float32Array, "f32"],
	[Uint32Array, "u32"],
	[Uint16Array, "u16"],
	[Uint8Array, "u8"],
	[Int32Array, "i32"]
]), Ke = 4096, qe = Ke - 1, Je = [], Ye = 1, Xe = 0, Ze = 1 << 20, Qe = Ze / Ke;
function M() {
	return Ye * Ke;
}
function $e(e, t, n) {
	let r = new e(Ke * t);
	return n !== 0 && r.fill(n), r;
}
function N(e, t, n) {
	let r = Ge.get(e);
	if (!r) throw Error("unknown typed-array kind");
	let i = [];
	for (let r = 0; r < Ye; r++) i.push($e(e, t, n));
	let a = {
		chunks: i,
		stride: t,
		id: Xe++,
		kind: r
	};
	return Je.push({
		ref: a,
		ctor: e,
		stride: t,
		fill: n
	}), a;
}
function et(e) {
	if (e <= M()) return;
	let t = Ye;
	for (; t * Ke < e;) t *= 2;
	if (t > Qe) throw Error(`Entity capacity exceeded (max ${Ze})`);
	for (; Ye < t;) {
		for (let e of Je) e.ref.chunks.push($e(e.ctor, e.stride, e.fill));
		Ye++;
	}
}
function tt() {
	Je.length = 0, Ye = 1, Xe = 0;
}
function nt(e, t, n, r, i) {
	if (i <= 0) return;
	let a = r.stride, o = r.chunks, s = o[0].BYTES_PER_ELEMENT, c = a * s, l = 0;
	for (let r = 0; r < o.length && l < i; r++) {
		let u = i - l, d = u < 4096 ? u : Ke, f = d * a, p = f * s;
		p & 3 && (f += (4 - (p & 3)) / s), e.writeBuffer(t, n + l * c, o[r], 0, f), l += d;
	}
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/ecs/component.ts
function rt(e) {
	let t = /* @__PURE__ */ new Map();
	for (let [n, r] of Object.entries(e)) t.set(b(n), r);
	return (e) => t.get(e);
}
function it(e) {
	let t = /* @__PURE__ */ new Map();
	for (let [n, r] of Object.entries(e)) t.set(r, b(n));
	return (e) => t.get(e);
}
var at = /* @__PURE__ */ new WeakMap();
function P(e, t) {
	if (t.enums) {
		let e = t.parse ?? {}, n = t.format ?? {};
		for (let [r, i] of Object.entries(t.enums)) e[r] || (e[r] = rt(i)), n[r] || (n[r] = it(i));
		t.parse = e, t.format = n;
	}
	at.set(e, t);
}
function ot(e) {
	return at.get(e);
}
var st = /* @__PURE__ */ new Map();
function ct(e, t) {
	let n = b(e), r = at.get(t);
	st.set(n, {
		component: t,
		name: n,
		traits: r
	});
}
function lt(e) {
	return st.get(b(e));
}
function ut() {
	return [...st.values()];
}
function dt(e) {
	for (let [t, n] of st) if (n.component === e) return t;
}
var ft = /* @__PURE__ */ new WeakMap();
function pt(e, t, n, r) {
	ft.set(e, {
		bufId: t.id,
		array: t.kind,
		stride: n,
		offset: r
	});
}
function mt(e, t) {
	let n = e[t];
	return n == null || ArrayBuffer.isView(n) || Array.isArray(n) ? !1 : typeof n == "object";
}
function F(e, t, n) {
	let r = e.chunks;
	function i(e) {
		return r[e >>> 12][(e & qe) * t + n];
	}
	function a(e, i) {
		r[e >>> 12][(e & qe) * t + n] = i;
	}
	let o = new Proxy([], {
		get(e, t) {
			if (t === "get") return i;
			if (t === "set") return a;
			let n = Number(t);
			if (!Number.isNaN(n)) return i(n);
		},
		set(e, t, n) {
			let r = Number(t);
			return Number.isNaN(r) ? !1 : (a(r, n), !0);
		}
	});
	return pt(o, e, t, n), o;
}
function ht(e, t, n) {
	let r = e.chunks;
	function i(e) {
		let i = r[e >>> 12], a = (e & qe) * t + n, o = Math.round(Oe(i[a]) * 255), s = Math.round(Oe(i[a + 1]) * 255), c = Math.round(Oe(i[a + 2]) * 255);
		return o << 16 | s << 8 | c;
	}
	function a(e, i) {
		let a = r[e >>> 12], o = (e & qe) * t + n;
		a[o] = De((i >> 16 & 255) / 255), a[o + 1] = De((i >> 8 & 255) / 255), a[o + 2] = De((i & 255) / 255), a[o + 3] = 1;
	}
	let o = new Proxy([], {
		get(e, t) {
			if (t === "get") return i;
			if (t === "set") return a;
			let n = Number(t);
			if (!Number.isNaN(n)) return i(n);
		},
		set(e, t, n) {
			let r = Number(t);
			return Number.isNaN(r) ? !1 : (a(r, n), !0);
		}
	});
	return pt(o, e, t, n), o;
}
Object.freeze([]);
var gt = [];
function _t(e) {
	for (let t = 0; t < gt.length; t++) gt[t](e);
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/ecs/state.ts
var vt = class {
	entities = new i();
	components = new o();
	relations = new ce(this);
	observables = new u();
	queryCache = new y();
	scheduler = new ye();
	_resources = /* @__PURE__ */ new Map();
	_disposed = !1;
	_max = 0;
	_disposeHooks = [];
	get time() {
		return this.scheduler.time;
	}
	get max() {
		return this._max;
	}
	setResource(e, t) {
		this._resources.set(e, t);
	}
	getResource(e) {
		return this._resources.get(e);
	}
	deleteResource(e) {
		return this._resources.delete(e);
	}
	register(e) {
		if ("update" in e || "setup" in e || "dispose" in e) this.scheduler.register(e);
		else {
			let t = e;
			if (t.components) for (let [e, n] of Object.entries(t.components)) ct(e, n);
			if (t.systems) for (let e of t.systems) this.scheduler.register(e, t.name);
		}
	}
	unregister(e) {
		this.scheduler.unregister(e);
	}
	step(e = _e.DEFAULT_DT) {
		this.scheduler.step(this, e), _t(this);
	}
	addEntity() {
		let e = this.entities.add();
		return et(e + 1), e > this._max && (this._max = e), e;
	}
	removeEntity(e) {
		if (this.entities.exists(e)) {
			this.relations.onEntityRemoved(e);
			for (let t of this.components.getAll(e)) this.observables.notifyRemove(e, t, this.components);
			if (this.queryCache.onEntityRemoved(e), this.components.clear(e), this.entities.remove(e), e === this._max) for (; this._max > 0 && !this.entities.exists(this._max);) this._max--;
		}
	}
	entityExists(e) {
		return this.entities.exists(e);
	}
	getAllEntities() {
		return this.entities.all();
	}
	query(e) {
		let t = _(e), n = this.queryCache.register(t, this.components, this.entities.dense, this.entities.alive);
		if (!t.hierarchy) return n.set;
		if (!n.sortedDirty && n.sortedCache) return n.sortedCache;
		let r = [], i = n.set.dense, a = n.set.count;
		for (let e = 0; e < a; e++) r.push(i[e]);
		return n.sortedCache = this.sortByDepth(r, t.hierarchy.relation), n.sortedDirty = !1, n.sortedCache;
	}
	only(e) {
		let t = -1, n = 0;
		for (let r of this.query(e)) if (n === 0 && (t = r), n++, n > 1) break;
		return n > 1 && console.warn("state.only: expected 1 match, found multiple"), t;
	}
	getEntityComponents(e) {
		return this.components.getAll(e);
	}
	addComponent(e, t) {
		if (ie(t)) {
			let n = ae(t), r = oe(t);
			if (typeof r == "number") {
				this.relations.add(e, n, r);
				return;
			}
		}
		this.components.add(e, t) && (this.queryCache.onComponentChanged(e, t, this.components), this.notifyAdd(e, t)), this.applyDefaults(e, t);
	}
	removeComponent(e, t) {
		if (ie(t)) {
			let n = ae(t), r = oe(t);
			if (typeof r == "number") {
				this.relations.remove(e, n, r);
				return;
			}
		}
		this.notifyRemove(e, t), this.components.remove(e, t), this.queryCache.onComponentChanged(e, t, this.components);
	}
	hasComponent(e, t) {
		return this.components.has(e, t);
	}
	getComponent(e, t) {
		return this.components.has(e, t) ? t : void 0;
	}
	addRelation(e, t, n) {
		this.addComponent(e, t.relation(n));
	}
	removeRelation(e, t, n) {
		this.removeComponent(e, t.relation(n));
	}
	hasRelation(e, t, n) {
		return this.hasComponent(e, t.relation(n));
	}
	getRelationTargets(e, t) {
		return this.relations.targets(e, t.relation);
	}
	getFirstRelationTarget(e, t) {
		let n = this.relations.targets(e, t.relation);
		return n.length > 0 ? n[0] : -1;
	}
	observe(e, t) {
		return this.observables.subscribe(e, t);
	}
	notifyAdd(e, t) {
		this.observables.notifyAdd(e, t, this.components);
	}
	notifyRemove(e, t) {
		this.observables.notifyRemove(e, t, this.components);
	}
	notifyQueryChanged(e, t) {
		this.queryCache.onComponentChanged(e, t, this.components);
	}
	onDispose(e) {
		this._disposeHooks.push(e);
	}
	dispose() {
		if (!this._disposed) {
			for (let e of this._disposeHooks) e();
			this._disposeHooks.length = 0;
			for (let e of this.scheduler.systems) e.dispose?.(this);
			this.queryCache.clear(), _t(this), tt(), this._disposed = !0;
		}
	}
	applyDefaults(e, t) {
		let n = ot(t);
		if (!n?.defaults) return;
		let r = n.defaults(), i = t;
		for (let [t, n] of Object.entries(r)) {
			let r = i[t];
			r != null && (r[e] = n);
		}
	}
	sortByDepth(e, t) {
		let n = /* @__PURE__ */ new Map(), r = (e) => {
			let i = n.get(e);
			if (i !== void 0) return i;
			let a = this.relations.targets(e, t), o = a.length === 0 ? 0 : r(a[0]) + 1;
			return n.set(e, o), o;
		};
		for (let t of e) r(t);
		return e.sort((e, t) => (n.get(e) ?? 0) - (n.get(t) ?? 0)), e;
	}
};
//#endregion
//#region ../../shallot/packages/shallot/src/engine/ecs/resource.ts
function I(e) {
	let t = Symbol(e), n = Object.assign(t, { from(e) {
		return e.getResource(n);
	} });
	return n;
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/ecs/reflection.ts
function yt(e, t) {
	return `${t}X` in e && `${t}Y` in e;
}
function bt(e, t) {
	return yt(e, t) && `${t}Z` in e;
}
function xt(e, t) {
	return bt(e, t) && `${t}W` in e;
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/scene/xml.ts
function St(e) {
	let t = [], n = /<!--[\s\S]*?-->|<\/?\s*(\w+)[^>]*\/?>/g, r = 0, i;
	for (; (i = n.exec(e)) !== null;) {
		let n = e.slice(r, i.index);
		/\n\s*\n/.test(n) && t.push({
			type: "blank",
			value: ""
		}), r = i.index + i[0].length;
		let a = i[0];
		if (a.startsWith("<!--")) {
			let e = a.slice(4, -3).trim();
			t.push({
				type: "comment",
				value: e
			});
		} else if (a.startsWith("</")) {
			let e = a.match(/<\/\s*(\w+)/)?.[1] ?? "";
			t.push({
				type: "close",
				value: a,
				tagName: e
			});
		} else {
			let e = a.endsWith("/>"), n = a.match(/<\s*(\w+)/)?.[1] ?? "", r = Ct(a);
			t.push({
				type: "open",
				value: a,
				selfClosing: e,
				tagName: n,
				attrs: r
			});
		}
	}
	return t;
}
function Ct(e) {
	let t = {}, n = /([^\s=<>/]+)(?:\s*=\s*"([^"]*)")?/g, r = e.replace(/^<\s*\w+/, "").replace(/\/?>$/, ""), i;
	for (; (i = n.exec(r)) !== null;) {
		let e = i[1];
		t[e] = i[2] ?? "";
	}
	return t;
}
function wt(e) {
	if (e.match(/<[^>]*$/)) throw Error("xml parse error: Unclosed tag at end of document");
	let t = St(e);
	for (let e of t) if (e.type === "open" && e.tagName !== "scene" && e.tagName !== "a") {
		let t = e.tagName ?? "unknown";
		if (t.toLowerCase() === "a" || t.toLowerCase() === "scene") continue;
		throw Error(`xml parse error: Unknown tag <${t}>`);
	}
	let n = [], r = [], i = 0, a = [], o = !1;
	for (; i < t.length;) {
		let e = t[i];
		if (e.type === "blank") {
			o = !0, i++;
			continue;
		}
		if (e.type === "comment") {
			a.push(e.value), i++;
			continue;
		}
		if (e.type === "open" && e.tagName === "scene") {
			a = [], o = !1, i++;
			continue;
		}
		if (e.type === "close" && e.tagName === "scene") {
			i++;
			continue;
		}
		if (e.type === "open" && e.tagName === "a") {
			let e = Tt(t, i, r);
			e.node && (e.node.comments = a.length > 0 ? a : void 0, e.node.blankBefore = o || void 0, n.push(e.node)), a = [], o = !1, i = e.nextIndex;
			continue;
		}
		if (e.type === "open" && e.tagName?.toLowerCase() === "scene") throw Error(`Invalid tag "${e.tagName}". Use lowercase <scene>`);
		if (e.type === "open" && e.tagName?.toLowerCase() === "a" && e.tagName !== "a") throw Error(`Invalid tag "${e.tagName}". Use lowercase <a>`);
		i++;
	}
	if (r.length > 0) throw Error(r.map((e) => e.message).join("\n"));
	return n;
}
function Tt(e, t, n) {
	let r = e[t];
	if (r.type !== "open" || r.tagName !== "a") return r.tagName?.toLowerCase() === "a" && n.push({ message: `Invalid tag "${r.tagName}". Use lowercase <a>` }), {
		node: null,
		nextIndex: t + 1
	};
	let i = r.attrs ?? {}, a = [], o;
	for (let [e, t] of Object.entries(i)) e === "id" ? o = t : a.push({
		name: e,
		value: t
	});
	let s = [], c = t + 1;
	if (!r.selfClosing) {
		let t = [], r = !1;
		for (; c < e.length;) {
			let i = e[c];
			if (i.type === "blank") {
				r = !0, c++;
				continue;
			}
			if (i.type === "comment") {
				t.push(i.value), c++;
				continue;
			}
			if (i.type === "close" && i.tagName === "a") {
				c++;
				break;
			}
			if (i.type === "open" && i.tagName === "a") {
				let i = Tt(e, c, n);
				i.node && (i.node.comments = t.length > 0 ? t : void 0, i.node.blankBefore = r || void 0, s.push(i.node)), t = [], r = !1, c = i.nextIndex;
				continue;
			}
			c++;
		}
	}
	return {
		node: {
			id: o,
			attrs: a,
			children: s
		},
		nextIndex: c
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/scene/index.ts
function Et(e, t) {
	if (e.length === 0) return t.length;
	if (t.length === 0) return e.length;
	let n = [];
	for (let e = 0; e <= t.length; e++) n[e] = [e];
	for (let t = 0; t <= e.length; t++) n[0][t] = t;
	for (let r = 1; r <= t.length; r++) for (let i = 1; i <= e.length; i++) {
		let a = e[i - 1] === t[r - 1] ? 0 : 1;
		n[r][i] = Math.min(n[r - 1][i] + 1, n[r][i - 1] + 1, n[r - 1][i - 1] + a);
	}
	return n[t.length][e.length];
}
function Dt(e, t) {
	let n = b(e), r = null, i = Infinity;
	for (let e of t) {
		let t = b(e);
		if (n === t || n.endsWith(t) || n.endsWith("-" + t)) return e;
		let a = Et(n, t), o = Math.max(n.length, t.length), s = Math.ceil(o * .5);
		a < i && a <= s && (i = a, r = e);
	}
	return r;
}
function Ot(e, t) {
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = [], a = [], o = [];
	for (let i of e) At(t, i, n, r, void 0, a);
	for (let { node: e, eid: r, parent: s } of a) {
		s !== void 0 && t.addRelation(r, fe, s);
		let { componentAttrs: a, refs: c } = kt(e.attrs);
		for (let e of c) jt(t, r, e, n, i);
		for (let e of a) Mt(t, r, e, i, o);
	}
	for (let e of o) {
		let t = n.get(e.targetName);
		if (t === void 0) {
			i.push({ message: `Unknown entity: "@${e.targetName}"` });
			continue;
		}
		Pt(e.component, e.field, e.eid, t);
	}
	if (i.length > 0) throw Error(i.map((e) => e.message).join("\n"));
	return r;
}
function kt(e) {
	let t = [], n = [], r = [];
	for (let i of e) {
		if (i.value.startsWith("@") && i.value.length > 1) {
			n.push({
				attr: i.name,
				target: i.value.slice(1)
			});
			continue;
		}
		let e = lt(i.name);
		if (e) {
			t.push({
				name: i.name,
				value: i.value,
				def: e
			});
			continue;
		}
		r.push({
			name: i.name,
			value: i.value
		});
	}
	return {
		componentAttrs: t,
		refs: n,
		unknown: r
	};
}
function At(e, t, n, r, i, a) {
	let o = e.addEntity();
	t.id && n.set(t.id, o), r.set(t, o), a.push({
		node: t,
		eid: o,
		parent: i
	});
	for (let i of t.children) At(e, i, n, r, o, a);
	return o;
}
function jt(e, t, n, r, i) {
	let a = ue(n.attr);
	if (!a) {
		i.push({ message: `Unknown relation: "${n.attr}"` });
		return;
	}
	let o = r.get(n.target);
	if (o === void 0) {
		i.push({ message: `Unknown entity: "@${n.target}"` });
		return;
	}
	e.addRelation(t, a, o);
}
function Mt(e, t, n, r, i) {
	let { def: a, value: o } = n, { component: s, name: c, traits: l } = a;
	e.addComponent(t, s);
	let u = l?.defaults?.() ?? {};
	for (let [e, n] of Object.entries(u)) Pt(s, e, t, n);
	let d = {};
	o !== "" && (d._value = o);
	let f = Nt(a, d), p = f.values, m = f.strings, h = f.entityRefs;
	for (let e of f.errors) r.push({ message: `<${c}> ${e}` });
	for (let [e, n] of Object.entries(p)) Pt(s, e, t, n);
	for (let [e, n] of Object.entries(m)) Ft(s, e, t, n);
	for (let e of h) i.push({
		eid: t,
		component: s,
		field: e.field,
		targetName: e.targetName
	});
}
function Nt(e, t) {
	let n = {}, r = {}, i = [], a = [];
	if (t._value && Bt(t._value)) {
		let o = zt(e.name, t._value, e.component);
		Object.assign(n, o.values), Object.assign(r, o.strings), i.push(...o.entityRefs), a.push(...o.errors);
	}
	for (let [o, s] of Object.entries(t)) if (o !== "_value" && s) if (Bt(s)) {
		let t = zt(e.name, s, e.component);
		Object.assign(n, t.values), Object.assign(r, t.strings), i.push(...t.entityRefs), a.push(...t.errors);
	} else {
		let t = zt(e.name, `${o}: ${s}`, e.component);
		Object.assign(n, t.values), Object.assign(r, t.strings), i.push(...t.entityRefs), a.push(...t.errors);
	}
	return {
		values: n,
		strings: r,
		entityRefs: i,
		errors: a
	};
}
function Pt(e, t, n, r) {
	let i = e[t];
	i != null && (ArrayBuffer.isView(i) || Array.isArray(i) ? i[n] = r : console.warn(`Scene: cannot assign number to non-array field "${t}"`));
}
function Ft(e, t, n, r) {
	e[t][n] = r;
}
function It(e) {
	if (e = e.trim(), e.startsWith("0x") || e.startsWith("0X")) return parseInt(e, 16);
	if (e.startsWith("#")) {
		let t = e.slice(1);
		return /^[0-9a-fA-F]+$/.test(t) ? parseInt(t, 16) : null;
	}
	if (e === "true") return 1;
	if (e === "false") return 0;
	let t = parseFloat(e);
	return Number.isNaN(t) ? null : t;
}
function Lt(e) {
	let t = [], n = e.trim(), r = 0;
	for (let e = 0; e <= n.length; e++) {
		let i = e < n.length && /\s/.test(n[e]), a = e === n.length;
		(i || a) && (r < e && t.push(It(n.slice(r, e))), r = e + 1);
	}
	return t;
}
function Rt(e) {
	let t = [], n = 0;
	for (let r = 0; r <= e.length; r++) if (r === e.length || e[r] === ";") {
		let i = e.slice(n, r).trim();
		i && t.push(i), n = r + 1;
	}
	return t;
}
function zt(e, t, n) {
	let r = {}, i = {}, a = [], o = [], s = Rt(t);
	for (let t of s) {
		let s = t.indexOf(":");
		if (s === -1) {
			o.push(`Invalid syntax: "${t}" (expected "field: value")`);
			continue;
		}
		let c = t.slice(0, s).trim(), l = t.slice(s + 1).trim();
		if (!c || !l) {
			o.push(`Invalid syntax: "${t}" (empty field or value)`);
			continue;
		}
		let u = x(c);
		if (l.startsWith("@") && l.length > 1) {
			if (u in n) a.push({
				field: u,
				targetName: l.slice(1)
			});
			else {
				let t = Dt(c, Object.keys(n));
				t ? o.push(`${e}: unknown field "${c}", did you mean "${b(t)}"?`) : o.push(`${e}: unknown field "${c}"`);
			}
			continue;
		}
		let d = Lt(l);
		if (d.some((e) => e === null)) {
			let e = l.trim();
			if (u in n && mt(n, u)) {
				i[u] = e;
				continue;
			}
			if (d.length === 1) {
				let t = ot(n)?.parse?.[u];
				if (t) {
					let n = t(e);
					if (n !== void 0) {
						r[u] = n;
						continue;
					}
				}
			}
			o.push(`Invalid number in "${t}"`);
			continue;
		}
		let f = d;
		if (xt(n, u)) {
			f.length === 4 ? (r[`${u}X`] = f[0], r[`${u}Y`] = f[1], r[`${u}Z`] = f[2], r[`${u}W`] = f[3]) : f.length === 1 ? (r[`${u}X`] = f[0], r[`${u}Y`] = f[0], r[`${u}Z`] = f[0], r[`${u}W`] = f[0]) : o.push(`${e}.${c}: expected 1 or 4 values, got ${f.length}`);
			continue;
		}
		if (bt(n, u)) {
			f.length === 3 ? (r[`${u}X`] = f[0], r[`${u}Y`] = f[1], r[`${u}Z`] = f[2]) : f.length === 1 ? (r[`${u}X`] = f[0], r[`${u}Y`] = f[0], r[`${u}Z`] = f[0]) : o.push(`${e}.${c}: expected 1 or 3 values, got ${f.length}`);
			continue;
		}
		if (yt(n, u)) {
			f.length === 2 ? (r[`${u}X`] = f[0], r[`${u}Y`] = f[1]) : f.length === 1 ? (r[`${u}X`] = f[0], r[`${u}Y`] = f[0]) : o.push(`${e}.${c}: expected 1 or 2 values, got ${f.length}`);
			continue;
		}
		if (u in n) {
			f.length === 1 ? r[u] = f[0] : o.push(`${e}.${c}: expected 1 value, got ${f.length}`);
			continue;
		}
		let p = Dt(c, Object.keys(n));
		p ? o.push(`${e}: unknown field "${c}", did you mean "${b(p)}"?`) : o.push(`${e}: unknown field "${c}"`);
	}
	return {
		values: r,
		strings: i,
		entityRefs: a,
		errors: o
	};
}
function Bt(e) {
	return e.includes(":") && (e.includes(";") || /^[\w-]+\s*:/.test(e));
}
function Vt(e) {
	let t = [], n = ut().map((e) => e.name);
	function r(e) {
		for (let i of e) {
			let e = new Set(i.attrs.map((e) => e.name));
			for (let r of i.attrs) {
				if (r.value.startsWith("@") && r.value.length > 1) continue;
				let a = lt(r.name);
				if (!a) {
					let e = Dt(r.name, n), a = e ? `"${r.name}" is not registered, did you mean "${e}"?` : `"${r.name}" is not registered`;
					t.push({
						node: i,
						attr: r.name,
						kind: "unregistered",
						message: a
					});
					continue;
				}
				if (a.traits?.requires) for (let n of a.traits.requires) {
					let a = dt(n);
					a && !e.has(a) && t.push({
						node: i,
						attr: r.name,
						kind: "missing-requires",
						message: `"${r.name}" requires "${a}"`
					});
				}
			}
			r(i.children);
		}
	}
	return r(e), t;
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/runtime/index.ts
var Ht = typeof Bun < "u", Ut = Ht ? "headless" : "web", Wt = () => performance.now(), Gt = Ht ? (e) => setTimeout(e, 0) : (e) => requestAnimationFrame(e);
async function Kt(e) {
	if (Ht) return Bun.file(e).text();
	let t = await fetch(e);
	if (!t.ok) throw Error(`Failed to load ${e}: ${t.status}`);
	return t.text();
}
//#endregion
//#region ../../shallot/packages/shallot/src/engine/app/index.ts
var qt = I("frame-sync"), Jt = [], Yt = null;
function Xt(e) {
	Jt = e;
}
function Zt(e) {
	Yt = e;
}
async function Qt(e) {
	let t = new vt(), n = e.defaults !== !1, r = e.loading ?? Yt?.(), i = r?.show();
	try {
		let a = e.exclude ? new Set(e.exclude) : null, o = /* @__PURE__ */ new Set();
		if (n) for (let e of Jt) a?.has(e) || o.add(e);
		for (let t of e.plugins) o.add(t);
		let s = [...o], c = /* @__PURE__ */ new Set();
		for (let e of s) for (let t of e.dependencies ?? []) if (!o.has(t)) {
			console.warn(`Missing plugin dependency: ${e.name ?? "?"} requires ${t.name ?? "?"}`), c.add(e);
			break;
		}
		for (let e of s) if (!c.has(e)) {
			if (e.components) for (let [t, n] of Object.entries(e.components)) ct(t, n);
			if (e.relations) for (let t of e.relations) de(t);
			if (e.systems) for (let n of e.systems) t.scheduler.register(n, e.name);
		}
		let l = [];
		for (let e of s) for (let t of e.dependencies ?? []) l.push([t, e]);
		let u = he(s, l), d = e.scene ? Array.isArray(e.scene) ? e.scene : [e.scene] : [], f = u.length * 2 + d.length;
		e.setup?.(t);
		for (let e = 0; e < u.length; e++) {
			let n = u[e], i = r ? (t) => r.update((e + t) / f) : void 0;
			c.has(n) || await n.initialize?.(t, i), r?.update((e + 1) / f);
		}
		if (d.length > 0) for (let e = 0; e < d.length; e++) {
			let n = d[e], i = wt(n.startsWith("<") ? n : await Kt(n));
			for (let e of Vt(i)) console.warn(`[shallot] ${e.message}`);
			Ot(i, t), r?.update((u.length + e + 1) / f);
		}
		let p = u.filter((e) => e.warm && !c.has(e)), m = 0, h = u.length + d.length, g = p.map(async (e) => {
			await e.warm(t, (e) => {
				r && r.update((h + m + e) / f);
			}), m++, r?.update((h + m) / f);
		});
		return await Promise.all(g), i && (r?.update(1), await new Promise((e) => Gt(e)), i()), t;
	} catch (e) {
		let t = e instanceof Error ? e.message : String(e);
		throw r?.error?.(t), e;
	}
}
async function $t(e) {
	let t = await Qt(e);
	if (e.ui && Ut === "web") {
		let n = document.querySelector("canvas")?.parentElement ?? document.body;
		n.style.position = "relative";
		let r = document.createElement("div");
		r.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:1", n.appendChild(r);
		let i = e.ui(r, t);
		t.onDispose(() => {
			i(), r.remove();
		});
	}
	let n = !1, r = Wt(), i = 0;
	function a() {
		n || Gt(o);
	}
	function o() {
		if (n) return;
		let e = Wt(), o = (e - r) / 1e3;
		r = e, t.scheduler.reportFenceWait(i), i = 0, t.step(o);
		let s = qt.from(t)?.();
		if (s) {
			let e = Wt();
			s.then(() => {
				i = Wt() - e, a();
			});
		} else a();
	}
	return t.onDispose(() => {
		n = !0;
	}), a(), t;
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/compute/graph.ts
var en = {};
function L(e, t) {
	return en.timestampWrites = t, e.beginComputePass(en);
}
function tn(e) {
	let t = [], n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
	for (let t of e) for (let e of t.outputs) {
		let i = t.inputs.includes(e) ? r : n, a = i.get(e);
		a || (a = [], i.set(e, a)), a.push(t);
	}
	for (let [e, i] of r) {
		let r = n.get(e) ?? [];
		for (let e = 0; e < i.length; e++) {
			let n = i[e];
			for (let e of r) e !== n && t.push([e, n]);
			for (let r = 0; r < e; r++) i[r] !== n && t.push([i[r], n]);
		}
	}
	for (let i of e) for (let e of i.inputs) {
		if (i.outputs.includes(e)) continue;
		let a = r.get(e);
		if (a && a.length > 0) {
			let e = a[a.length - 1];
			e !== i && t.push([e, i]);
		} else {
			let r = n.get(e);
			if (!r) continue;
			for (let e of r) e !== i && t.push([e, i]);
		}
	}
	return t;
}
function nn(e) {
	if (e.length === 0) return [];
	let t = tn(e), n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
	for (let t of e) n.set(t, []), r.set(t, 0);
	for (let [e, i] of t) n.get(e).push(i), r.set(i, r.get(i) + 1);
	let i = [];
	for (let t of e) r.get(t) === 0 && i.push(t);
	let a = [], o = 0;
	for (; o < i.length;) {
		let e = i[o++];
		a.push(e);
		for (let t of n.get(e)) {
			let e = r.get(t) - 1;
			r.set(t, e), e === 0 && i.push(t);
		}
	}
	if (a.length !== e.length) throw new me(`Circular dependency detected in compute graph. Nodes still in cycle:\n${e.filter((e) => (r.get(e) ?? 0) > 0).map((t) => {
		let r = e.filter((e) => n.get(e)?.includes(t)).map((e) => e.name);
		return `  ${t.name} <- ${r.length ? r.join(", ") : "(none)"}`;
	}).join("\n")}`);
	return a;
}
function rn(e, t) {
	let n = [...e, ...t];
	if (n.length === 0) return {
		frame: [],
		view: []
	};
	let r = [], i = [];
	for (let e of n) e.scope === "frame" ? r.push(e) : i.push(e);
	let a = /* @__PURE__ */ new Set();
	for (let e of i) for (let t of e.outputs) a.add(t);
	for (let e of r) for (let t of e.inputs) if (a.has(t)) throw Error(`Frame-scope node '${e.name}' depends on view-scope resource '${t}'`);
	return {
		frame: nn(r),
		view: nn(i)
	};
}
var an = class {
	nodes = /* @__PURE__ */ new Map();
	check = null;
	_graph;
	constructor(e) {
		this._graph = e;
	}
	add(e) {
		if (this.nodes.has(e.name)) throw Error(`Node '${e.name}' already exists`);
		this.nodes.set(e.name, e), this._graph.invalidate();
	}
	set(e, t) {
		if (t.name !== e) throw Error(`Node name '${t.name}' must match slot name '${e}'`);
		this.nodes.set(e, t), this._graph.invalidate();
	}
	remove(e) {
		let t = this.nodes.delete(e);
		return t && this._graph.invalidate(), t;
	}
}, on = class {
	nodes = /* @__PURE__ */ new Map();
	_subGraphs = /* @__PURE__ */ new Map();
	_plans = /* @__PURE__ */ new Map();
	get planCached() {
		return this._plans.size > 0;
	}
	get subGraphs() {
		return this._subGraphs;
	}
	subGraph(e) {
		let t = this._subGraphs.get(e);
		return t || (t = new an(this), this._subGraphs.set(e, t)), t;
	}
	add(e) {
		if (this.nodes.has(e.name)) throw Error(`Node '${e.name}' already exists`);
		this.nodes.set(e.name, e), this.invalidate();
	}
	set(e, t) {
		if (t.name !== e) throw Error(`Node name '${t.name}' must match slot name '${e}'`);
		this.nodes.set(e, t), this.invalidate();
	}
	remove(e) {
		let t = this.nodes.delete(e);
		return t && this.invalidate(), t;
	}
	compile(e) {
		let t = e ?? "", n = this._plans.get(t);
		if (n) return n;
		let r = rn(Array.from(this.nodes.values()), e ? Array.from(this._subGraphs.get(e)?.nodes.values() ?? []) : []);
		return this._plans.set(t, r), r;
	}
	async prepare(e, t) {
		let n = Array.from(this.nodes.values());
		for (let e of this._subGraphs.values()) for (let t of e.nodes.values()) n.push(t);
		let r = n.filter((e) => e.prepare), i = r.length;
		if (i === 0) return;
		let a = 0, o = r.map(async (n) => {
			await n.prepare(e), a++, t?.(a, i);
		});
		await Promise.all(o);
	}
	invalidate() {
		this._plans.clear();
	}
};
//#endregion
//#region ../../shallot/packages/shallot/src/standard/compute/device.ts
async function sn() {
	if (!navigator.gpu) throw Error("This browser doesn't support WebGPU. Use Chrome 113+, Edge 113+, or a recent Firefox Nightly.");
	let e = await navigator.gpu.requestAdapter();
	if (!e) throw Error("No compatible GPU found. WebGPU requires a GPU with Vulkan or DirectX 12 (Feature Level 11.1+) support.");
	let t = ["indirect-first-instance"];
	e.features.has("timestamp-query") && t.push("timestamp-query"), e.features.has("bgra8unorm-storage") && t.push("bgra8unorm-storage");
	let n = await e.requestDevice({
		requiredFeatures: t,
		requiredLimits: {
			maxTextureDimension2D: e.limits.maxTextureDimension2D,
			maxStorageBuffersPerShaderStage: 10
		}
	});
	return n.lost.then((e) => console.error(`GPU device lost: ${e.reason}`, e.message)), n.onuncapturederror = (e) => {
		let t = e.error instanceof GPUValidationError ? e.error.message : e.error;
		console.error("GPU uncaptured error:", t);
	}, n;
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/compute/buffer.ts
function R(e, t) {
	return {
		binding: e,
		resource: {
			buffer: t.buffer,
			offset: t.offset,
			size: t.size
		}
	};
}
function z(e, t, n, r) {
	let i = M(), a = e.createBuffer({
		label: t,
		size: r(i),
		usage: n
	});
	return { get buffer() {
		let o = M();
		return o !== i && (a.destroy(), a = e.createBuffer({
			label: t,
			size: r(o),
			usage: n
		}), i = o), a;
	} };
}
function cn(e, t, n) {
	let r = M(), i = null;
	return {
		get group() {
			return M() !== r && (r = M(), i = null), i ||= e.createBindGroup({
				layout: t,
				entries: n()
			}), i;
		},
		invalidate() {
			i = null;
		}
	};
}
function ln(e, t, n) {
	return {
		get buffer() {
			return e.buffer;
		},
		get offset() {
			return t(M());
		},
		get size() {
			return n(M());
		}
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/compute/index.ts
var un = I("compute"), dn = I("shared-device"), fn = {
	name: "Compute",
	async initialize(e, t) {
		let n = e.getResource(dn) ?? await sn(), r = new on(), i = {
			textures: /* @__PURE__ */ new Map(),
			textureViews: /* @__PURE__ */ new Map(),
			buffers: /* @__PURE__ */ new Map()
		}, a = [], o = {
			device: n,
			graph: r,
			resources: i,
			frameIndex: 0,
			get pending() {
				return a.length;
			},
			sync() {
				return a.push(n.queue.onSubmittedWorkDone()), a.length >= 2 ? a.shift() : null;
			}
		};
		e.setResource(un, o), e.setResource(qt, () => o.sync()), t?.(1);
	},
	async warm(e, t) {
		let n = un.from(e);
		n && await n.graph.prepare(n.device, (e, n) => {
			t?.(e / n);
		});
	}
}, pn = 16, mn = 16, hn = pn * mn, gn = 2 * hn, _n = 3, vn = "struct SortParams { count: u32, wgCount: u32 }", yn = "struct PrefixParams { count: u32 }", bn = `
@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> histograms: array<u32>;
@group(0) @binding(2) var<uniform> params: SortParams;

${vn}

override BIT: u32;

var<workgroup> bins: array<atomic<u32>, 16>;

@compute @workgroup_size(${pn}, ${mn}, 1)
fn main(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) wdim: vec3<u32>,
    @builtin(local_invocation_index) tid: u32,
) {
    let workgroup = wid.x + wid.y * wdim.x;
    let gid = workgroup * ${hn}u + tid;

    if (tid < 16u) {
        atomicStore(&bins[tid], 0u);
    }
    workgroupBarrier();

    if (gid < params.count && workgroup < params.wgCount) {
        let digit = (input[gid] >> BIT) & 0xfu;
        atomicAdd(&bins[digit], 1u);
    }
    workgroupBarrier();

    if (tid < 16u) {
        histograms[tid * params.wgCount + workgroup] = atomicLoad(&bins[tid]);
    }
}
`, xn = `
@group(0) @binding(0) var<storage, read> inKeys: array<u32>;
@group(0) @binding(1) var<storage, read_write> outKeys: array<u32>;
@group(0) @binding(2) var<storage, read> histograms: array<u32>;
@group(0) @binding(3) var<storage, read> inVals: array<u32>;
@group(0) @binding(4) var<storage, read_write> outVals: array<u32>;
@group(0) @binding(5) var<uniform> params: SortParams;

${vn}

override BIT: u32;

var<workgroup> digit_bits: array<atomic<u32>, 128>;

@compute @workgroup_size(${pn}, ${mn}, 1)
fn main(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) wdim: vec3<u32>,
    @builtin(local_invocation_index) tid: u32,
) {
    let workgroup = wid.x + wid.y * wdim.x;
    let gid = workgroup * ${hn}u + tid;

    if (tid < 128u) { atomicStore(&digit_bits[tid], 0u); }
    workgroupBarrier();

    var digit = 16u;
    if (gid < params.count && workgroup < params.wgCount) {
        digit = (inKeys[gid] >> BIT) & 0xfu;
    }

    if (digit < 16u) {
        atomicOr(&digit_bits[digit * 8u + (tid >> 5u)], 1u << (tid & 31u));
    }
    workgroupBarrier();

    if (digit >= 16u) { return; }

    let word = tid >> 5u;
    var rank = 0u;
    for (var w = 0u; w < word; w++) {
        rank += countOneBits(atomicLoad(&digit_bits[digit * 8u + w]));
    }
    rank += countOneBits(atomicLoad(&digit_bits[digit * 8u + word]) & ((1u << (tid & 31u)) - 1u));

    let dst = histograms[digit * params.wgCount + workgroup] + rank;
    outKeys[dst] = inKeys[gid];
    outVals[dst] = inVals[gid];
}
`, Sn = `
@group(0) @binding(0) var<storage, read_write> data: array<u32>;
@group(0) @binding(1) var<storage, read_write> blockSums: array<u32>;
@group(0) @binding(2) var<uniform> params: PrefixParams;

${yn}

var<workgroup> temp: array<u32, ${gn * 2}>;

@compute @workgroup_size(${pn}, ${mn}, 1)
fn scan(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) wdim: vec3<u32>,
    @builtin(local_invocation_index) tid: u32,
) {
    let workgroup = wid.x + wid.y * wdim.x;
    let base = workgroup * ${hn}u;
    let gid = base + tid;
    let eid = gid * 2;

    temp[tid * 2] = select(data[eid], 0u, eid >= params.count);
    temp[tid * 2 + 1] = select(data[eid + 1], 0u, eid + 1 >= params.count);

    var offset = 1u;
    for (var d = ${gn}u >> 1; d > 0; d >>= 1) {
        workgroupBarrier();
        if (tid < d) {
            let ai = offset * (tid * 2 + 1) - 1;
            let bi = offset * (tid * 2 + 2) - 1;
            temp[bi] += temp[ai];
        }
        offset *= 2;
    }

    if (tid == 0) {
        blockSums[workgroup] = temp[${gn}u - 1];
        temp[${gn}u - 1] = 0;
    }

    for (var d = 1u; d < ${gn}u; d *= 2) {
        offset >>= 1;
        workgroupBarrier();
        if (tid < d) {
            let ai = offset * (tid * 2 + 1) - 1;
            let bi = offset * (tid * 2 + 2) - 1;
            let t = temp[ai];
            temp[ai] = temp[bi];
            temp[bi] += t;
        }
    }
    workgroupBarrier();

    if (eid < params.count) { data[eid] = temp[tid * 2]; }
    if (eid + 1 < params.count) { data[eid + 1] = temp[tid * 2 + 1]; }
}

@compute @workgroup_size(${pn}, ${mn}, 1)
fn addBlocks(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(num_workgroups) wdim: vec3<u32>,
    @builtin(local_invocation_index) tid: u32,
) {
    let workgroup = wid.x + wid.y * wdim.x;
    let eid = (workgroup * ${hn}u + tid) * 2;

    if (eid >= params.count) { return; }

    let sum = blockSums[workgroup];
    data[eid] += sum;
    if (eid + 1 < params.count) { data[eid + 1] += sum; }
}
`;
function Cn(e, t) {
	if (t <= e.limits.maxComputeWorkgroupsPerDimension) return [t, 1];
	let n = Math.ceil(Math.sqrt(t));
	return [n, Math.ceil(t / n)];
}
function wn(e, t, n, r) {
	let i = [], a = n, o = r;
	for (let n = 0; n < _n; n++) {
		let r = Math.max(Math.ceil(o / gn), 1), s = Cn(e, r), c = e.createBuffer({
			label: `prefix-params-${n}`,
			size: 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		e.queue.writeBuffer(c, 0, new Uint32Array([o]));
		let l = e.createBuffer({
			label: `prefix-blockSums-${n}`,
			size: Math.max(r * 4, 4),
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
		}), u = e.createBindGroup({
			layout: t,
			entries: [
				{
					binding: 0,
					resource: { buffer: a }
				},
				{
					binding: 1,
					resource: { buffer: l }
				},
				{
					binding: 2,
					resource: { buffer: c }
				}
			]
		});
		if (i.push({
			paramsBuffer: c,
			blockSums: l,
			bindGroup: u,
			count: o,
			dispatch: s
		}), r <= 1) break;
		a = l, o = r;
	}
	return i;
}
function Tn(e) {
	for (let t of e) t.paramsBuffer.destroy(), t.blockSums.destroy();
}
async function En(e, t, n) {
	let r = e.createShaderModule({ code: Sn }), i = e.createBindGroupLayout({ entries: [
		{
			binding: 0,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "storage" }
		},
		{
			binding: 1,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "storage" }
		},
		{
			binding: 2,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "uniform" }
		}
	] }), a = e.createPipelineLayout({ bindGroupLayouts: [i] }), [o, s] = await Promise.all([e.createComputePipelineAsync({
		label: "prefix-scan",
		layout: a,
		compute: {
			module: r,
			entryPoint: "scan"
		}
	}), e.createComputePipelineAsync({
		label: "prefix-add",
		layout: a,
		compute: {
			module: r,
			entryPoint: "addBlocks"
		}
	})]);
	return {
		scanPipeline: o,
		addBlocksPipeline: s,
		layout: i,
		levels: wn(e, i, t, n),
		device: e
	};
}
function Dn(e, t, n) {
	Tn(e.levels), e.levels = wn(e.device, e.layout, t, n);
}
function On(e) {
	Tn(e.levels);
}
function kn(e, t) {
	let { levels: n, scanPipeline: r, addBlocksPipeline: i } = e;
	for (let e of n) t.setPipeline(r), t.setBindGroup(0, e.bindGroup), t.dispatchWorkgroups(e.dispatch[0], e.dispatch[1], 1);
	for (let e = n.length - 2; e >= 0; e--) t.setPipeline(i), t.setBindGroup(0, n[e].bindGroup), t.dispatchWorkgroups(n[e].dispatch[0], n[e].dispatch[1], 1);
}
function An(e, t, n, r, i, a, o, s, c, l, u) {
	let d = [];
	for (let f = 0; f < 8; f++) {
		let p = f % 2 == 0, m = p ? a : s, h = p ? o : c, g = p ? s : a, _ = p ? c : o;
		d.push({
			histogram: {
				pipeline: r[f],
				bindGroup: e.createBindGroup({
					layout: t,
					entries: [
						{
							binding: 0,
							resource: { buffer: m }
						},
						{
							binding: 1,
							resource: { buffer: l }
						},
						{
							binding: 2,
							resource: { buffer: u }
						}
					]
				})
			},
			scatter: {
				pipeline: i[f],
				bindGroup: e.createBindGroup({
					layout: n,
					entries: [
						{
							binding: 0,
							resource: { buffer: m }
						},
						{
							binding: 1,
							resource: { buffer: g }
						},
						{
							binding: 2,
							resource: { buffer: l }
						},
						{
							binding: 3,
							resource: { buffer: h }
						},
						{
							binding: 4,
							resource: { buffer: _ }
						},
						{
							binding: 5,
							resource: { buffer: u }
						}
					]
				})
			}
		});
	}
	return d;
}
async function jn(e, t) {
	let { keys: n, values: r, count: i } = t, a = Math.ceil(i / hn), o = e.createBuffer({
		label: "radix-sort-indirect",
		size: 12,
		usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST
	});
	e.queue.writeBuffer(o, 0, new Uint32Array([
		a,
		1,
		1
	]));
	let s = e.createBuffer({
		label: "radix-sort-params",
		size: 8,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
	e.queue.writeBuffer(s, 0, new Uint32Array([i, a]));
	let c = e.createBuffer({
		label: "radix-tmpKeys",
		size: i * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	}), l = e.createBuffer({
		label: "radix-tmpVals",
		size: i * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	}), u = e.createBuffer({
		label: "radix-histograms",
		size: 16 * a * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	}), d = await En(e, u, 16 * a), f = e.createShaderModule({ code: bn }), p = e.createShaderModule({ code: xn }), m = e.createBindGroupLayout({ entries: [
		{
			binding: 0,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 1,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "storage" }
		},
		{
			binding: 2,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "uniform" }
		}
	] }), h = e.createBindGroupLayout({ entries: [
		{
			binding: 0,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 1,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "storage" }
		},
		{
			binding: 2,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 3,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 4,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "storage" }
		},
		{
			binding: 5,
			visibility: GPUShaderStage.COMPUTE,
			buffer: { type: "uniform" }
		}
	] }), g = [], _ = [], v = [];
	for (let t = 0; t < 32; t += 4) {
		let n = t / 4;
		v.push((async () => {
			let [r, i] = await Promise.all([e.createComputePipelineAsync({
				label: "radix-histogram",
				layout: e.createPipelineLayout({ bindGroupLayouts: [m] }),
				compute: {
					module: f,
					entryPoint: "main",
					constants: { BIT: t }
				}
			}), e.createComputePipelineAsync({
				label: "radix-scatter",
				layout: e.createPipelineLayout({ bindGroupLayouts: [h] }),
				compute: {
					module: p,
					entryPoint: "main",
					constants: { BIT: t }
				}
			})]);
			g[n] = r, _[n] = i;
		})());
	}
	return await Promise.all(v), {
		device: e,
		histogramLayout: m,
		scatterLayout: h,
		histogramPipelines: g,
		scatterPipelines: _,
		paramsBuffer: s,
		tmpKeys: c,
		tmpVals: l,
		histograms: u,
		passes: An(e, m, h, g, _, n, r, c, l, u, s),
		prefixSum: d,
		indirectBuffer: o,
		count: i
	};
}
function Mn(e, t, n, r) {
	let { device: i } = e, a = Math.ceil(r / hn);
	e.tmpKeys.destroy(), e.tmpVals.destroy(), e.histograms.destroy(), e.count = r, i.queue.writeBuffer(e.paramsBuffer, 0, new Uint32Array([r, a])), i.queue.writeBuffer(e.indirectBuffer, 0, new Uint32Array([
		a,
		1,
		1
	])), e.tmpKeys = i.createBuffer({
		label: "radix-tmpKeys",
		size: r * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	}), e.tmpVals = i.createBuffer({
		label: "radix-tmpVals",
		size: r * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	}), e.histograms = i.createBuffer({
		label: "radix-histograms",
		size: 16 * a * 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	}), Dn(e.prefixSum, e.histograms, 16 * a), e.passes = An(i, e.histogramLayout, e.scatterLayout, e.histogramPipelines, e.scatterPipelines, t, n, e.tmpKeys, e.tmpVals, e.histograms, e.paramsBuffer);
}
function Nn(e) {
	e.tmpKeys.destroy(), e.tmpVals.destroy(), e.histograms.destroy(), e.paramsBuffer.destroy(), e.indirectBuffer.destroy(), On(e.prefixSum);
}
function Pn(e, t) {
	for (let n of e.passes) t.setPipeline(n.histogram.pipeline), t.setBindGroup(0, n.histogram.bindGroup), t.dispatchWorkgroupsIndirect(e.indirectBuffer, 0), kn(e.prefixSum, t), t.setPipeline(n.scatter.pipeline), t.setBindGroup(0, n.scatter.bindGroup), t.dispatchWorkgroupsIndirect(e.indirectBuffer, 0);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/bvh/index.ts
var Fn = 256, In = 1023, Ln = "\nstruct InstanceAABB {\n    minX: f32,\n    minY: f32,\n    minZ: f32,\n    _pad0: u32,\n    maxX: f32,\n    maxY: f32,\n    maxZ: f32,\n    _pad1: u32,\n}", Rn = "\nstruct SceneBounds {\n    minX: atomic<i32>,\n    minY: atomic<i32>,\n    minZ: atomic<i32>,\n    _pad0: u32,\n    maxX: atomic<i32>,\n    maxY: atomic<i32>,\n    maxZ: atomic<i32>,\n    _pad1: u32,\n}", zn = "\nstruct SceneBounds {\n    minX: i32,\n    minY: i32,\n    minZ: i32,\n    _pad0: u32,\n    maxX: i32,\n    maxY: i32,\n    maxZ: i32,\n    _pad1: u32,\n}", Bn = "\nfn floatToSortableInt(f: f32) -> i32 {\n    let bits = bitcast<i32>(f);\n    let mask = (bits >> 31) & 0x7FFFFFFF;\n    return bits ^ mask;\n}\n\nfn sortableIntToFloat(i: i32) -> f32 {\n    let mask = (i >> 31) & 0x7FFFFFFF;\n    return bitcast<f32>(i ^ mask);\n}", Vn = "\nfn expandBits(v: u32) -> u32 {\n    var x = v & 0x3ffu;\n    x = (x | (x << 16u)) & 0x030000ffu;\n    x = (x | (x << 8u)) & 0x0300f00fu;\n    x = (x | (x << 4u)) & 0x030c30c3u;\n    x = (x | (x << 2u)) & 0x09249249u;\n    return x;\n}\n\nfn mortonCode(x: u32, y: u32, z: u32) -> u32 {\n    return (expandBits(x) << 2u) | (expandBits(y) << 1u) | expandBits(z);\n}", Hn = "\nfn clz(x: u32) -> u32 {\n    return countLeadingZeros(x);\n}", Un = "\nstruct TreeNode {\n    minX: f32,\n    minY: f32,\n    minZ: f32,\n    leftChild: u32,\n    maxX: f32,\n    maxY: f32,\n    maxZ: f32,\n    rightChild: u32,\n}", Wn = "const LEAF_FLAG: u32 = 0x80000000u;", Gn = "const AABB_SENTINEL: f32 = 1e30;", Kn = "\nfn isLeaf(child: u32) -> bool {\n    return (child & LEAF_FLAG) != 0u;\n}\n\nfn leafIndex(child: u32) -> u32 {\n    return child & ~LEAF_FLAG;\n}", qn = new Int32Array([
	2139095039,
	2139095039,
	2139095039,
	0,
	2155872256,
	2155872256,
	2155872256,
	0
]), Jn = `
${Ln}
${Rn}
${Gn}

@group(0) @binding(0) var<storage, read> leafAABBs: array<InstanceAABB>;
@group(0) @binding(1) var<storage, read_write> sceneBounds: SceneBounds;
@group(0) @binding(2) var<storage, read> leafCount: array<u32>;

var<workgroup> sharedMin: array<vec3<f32>, ${Fn}>;
var<workgroup> sharedMax: array<vec3<f32>, ${Fn}>;

${Bn}

@compute @workgroup_size(${Fn})
fn main(
    @builtin(global_invocation_id) gid: vec3<u32>,
    @builtin(local_invocation_id) lid: vec3<u32>,
) {
    let count = leafCount[0];
    let tid = gid.x;
    let localId = lid.x;

    var localMin = vec3<f32>(AABB_SENTINEL, AABB_SENTINEL, AABB_SENTINEL);
    var localMax = vec3<f32>(-AABB_SENTINEL, -AABB_SENTINEL, -AABB_SENTINEL);

    if (tid < count) {
        let aabb = leafAABBs[tid];
        localMin = vec3<f32>(aabb.minX, aabb.minY, aabb.minZ);
        localMax = vec3<f32>(aabb.maxX, aabb.maxY, aabb.maxZ);
    }

    sharedMin[localId] = localMin;
    sharedMax[localId] = localMax;
    workgroupBarrier();

    for (var stride = ${Fn}u / 2u; stride > 0u; stride >>= 1u) {
        if (localId < stride) {
            sharedMin[localId] = min(sharedMin[localId], sharedMin[localId + stride]);
            sharedMax[localId] = max(sharedMax[localId], sharedMax[localId + stride]);
        }
        workgroupBarrier();
    }

    if (localId == 0u) {
        let wgMin = sharedMin[0];
        let wgMax = sharedMax[0];

        atomicMin(&sceneBounds.minX, floatToSortableInt(wgMin.x));
        atomicMin(&sceneBounds.minY, floatToSortableInt(wgMin.y));
        atomicMin(&sceneBounds.minZ, floatToSortableInt(wgMin.z));
        atomicMax(&sceneBounds.maxX, floatToSortableInt(wgMax.x));
        atomicMax(&sceneBounds.maxY, floatToSortableInt(wgMax.y));
        atomicMax(&sceneBounds.maxZ, floatToSortableInt(wgMax.z));
    }
}
`, Yn = `
${Ln}
${zn}

struct MortonParams { capacity: u32 }

@group(0) @binding(0) var<storage, read> leafAABBs: array<InstanceAABB>;
@group(0) @binding(1) var<storage, read> sceneBounds: SceneBounds;
@group(0) @binding(2) var<storage, read_write> mortonCodes: array<u32>;
@group(0) @binding(3) var<storage, read_write> sortedIds: array<u32>;
@group(0) @binding(4) var<storage, read> leafCount: array<u32>;
@group(0) @binding(5) var<uniform> mortonParams: MortonParams;

${Bn}
${Vn}

@compute @workgroup_size(${Fn})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let tid = gid.x;
    if (tid >= mortonParams.capacity) { return; }

    let count = leafCount[0];
    if (tid >= count) {
        mortonCodes[tid] = 0xFFFFFFFFu;
        sortedIds[tid] = 0u;
        return;
    }

    let aabb = leafAABBs[tid];
    let centroid = vec3<f32>(
        (aabb.minX + aabb.maxX) * 0.5,
        (aabb.minY + aabb.maxY) * 0.5,
        (aabb.minZ + aabb.maxZ) * 0.5
    );

    let boundsMin = vec3<f32>(
        sortableIntToFloat(sceneBounds.minX),
        sortableIntToFloat(sceneBounds.minY),
        sortableIntToFloat(sceneBounds.minZ)
    );
    let boundsMax = vec3<f32>(
        sortableIntToFloat(sceneBounds.maxX),
        sortableIntToFloat(sceneBounds.maxY),
        sortableIntToFloat(sceneBounds.maxZ)
    );

    let size = boundsMax - boundsMin;
    let safeSize = max(size, vec3<f32>(1e-6, 1e-6, 1e-6));

    let normalized = (centroid - boundsMin) / safeSize;
    let clamped = clamp(normalized, vec3<f32>(0.0), vec3<f32>(1.0));

    let quantized = vec3<u32>(clamped * ${In}.0);

    mortonCodes[tid] = mortonCode(quantized.x, quantized.y, quantized.z);
    sortedIds[tid] = tid;
}
`, Xn = `
${Un}
${Wn}
${Gn}

@group(0) @binding(0) var<storage, read> mortonCodes: array<u32>;
@group(0) @binding(1) var<storage, read_write> treeNodes: array<TreeNode>;
@group(0) @binding(2) var<storage, read_write> parentIndices: array<u32>;
@group(0) @binding(3) var<storage, read> leafCount: array<u32>;

${Hn}

fn delta(i: i32, j: i32, n: i32) -> i32 {
    if (j < 0 || j >= n) {
        return -1;
    }
    let codeI = mortonCodes[i];
    let codeJ = mortonCodes[j];
    if (codeI == codeJ) {
        return i32(clz(u32(i) ^ u32(j))) + 32;
    }
    return i32(clz(codeI ^ codeJ));
}

@compute @workgroup_size(${Fn})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let n = i32(leafCount[0]);
    let i = i32(gid.x);

    if (i >= n - 1) {
        return;
    }

    var first: i32;
    var last: i32;

    if (i == 0) {
        first = 0;
        last = n - 1;
    } else {
        let d = select(-1, 1, delta(i, i + 1, n) > delta(i, i - 1, n));

        let deltaMin = delta(i, i - d, n);

        var lmax = 2;
        for (var iter = 0; iter < 32; iter++) {
            if (delta(i, i + lmax * d, n) <= deltaMin) { break; }
            lmax *= 2;
        }

        var l = 0;
        var t = lmax / 2;
        for (var iter2 = 0; iter2 < 32; iter2++) {
            if (t < 1) { break; }
            if (delta(i, i + (l + t) * d, n) > deltaMin) {
                l += t;
            }
            t /= 2;
        }

        let j = i + l * d;
        first = min(i, j);
        last = max(i, j);
    }

    let deltaNode = delta(first, last, n);

    var gamma: i32;
    var split = first;
    var stride = last - first;

    for (var iter3 = 0; iter3 < 32; iter3++) {
        stride = (stride + 1) / 2;
        let middle = split + stride;

        if (middle < last) {
            let splitDelta = delta(first, middle, n);

            if (splitDelta > deltaNode) {
                split = middle;
            }
        }

        if (stride <= 1) {
            break;
        }
    }

    gamma = split;

    let leftIsLeaf = first == gamma;
    let rightIsLeaf = last == gamma + 1;

    var node: TreeNode;
    node.minX = AABB_SENTINEL;
    node.minY = AABB_SENTINEL;
    node.minZ = AABB_SENTINEL;
    node.maxX = -AABB_SENTINEL;
    node.maxY = -AABB_SENTINEL;
    node.maxZ = -AABB_SENTINEL;

    if (leftIsLeaf) {
        node.leftChild = u32(gamma) | LEAF_FLAG;
        parentIndices[u32(gamma)] = u32(i);
    } else {
        node.leftChild = u32(gamma);
        parentIndices[u32(n) + u32(gamma)] = u32(i);
    }

    if (rightIsLeaf) {
        node.rightChild = u32(gamma + 1) | LEAF_FLAG;
        parentIndices[u32(gamma + 1)] = u32(i);
    } else {
        node.rightChild = u32(gamma + 1);
        parentIndices[u32(n) + u32(gamma + 1)] = u32(i);
    }

    treeNodes[i] = node;
}
`, Zn = `
${Ln}
${Wn}

const BOUNDS_SENTINEL: u32 = 0x7f800000u;

@group(0) @binding(0) var<storage, read> leafAABBs: array<InstanceAABB>;
@group(0) @binding(1) var<storage, read> sortedIds: array<u32>;
@group(0) @binding(2) var<storage, read_write> treeNodesRaw: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> boundsFlags: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read> parentIndices: array<u32>;
@group(0) @binding(5) var<storage, read> leafCount: array<u32>;

${Kn}

fn getLeafBounds(leafIdx: u32) -> array<vec3<f32>, 2> {
    let srcIdx = sortedIds[leafIdx];
    let aabb = leafAABBs[srcIdx];
    return array<vec3<f32>, 2>(
        vec3<f32>(aabb.minX, aabb.minY, aabb.minZ),
        vec3<f32>(aabb.maxX, aabb.maxY, aabb.maxZ)
    );
}

fn getParent(nodeIdx: u32, isLeafNode: bool, n: u32) -> u32 {
    if (isLeafNode) {
        return parentIndices[nodeIdx];
    } else {
        return parentIndices[n + nodeIdx];
    }
}

fn nodeBase(idx: u32) -> u32 {
    return idx * 8u;
}

fn readChildBounds(childIdx: u32) -> array<vec3<f32>, 2> {
    let base = nodeBase(childIdx);
    let minX = bitcast<f32>(atomicLoad(&treeNodesRaw[base + 0u]));
    let minY = bitcast<f32>(atomicLoad(&treeNodesRaw[base + 1u]));
    let minZ = bitcast<f32>(atomicLoad(&treeNodesRaw[base + 2u]));
    let maxX = bitcast<f32>(atomicLoad(&treeNodesRaw[base + 4u]));
    let maxY = bitcast<f32>(atomicLoad(&treeNodesRaw[base + 5u]));
    let maxZ = bitcast<f32>(atomicLoad(&treeNodesRaw[base + 6u]));
    return array<vec3<f32>, 2>(vec3(minX, minY, minZ), vec3(maxX, maxY, maxZ));
}

fn writeBounds(nodeIdx: u32, minB: vec3<f32>, maxB: vec3<f32>) {
    let base = nodeBase(nodeIdx);
    atomicStore(&treeNodesRaw[base + 0u], bitcast<u32>(minB.x));
    atomicStore(&treeNodesRaw[base + 1u], bitcast<u32>(minB.y));
    atomicStore(&treeNodesRaw[base + 2u], bitcast<u32>(minB.z));
    atomicStore(&treeNodesRaw[base + 4u], bitcast<u32>(maxB.x));
    atomicStore(&treeNodesRaw[base + 5u], bitcast<u32>(maxB.y));
    atomicStore(&treeNodesRaw[base + 6u], bitcast<u32>(maxB.z));
}

fn readLeftChild(nodeIdx: u32) -> u32 {
    return atomicLoad(&treeNodesRaw[nodeBase(nodeIdx) + 3u]);
}

fn readRightChild(nodeIdx: u32) -> u32 {
    return atomicLoad(&treeNodesRaw[nodeBase(nodeIdx) + 7u]);
}

@compute @workgroup_size(${Fn})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let n = leafCount[0];
    let leafIdx = gid.x;

    if (leafIdx >= n) {
        return;
    }

    let bounds = getLeafBounds(leafIdx);
    writeBounds(n - 1u + leafIdx, bounds[0], bounds[1]);

    var current = leafIdx;
    var isLeafNode = true;

    for (var iter = 0u; iter < 64u; iter++) {
        let parent = getParent(current, isLeafNode, n);

        let oldFlag = atomicAdd(&boundsFlags[parent], 1u);

        if (oldFlag == 0u) {
            return;
        }

        let left = readLeftChild(parent);
        let right = readRightChild(parent);

        var leftMin: vec3<f32>;
        var leftMax: vec3<f32>;
        var rightMin: vec3<f32>;
        var rightMax: vec3<f32>;

        if (isLeaf(left)) {
            let leftBounds = getLeafBounds(leafIndex(left));
            leftMin = leftBounds[0];
            leftMax = leftBounds[1];
        } else {
            let leftBounds = readChildBounds(left);
            leftMin = leftBounds[0];
            leftMax = leftBounds[1];
        }

        if (isLeaf(right)) {
            let rightBounds = getLeafBounds(leafIndex(right));
            rightMin = rightBounds[0];
            rightMax = rightBounds[1];
        } else {
            let rightBounds = readChildBounds(right);
            rightMin = rightBounds[0];
            rightMax = rightBounds[1];
        }

        let newMin = min(leftMin, rightMin);
        let newMax = max(leftMax, rightMax);

        writeBounds(parent, newMin, newMax);

        current = parent;
        isLeafNode = false;

        if (parent == 0u) {
            break;
        }
    }
}
`;
function Qn(e, t, n) {
	let r = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, i = e.createBuffer({
		label: `${n}-treeNodes`,
		size: 2 * t * 32,
		usage: r
	}), a = e.createBuffer({
		label: `${n}-mortonCodes`,
		size: t * 4,
		usage: r
	}), o = e.createBuffer({
		label: `${n}-sortedIds`,
		size: t * 4,
		usage: r
	}), s = e.createBuffer({
		label: `${n}-sceneBounds`,
		size: 32,
		usage: r
	}), c = e.createBuffer({
		label: `${n}-parentIndices`,
		size: 2 * t * 4,
		usage: r
	}), l = e.createBuffer({
		label: `${n}-boundsFlags`,
		size: t * 4,
		usage: r
	}), u = e.createBuffer({
		label: `${n}-mortonParams`,
		size: 4,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
	return e.queue.writeBuffer(u, 0, new Uint32Array([t])), {
		treeNodes: i,
		mortonCodes: a,
		sortedIds: o,
		sceneBounds: s,
		parentIndices: c,
		boundsFlags: l,
		mortonParamsBuffer: u
	};
}
function $n(e) {
	e.treeNodes.destroy(), e.sortedIds.destroy(), e.mortonCodes.destroy(), e.sceneBounds.destroy(), e.parentIndices.destroy(), e.boundsFlags.destroy(), e.mortonParamsBuffer.destroy();
}
function er(e, t, n, r, i) {
	return {
		bounds: e.createBindGroup({
			layout: t.bounds.getBindGroupLayout(0),
			entries: [
				{
					binding: 0,
					resource: { buffer: n }
				},
				{
					binding: 1,
					resource: { buffer: i.sceneBounds }
				},
				{
					binding: 2,
					resource: { buffer: r }
				}
			]
		}),
		morton: e.createBindGroup({
			layout: t.morton.getBindGroupLayout(0),
			entries: [
				{
					binding: 0,
					resource: { buffer: n }
				},
				{
					binding: 1,
					resource: { buffer: i.sceneBounds }
				},
				{
					binding: 2,
					resource: { buffer: i.mortonCodes }
				},
				{
					binding: 3,
					resource: { buffer: i.sortedIds }
				},
				{
					binding: 4,
					resource: { buffer: r }
				},
				{
					binding: 5,
					resource: { buffer: i.mortonParamsBuffer }
				}
			]
		}),
		tree: e.createBindGroup({
			layout: t.tree.getBindGroupLayout(0),
			entries: [
				{
					binding: 0,
					resource: { buffer: i.mortonCodes }
				},
				{
					binding: 1,
					resource: { buffer: i.treeNodes }
				},
				{
					binding: 2,
					resource: { buffer: i.parentIndices }
				},
				{
					binding: 3,
					resource: { buffer: r }
				}
			]
		}),
		propagate: e.createBindGroup({
			layout: t.propagate.getBindGroupLayout(0),
			entries: [
				{
					binding: 0,
					resource: { buffer: n }
				},
				{
					binding: 1,
					resource: { buffer: i.sortedIds }
				},
				{
					binding: 2,
					resource: { buffer: i.treeNodes }
				},
				{
					binding: 3,
					resource: { buffer: i.boundsFlags }
				},
				{
					binding: 4,
					resource: { buffer: i.parentIndices }
				},
				{
					binding: 5,
					resource: { buffer: r }
				}
			]
		})
	};
}
async function tr(e, t) {
	let { leafAABBs: n, countBuffer: r, maxLeaves: i, label: a } = t, o = Qn(e, i, a), [s, c, l, u] = await Promise.all([
		e.createShaderModule({ code: Jn }),
		e.createShaderModule({ code: Yn }),
		e.createShaderModule({ code: Xn }),
		e.createShaderModule({ code: Zn })
	]), [d, f, p, m, h] = await Promise.all([
		e.createComputePipelineAsync({
			label: "bvh-bounds",
			layout: "auto",
			compute: {
				module: s,
				entryPoint: "main"
			}
		}),
		e.createComputePipelineAsync({
			label: "bvh-morton",
			layout: "auto",
			compute: {
				module: c,
				entryPoint: "main"
			}
		}),
		e.createComputePipelineAsync({
			label: "bvh-tree",
			layout: "auto",
			compute: {
				module: l,
				entryPoint: "main"
			}
		}),
		e.createComputePipelineAsync({
			label: "bvh-propagate",
			layout: "auto",
			compute: {
				module: u,
				entryPoint: "main"
			}
		}),
		jn(e, {
			keys: o.mortonCodes,
			values: o.sortedIds,
			count: i
		})
	]), g = {
		bounds: d,
		morton: f,
		tree: p,
		propagate: m
	}, _ = er(e, g, n, r, o);
	return {
		...o,
		radixSort: h,
		config: t,
		pipelines: g,
		bindGroups: _
	};
}
function nr(e, t, n, r) {
	$n(e);
	let { countBuffer: i, label: a } = e.config;
	e.config = {
		leafAABBs: n,
		countBuffer: i,
		maxLeaves: r,
		label: a
	};
	let o = Qn(t, r, a);
	Object.assign(e, o), Mn(e.radixSort, o.mortonCodes, o.sortedIds, r), e.bindGroups = er(t, e.pipelines, n, i, o);
}
function rr(e, t, n, r, i) {
	n.queue.writeBuffer(e.sceneBounds, 0, qn), t.clearBuffer(e.parentIndices), t.clearBuffer(e.boundsFlags);
	let a = Math.ceil(r / Fn), o = Math.ceil(e.config.maxLeaves / Fn), s = Math.ceil(Math.max(r - 1, 1) / Fn), c = Math.ceil(r / Fn), l = L(t, i?.("lbvh:bounds"));
	l.setPipeline(e.pipelines.bounds), l.setBindGroup(0, e.bindGroups.bounds), l.dispatchWorkgroups(a), l.end(), l = L(t, i?.("lbvh:morton")), l.setPipeline(e.pipelines.morton), l.setBindGroup(0, e.bindGroups.morton), l.dispatchWorkgroups(o), l.end(), l = L(t, i?.("lbvh:sort")), Pn(e.radixSort, l), l.end(), l = L(t, i?.("lbvh:tree")), l.setPipeline(e.pipelines.tree), l.setBindGroup(0, e.bindGroups.tree), l.dispatchWorkgroups(s), l.end(), l = L(t, i?.("lbvh:propagate")), l.setPipeline(e.pipelines.propagate), l.setBindGroup(0, e.bindGroups.propagate), l.dispatchWorkgroups(c), l.end();
}
function ir(e) {
	$n(e), Nn(e.radixSort);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/viewport/view.ts
function ar(e) {
	let t = window.devicePixelRatio || 1, n = e.getBoundingClientRect(), r = Math.max(1, Math.floor(n.width * t)), i = Math.max(1, Math.floor(n.height * t));
	(e.width !== r || e.height !== i) && (e.width = r, e.height = i);
}
function or(e, t) {
	let n = e.getContext("webgpu"), r = navigator.gpu.getPreferredCanvasFormat();
	e.style.imageRendering = "pixelated", n.configure({
		device: t,
		format: r,
		alphaMode: "premultiplied",
		usage: GPUTextureUsage.RENDER_ATTACHMENT
	}), ar(e);
	let i = {
		element: e,
		context: n,
		format: r,
		textures: /* @__PURE__ */ new Map(),
		textureViews: /* @__PURE__ */ new Map(),
		width: e.width,
		height: e.height,
		observer: null,
		dirty: !0
	}, a = new ResizeObserver(() => {
		ar(e), i.dirty = !0;
	});
	return a.observe(e), i.observer = a, i;
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/compute/profile.ts
var sr = I("gpu-profile");
function cr(e, t = 32) {
	let n = e.createQuerySet({
		type: "timestamp",
		count: t * 2
	}), r = t * 2 * 8;
	return {
		querySet: n,
		resolveBuffer: e.createBuffer({
			label: "profile-resolve",
			size: r,
			usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
		}),
		readBuffer: e.createBuffer({
			label: "profile-read",
			size: r,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
		}),
		capacity: t,
		nextSlot: 0,
		passes: [],
		durations: /* @__PURE__ */ new Map(),
		pendingCount: 0,
		pendingPasses: []
	};
}
var lr = [];
function ur(e, t) {
	let n = e.nextSlot;
	if (n >= e.capacity) return;
	e.passes[n] = t, e.nextSlot = n + 1;
	let r = lr[n];
	return (!r || r.querySet !== e.querySet) && (r = {
		querySet: e.querySet,
		beginningOfPassWriteIndex: n * 2,
		endOfPassWriteIndex: n * 2 + 1
	}, lr[n] = r), r;
}
function dr(e) {
	e.nextSlot = 0;
}
function fr(e, t) {
	let n = t.nextSlot * 2;
	n !== 0 && (e.resolveQuerySet(t.querySet, 0, n, t.resolveBuffer, 0), t.readBuffer.mapState === "unmapped" && (e.copyBufferToBuffer(t.resolveBuffer, 0, t.readBuffer, 0, n * 8), t.pendingCount = t.nextSlot, t.pendingPasses = t.passes.slice(0, t.nextSlot)));
}
function pr(e) {
	e.readBuffer.mapState === "unmapped" && e.pendingCount !== 0 && e.readBuffer.mapAsync(GPUMapMode.READ).catch(() => {});
}
function mr(e) {
	if (e.readBuffer.mapState !== "mapped") return;
	e.durations.clear();
	let t = e.readBuffer.getMappedRange(), n = new BigUint64Array(t);
	for (let t = 0; t < e.pendingCount; t++) {
		let r = e.pendingPasses[t], i = n[t * 2], a = n[t * 2 + 1];
		e.durations.set(r, (e.durations.get(r) ?? 0) + Number(a - i) / 1e6);
	}
	e.readBuffer.unmap();
}
I("gpu-registry");
//#endregion
//#region ../../shallot/packages/shallot/src/standard/viewport/index.ts
var hr = I("active-camera"), gr = I("views"), _r = { selector: {} }, vr = I("view-hooks");
function yr(e, t, n, r, i, a) {
	let o = t.createCommandEncoder();
	n.encoder = o;
	let s = () => {
		for (let e = 0; e < i.length; e++) i[e]();
		i.length = 0;
	};
	for (let r of e) {
		if (a) {
			let e = performance.now();
			r.execute(n), a(`  ${r.name}`, performance.now() - e);
		} else r.execute(n);
		r.sync && (t.queue.submit([o.finish()]), s(), o = t.createCommandEncoder(), n.encoder = o);
	}
	if (r && r.nextSlot > 0 && fr(o, r), a) {
		let e = performance.now();
		t.queue.submit([o.finish()]), a("Viewport/1:submit", performance.now() - e);
	} else t.queue.submit([o.finish()]);
	s();
}
function br(e, t, n) {
	let r = [], i = n ? (e) => ur(n, e) : void 0;
	return {
		ctx: {
			device: e,
			queue: e.queue,
			encoder: null,
			context: null,
			format: navigator.gpu.getPreferredCanvasFormat(),
			canvasView: null,
			timestampWrites: i,
			getTexture(e) {
				return t.textures.get(e) ?? null;
			},
			getTextureView(e) {
				return t.textureViews.get(e) ?? null;
			},
			getBuffer(e) {
				return t.buffers.get(e) ?? null;
			},
			setTexture(e, n) {
				t.textures.set(e, n);
			},
			setTextureView(e, n) {
				t.textureViews.set(e, n);
			},
			setBuffer(e, n) {
				t.buffers.set(e, n);
			},
			afterSubmit(e) {
				r.push(e);
			},
			subGraph: ""
		},
		afterSubmitQueue: r
	};
}
function xr(e, t, n, r) {
	let i = e.ctx;
	i.context = t, i.format = n, i.canvasView = r;
}
function Sr(e, t) {
	let n = null;
	for (let [r, i] of e.subGraphs) {
		if (i.check?.(t)) return r;
		!i.check && n === null && (n = r);
	}
	return n ?? "";
}
var Cr = null, wr = null, Tr = null;
function Er(e, t, n) {
	let { device: r, graph: i, resources: a } = e, o = i.compile(t);
	o.frame.length !== 0 && ((!wr || Tr !== a) && (wr = br(r, a, Cr), Tr = a), xr(wr, null, "", null), yr(o.frame, r, wr.ctx, Cr, wr.afterSubmitQueue, n));
}
var Dr = null, Or = null;
function kr(e, t, n, r) {
	let { device: i, graph: a, resources: o } = e, { context: s, format: c } = t, l = a.compile(n);
	if (l.view.length === 0) return;
	t.textures.forEach((e, t) => {
		o.textures.set(t, e);
	}), t.textureViews.forEach((e, t) => {
		o.textureViews.set(t, e);
	});
	let u = s.getCurrentTexture();
	if (!u) return;
	let d = u.createView();
	(!Dr || Or !== o) && (Dr = br(i, o, Cr), Or = o), xr(Dr, s, c, d), Dr.ctx.subGraph = n, yr(l.view, i, Dr.ctx, Cr, Dr.afterSubmitQueue, r), Cr && pr(Cr);
}
var Ar = [];
function jr(e) {
	let t = un.from(e), n = gr.from(e);
	if (!t || !n) return;
	let { device: r } = t;
	Ar.length = 0;
	for (let t of e.query([_r])) Ar.push(t);
	let i = Ar;
	if (i.length === 0 && document.querySelector("canvas")) {
		let t = e.addEntity();
		e.addComponent(t, _r), i.push(t);
	}
	for (let e of i) {
		if (n.has(e)) continue;
		let t = _r.selector[e], i = t ? document.querySelector(t) : document.querySelector("canvas");
		if (!i) {
			t && console.warn(`Canvas selector "${t}" matched no element`);
			continue;
		}
		n.set(e, or(i, r));
	}
}
var Mr = {
	name: "Viewport",
	systems: [{
		group: "setup",
		annotations: { mode: "always" },
		setup(e) {
			jr(e);
		},
		update(e) {
			let t = gr.from(e);
			if (t) for (let e of t.values()) e.dirty &&= (e.element && (e.width = e.element.width, e.height = e.element.height), !1);
		},
		dispose(e) {
			let t = gr.from(e);
			if (t) for (let e of t.values()) e.observer?.disconnect();
		}
	}, {
		group: "draw",
		annotations: { mode: "always" },
		last: !0,
		update(e) {
			let t = un.from(e), n = gr.from(e);
			if (!t || !n || n.size === 0) return;
			let r = !0;
			for (let e of n.values()) if (e.width > 0 && e.height > 0) {
				r = !1;
				break;
			}
			if (r) return;
			Cr && (mr(Cr), dr(Cr));
			let i = e.scheduler.reportCpu.bind(e.scheduler), a = vr.from(e), o = !1, s;
			for (let [r, c] of n) {
				if (a) {
					s = performance.now();
					for (let t of a) t(e, r, c);
					i("Viewport/1:hooks", performance.now() - s);
				}
				let n = hr.from(e)?.eid ?? -1, l = Sr(t.graph, n);
				o || (o = !0, s = performance.now(), Er(t, l, i), i("Viewport/1:frame", performance.now() - s)), s = performance.now(), kr(t, c, l, i), i("Viewport/1:view", performance.now() - s);
			}
			t.frameIndex++;
		}
	}],
	components: { Canvas: _r },
	dependencies: [fn],
	async initialize(e) {
		_r.selector = {}, e.setResource(gr, /* @__PURE__ */ new Map()), e.setResource(vr, []);
		let t = un.from(e);
		if (t) {
			Cr = t.device.features.has("timestamp-query") ? cr(t.device, 64) : null;
			let n = [];
			Cr && n.push(Cr.durations), e.setResource(sr, n);
		}
	}
}, Nr = I("inputs"), Pr = I("input");
function Fr(e, t) {
	e.left = (t & 1) != 0, e.right = (t & 2) != 0, e.middle = (t & 4) != 0;
}
function Ir(e) {
	e.left = !1, e.middle = !1, e.right = !1;
}
function Lr(e) {
	e.activePointerId = null, e.activeButton = null, e.activeCanvas = null, e.lastPointerX = 0, e.lastPointerY = 0;
}
function Rr(e) {
	e.pointerHover = (t) => {
		let n = t.target;
		if (!e.canvases.has(n)) return;
		e.mouse.hover = !0;
		let r = n.getBoundingClientRect();
		e.mouse.x = t.clientX - r.left, e.mouse.y = t.clientY - r.top, e.mouse.canvasWidth = r.width, e.mouse.canvasHeight = r.height;
	}, e.pointerEnter = () => {
		e.mouse.hover = !0;
	}, e.pointerLeave = () => {
		e.activePointerId === null && (e.mouse.hover = !1);
	}, e.keyDown = (t) => {
		let n = document.pointerLockElement;
		!e.canvasFocused && !(n && e.canvases.has(n)) || (e.keys.has(t.code) || (e.keysPressed.add(t.code), e.keyPressedAt.set(t.code, performance.now())), e.keys.add(t.code));
	}, e.keyUp = (t) => {
		e.keys.delete(t.code), e.keysReleased.add(t.code);
	}, e.pointerDown = (t) => {
		let n = t.target, r = e.canvases.get(n);
		if (r !== void 0) {
			if (window.focus(), (e.activePointerId === null || e.activePointerId === t.pointerId) && Fr(e.mouse, t.buttons), e.activePointerId === null) {
				e.activePointerId = t.pointerId, e.activeButton = t.button, e.activeCanvas = n, e.focused = r, e.canvasFocused = !0, e.lastPointerX = t.clientX, e.lastPointerY = t.clientY;
				try {
					n.setPointerCapture(t.pointerId);
				} catch {}
			}
			t.preventDefault();
		}
	}, e.windowPointerDown = (t) => {
		e.canvases.has(t.target) || (e.canvasFocused = !1, e.keys.clear());
	}, e.windowBlur = () => {
		e.canvasFocused = !1, e.keys.clear(), e.keysPressed.clear();
	}, e.pointerUp = (t) => {
		t.pointerId === e.activePointerId && (Fr(e.mouse, t.buttons), t.button === e.activeButton && (e.activeCanvas?.releasePointerCapture(t.pointerId), Lr(e)));
	}, e.pointerCancel = (t) => {
		t.pointerId === e.activePointerId && (Ir(e.mouse), Lr(e));
	}, e.pointerMove = (t) => {
		t.pointerId === e.activePointerId && (Fr(e.mouse, t.buttons), t.preventDefault(), e.mouse.deltaX += t.clientX - e.lastPointerX, e.mouse.deltaY += t.clientY - e.lastPointerY, e.lastPointerX = t.clientX, e.lastPointerY = t.clientY);
	}, e.wheel = (t) => {
		let n = t.target;
		e.canvases.has(n) && (e.mouse.scroll += t.deltaY, t.preventDefault());
	}, e.contextMenu = (t) => {
		e.canvases.has(t.target) && t.preventDefault();
	};
}
function zr(e, t) {
	t.addEventListener("pointerdown", e.pointerDown), t.addEventListener("pointermove", e.pointerHover), t.addEventListener("pointerenter", e.pointerEnter), t.addEventListener("pointerleave", e.pointerLeave), t.addEventListener("wheel", e.wheel, { passive: !1 }), t.addEventListener("contextmenu", e.contextMenu);
}
function Br(e, t) {
	t.removeEventListener("pointerdown", e.pointerDown), t.removeEventListener("pointermove", e.pointerHover), t.removeEventListener("pointerenter", e.pointerEnter), t.removeEventListener("pointerleave", e.pointerLeave), t.removeEventListener("wheel", e.wheel), t.removeEventListener("contextmenu", e.contextMenu);
}
function Vr(e) {
	window.addEventListener("keydown", e.keyDown), window.addEventListener("keyup", e.keyUp), window.addEventListener("pointerdown", e.windowPointerDown), window.addEventListener("pointerup", e.pointerUp), window.addEventListener("pointercancel", e.pointerCancel), window.addEventListener("pointermove", e.pointerMove), window.addEventListener("blur", e.windowBlur);
}
function Hr(e) {
	window.removeEventListener("keydown", e.keyDown), window.removeEventListener("keyup", e.keyUp), window.removeEventListener("pointerdown", e.windowPointerDown), window.removeEventListener("pointerup", e.pointerUp), window.removeEventListener("pointercancel", e.pointerCancel), window.removeEventListener("pointermove", e.pointerMove), window.removeEventListener("blur", e.windowBlur);
}
function Ur(e, t) {
	let n = {
		deltaX: 0,
		deltaY: 0,
		scroll: 0,
		left: !1,
		right: !1,
		middle: !1,
		hover: !1,
		x: 0,
		y: 0,
		canvasWidth: 0,
		canvasHeight: 0
	}, r = /* @__PURE__ */ new Map(), i = -1;
	for (let [e, n] of t) n.element && (r.set(n.element, e), n.element.style.touchAction = "none", i < 0 && (i = e));
	if (r.size === 0) return;
	let a = {
		keys: /* @__PURE__ */ new Set(),
		keysPressed: /* @__PURE__ */ new Set(),
		keysReleased: /* @__PURE__ */ new Set(),
		keyPressedAt: /* @__PURE__ */ new Map(),
		mouse: n,
		canvases: r,
		activeCanvas: null,
		focused: i,
		lastPointerX: 0,
		lastPointerY: 0,
		activePointerId: null,
		activeButton: null,
		pointerHover: null,
		pointerEnter: null,
		pointerLeave: null,
		keyDown: null,
		keyUp: null,
		pointerDown: null,
		pointerUp: null,
		pointerCancel: null,
		pointerMove: null,
		wheel: null,
		contextMenu: null,
		canvasFocused: !0,
		windowPointerDown: null,
		windowBlur: null
	};
	Rr(a), Vr(a);
	for (let e of r.keys()) zr(a, e);
	e.setResource(Pr, a), e.setResource(Nr, {
		mouse: n,
		get focused() {
			return a.focused;
		},
		isKeyDown: (e) => a.keys.has(e),
		isKeyPressed: (e) => a.keysPressed.has(e),
		isKeyReleased: (e) => a.keysReleased.has(e),
		isKeyPressedWithin: (e, t) => performance.now() - (a.keyPressedAt.get(e) ?? -Infinity) < t * 1e3
	});
}
var Wr = {
	name: "Input",
	systems: [{
		group: "simulation",
		annotations: { mode: "always" },
		setup(e) {
			let t = gr.from(e);
			!t || t.size === 0 || Ur(e, t);
		},
		dispose(e) {
			let t = Pr.from(e);
			if (t) {
				Hr(t);
				for (let e of t.canvases.keys()) Br(t, e);
				e.deleteResource(Pr);
			}
			e.deleteResource(Nr);
		}
	}, {
		group: "draw",
		annotations: { mode: "always" },
		last: !0,
		update(e) {
			let t = Pr.from(e);
			t && (t.keysPressed.clear(), t.keysReleased.clear(), t.mouse.deltaX = 0, t.mouse.deltaY = 0, t.mouse.scroll = 0);
		}
	}]
};
//#endregion
//#region ../../shallot/packages/shallot/rust/transforms/pkg/shallot_transforms.js
function Gr(e) {
	B.compute_transforms(e);
}
function Kr(e) {
	B.ensure_capacity(e);
}
function qr() {
	return B.get_capacity() >>> 0;
}
function Jr() {
	return B.get_indices_ptr() >>> 0;
}
function Yr() {
	return B.get_matrices_ptr() >>> 0;
}
function Xr() {
	return B.get_no_parent() >>> 0;
}
function Zr() {
	return B.get_parents_ptr() >>> 0;
}
function Qr() {
	return B.get_pos_x_ptr() >>> 0;
}
function $r() {
	return B.get_pos_y_ptr() >>> 0;
}
function ei() {
	return B.get_pos_z_ptr() >>> 0;
}
function ti() {
	return B.get_quat_w_ptr() >>> 0;
}
function ni() {
	return B.get_quat_x_ptr() >>> 0;
}
function ri() {
	return B.get_quat_y_ptr() >>> 0;
}
function ii() {
	return B.get_quat_z_ptr() >>> 0;
}
function ai() {
	return B.get_scale_x_ptr() >>> 0;
}
function oi() {
	return B.get_scale_y_ptr() >>> 0;
}
function si() {
	return B.get_scale_z_ptr() >>> 0;
}
function ci() {
	B.init_data();
}
function li() {
	return {
		__proto__: null,
		"./shallot_transforms_bg.js": { __proto__: null }
	};
}
var B;
function ui(e, t) {
	return B = e.exports, B;
}
async function di(e, t) {
	if (typeof Response == "function" && e instanceof Response) {
		if (typeof WebAssembly.instantiateStreaming == "function") try {
			return await WebAssembly.instantiateStreaming(e, t);
		} catch (t) {
			if (e.ok && n(e.type) && e.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", t);
			else throw t;
		}
		let r = await e.arrayBuffer();
		return await WebAssembly.instantiate(r, t);
	} else {
		let n = await WebAssembly.instantiate(e, t);
		return n instanceof WebAssembly.Instance ? {
			instance: n,
			module: e
		} : n;
	}
	function n(e) {
		switch (e) {
			case "basic":
			case "cors":
			case "default": return !0;
		}
		return !1;
	}
}
async function fi(e) {
	if (B !== void 0) return B;
	e !== void 0 && (Object.getPrototypeOf(e) === Object.prototype ? {module_or_path: e} = e : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), e === void 0 && (e = new URL("data:application/wasm;base64,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", "" + import.meta.url));
	let t = li();
	(typeof e == "string" || typeof Request == "function" && e instanceof Request || typeof URL == "function" && e instanceof URL) && (e = fetch(e));
	let { instance: n, module: r } = await di(await e, t);
	return ui(n, r);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/transforms/wasm.ts
var pi = /* @__PURE__ */ n({
	NoParent: () => Di,
	compute: () => Ni,
	indices: () => Ti,
	init: () => Mi,
	matrices: () => wi,
	parents: () => Ei,
	posX: () => mi,
	posY: () => hi,
	posZ: () => gi,
	quatW: () => bi,
	quatX: () => _i,
	quatY: () => vi,
	quatZ: () => yi,
	scaleX: () => xi,
	scaleY: () => Si,
	scaleZ: () => Ci,
	sync: () => ji
}), mi, hi, gi, _i, vi, yi, bi, xi, Si, Ci, wi, Ti, Ei, Di, Oi, ki = 0;
function Ai() {
	let e = Oi.memory.buffer;
	ki = qr(), mi = new Float32Array(e, Qr(), ki), hi = new Float32Array(e, $r(), ki), gi = new Float32Array(e, ei(), ki), _i = new Float32Array(e, ni(), ki), vi = new Float32Array(e, ri(), ki), yi = new Float32Array(e, ii(), ki), bi = new Float32Array(e, ti(), ki), xi = new Float32Array(e, ai(), ki), Si = new Float32Array(e, oi(), ki), Ci = new Float32Array(e, si(), ki), wi = new Float32Array(e, Yr(), ki * 16), Ti = new Uint32Array(e, Jr(), ki), Ei = new Uint32Array(e, Zr(), ki);
}
function ji() {
	if (!Oi) return;
	let e = M();
	e !== ki && (Kr(e), Ai());
}
async function Mi() {
	mi || (Oi = await fi(), ci(), Di = Xr(), Ai());
}
function Ni(e) {
	Gr(e);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/transforms/index.ts
function Pi(e) {
	function t(t) {
		return Pe(V.quatX[t], V.quatY[t], V.quatZ[t], V.quatW[t])[e];
	}
	function n(t, n) {
		let r = Pe(V.quatX[t], V.quatY[t], V.quatZ[t], V.quatW[t]);
		r[e] = n;
		let i = Ne(r.x, r.y, r.z);
		V.quatX[t] = i.x, V.quatY[t] = i.y, V.quatZ[t] = i.z, V.quatW[t] = i.w;
	}
	return new Proxy([], {
		get(e, r) {
			if (r === "get") return t;
			if (r === "set") return n;
			let i = Number(r);
			if (!Number.isNaN(i)) return t(i);
		},
		set(e, t, r) {
			let i = Number(t);
			return Number.isNaN(i) ? !1 : (n(i, r), !0);
		}
	});
}
var V = {
	get posX() {
		return ji(), mi;
	},
	get posY() {
		return ji(), hi;
	},
	get posZ() {
		return ji(), gi;
	},
	get quatX() {
		return ji(), _i;
	},
	get quatY() {
		return ji(), vi;
	},
	get quatZ() {
		return ji(), yi;
	},
	get quatW() {
		return ji(), bi;
	},
	get scaleX() {
		return ji(), xi;
	},
	get scaleY() {
		return ji(), Si;
	},
	get scaleZ() {
		return ji(), Ci;
	},
	rotX: Pi("x"),
	rotY: Pi("y"),
	rotZ: Pi("z")
}, Fi = { get data() {
	return ji(), wi;
} };
function Ii(e) {
	return {
		get(t) {
			return Pe(t.quatX ?? 0, t.quatY ?? 0, t.quatZ ?? 0, t.quatW ?? 1)[e];
		},
		set(t, n) {
			let r = Pe(n.quatX ?? 0, n.quatY ?? 0, n.quatZ ?? 0, n.quatW ?? 1);
			r[e] = t;
			let i = Ne(r.x, r.y, r.z);
			return {
				quatX: i.x,
				quatY: i.y,
				quatZ: i.z,
				quatW: i.w
			};
		}
	};
}
P(V, {
	defaults: () => ({
		posX: 0,
		posY: 0,
		posZ: 0,
		quatX: 0,
		quatY: 0,
		quatZ: 0,
		quatW: 1,
		scaleX: 1,
		scaleY: 1,
		scaleZ: 1
	}),
	annotations: { derived: {
		rotX: Ii("x"),
		rotY: Ii("y"),
		rotZ: Ii("z")
	} }
});
var Li = {
	name: "Transforms",
	systems: [{
		group: "simulation",
		annotations: { mode: "always" },
		last: !0,
		update(e) {
			ji();
			for (let t of e.query([V, h(Fi)])) e.addComponent(t, Fi);
			for (let t of e.query([h(V), Fi])) e.removeComponent(t, Fi);
			let t = 0;
			for (let n of e.query([V, h(fe.relation(se))])) Ti[t] = n, Ei[t] = Di, t++;
			for (let n of e.query([
				V,
				fe.relation(se),
				g(fe.relation)
			])) Ti[t] = n, Ei[t] = e.getRelationTargets(n, fe)[0], t++;
			Ni(t);
		}
	}],
	components: { Transform: V },
	async initialize(e, t) {
		await Mi(), t?.(1);
	}
}, Ri = {
	color: [],
	intensity: []
};
P(Ri, {
	defaults: () => ({
		color: 16777215,
		intensity: .5
	}),
	format: { color: S }
});
var zi = {
	color: [],
	intensity: [],
	radius: [],
	shadows: []
};
P(zi, {
	requires: [V],
	defaults: () => ({
		color: 16777215,
		intensity: 1,
		radius: 10,
		shadows: 0
	}),
	format: { color: S }
});
var H = {
	color: [],
	intensity: [],
	directionX: [],
	directionY: [],
	directionZ: [],
	shadows: []
};
P(H, {
	defaults: () => ({
		color: 16777215,
		intensity: 1.5,
		directionX: -.6,
		directionY: -1,
		directionZ: -.8,
		shadows: 1
	}),
	format: { color: S }
});
var Bi = new Float32Array(12);
function Vi(e, t) {
	let n = ke(e.color);
	Bi[0] = n.r, Bi[1] = n.g, Bi[2] = n.b, Bi[3] = e.intensity;
	let [r, i, a] = je(t.directionX, t.directionY, t.directionZ);
	Bi[4] = r, Bi[5] = i, Bi[6] = a, Bi[7] = 0;
	let o = ke(t.color);
	return Bi[8] = o.r * t.intensity, Bi[9] = o.g * t.intensity, Bi[10] = o.b * t.intensity, Bi[11] = 0, Bi;
}
var Hi = 512 * 4, Ui = new Float32Array(512);
function Wi(e, t) {
	let n = 0, r = 0, i = !1;
	for (let a of e.query([zi])) {
		if (n >= 64) {
			i = !0;
			break;
		}
		let e = n * 8, o = Fi.data;
		Ui[e] = o[a * 16 + 12], Ui[e + 1] = o[a * 16 + 13], Ui[e + 2] = o[a * 16 + 14], Ui[e + 3] = zi.radius[a];
		let s = ke(zi.color[a]), c = zi.intensity[a];
		Ui[e + 4] = s.r * c, Ui[e + 5] = s.g * c, Ui[e + 6] = s.b * c, t && zi.shadows[a] !== 0 ? (Ui[e + 7] = r, r++) : Ui[e + 7] = -1, n++;
	}
	return i && console.warn("point light cap reached (64)"), [Ui, n];
}
var Gi = "depth24plus", Ki = "r32float", qi = "r8unorm", Ji = "r32uint", Yi = "rgba16float";
function Xi(e) {
	return e.createBuffer({
		label: "scene",
		size: 352,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
	});
}
function Zi(e) {
	return e.createBuffer({
		label: "sky",
		size: 192,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
	});
}
function Qi(e, t, n, r, i, a, o, s) {
	let c = o.get(t);
	if (c && c.width === i && c.height === a && c.usage === r) return;
	c?.destroy();
	let l = e.createTexture({
		label: t,
		size: {
			width: i,
			height: a
		},
		format: n,
		usage: r
	});
	o.set(t, l), s.set(t, l.createView());
}
function $i(e, t, n, r, i, a, o) {
	let s = r.get("color");
	if (!s || s.width !== t || s.height !== n) {
		s?.destroy(), r.get("eid")?.destroy(), r.get("z")?.destroy();
		let a = e.createTexture({
			label: "color",
			size: {
				width: t,
				height: n
			},
			format: Yi,
			usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		}), o = e.createTexture({
			label: "eid",
			size: {
				width: t,
				height: n
			},
			format: Ji,
			usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
		}), c = e.createTexture({
			label: "z",
			size: {
				width: t,
				height: n
			},
			format: Gi,
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		});
		r.set("color", a), i.set("color", a.createView()), r.set("eid", o), i.set("eid", o.createView()), r.set("z", c), i.set("z", c.createView());
	}
	let c = a ? t : 1, l = a ? n : 1;
	Qi(e, "depth", Ki, GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING, c, l, r, i);
	let u = o ? t : 1, d = o ? n : 1;
	Qi(e, "mask", qi, GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING, u, d, r, i);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/render/camera.ts
var ea = {
	Perspective: 0,
	Orthographic: 1
}, U = {
	fov: [],
	near: [],
	far: [],
	active: [],
	clearColor: [],
	mode: [],
	size: []
};
P(U, {
	requires: [V],
	defaults: () => ({
		fov: 60,
		near: .1,
		far: 1e3,
		active: 1,
		clearColor: 920844,
		mode: ea.Perspective,
		size: 5
	}),
	format: { clearColor: S },
	enums: { mode: ea }
});
var ta = { exposure: [] };
P(ta, { defaults: () => ({ exposure: 1 }) });
var na = {}, ra = {
	strength: [],
	inner: [],
	outer: []
};
P(ra, { defaults: () => ({
	strength: .5,
	inner: .4,
	outer: .8
}) });
var ia = { bands: [] };
P(ia, { defaults: () => ({ bands: 32 }) });
var aa = { strength: [] };
P(aa, { defaults: () => ({ strength: .1 }) });
var oa = {
	softness: [],
	samples: [],
	distance: []
};
P(oa, { defaults: () => ({
	softness: 0,
	samples: 1,
	distance: 100
}) });
var sa = {}, ca = {
	density: [],
	color: []
};
P(ca, {
	defaults: () => ({
		density: .005,
		color: 4225232
	}),
	format: { color: S }
});
var la = {
	zenith: [],
	horizon: [],
	band: []
};
P(la, {
	defaults: () => ({
		zenith: 4225232,
		horizon: 4233432,
		band: 0
	}),
	format: {
		zenith: S,
		horizon: S
	}
});
var ua = {
	phase: [],
	opacity: [],
	azimuth: [],
	elevation: []
};
P(ua, { defaults: () => ({
	phase: .5,
	opacity: 1,
	azimuth: 45,
	elevation: 30
}) });
var da = {
	intensity: [],
	amount: []
};
P(da, { defaults: () => ({
	intensity: .8,
	amount: .5
}) });
var fa = {
	coverage: [],
	density: [],
	height: [],
	color: []
};
P(fa, {
	defaults: () => ({
		coverage: .7,
		density: .8,
		height: .5,
		color: 16777215
	}),
	format: { color: S }
});
var pa = {
	size: [],
	color: [],
	glow: [],
	azimuth: [],
	elevation: []
};
P(pa, {
	defaults: () => ({
		size: 1,
		color: 16773336,
		glow: .3,
		azimuth: 0,
		elevation: 45
	}),
	format: { color: S }
});
var ma = {
	width: [],
	height: []
};
P(ma, { defaults: () => ({
	width: 0,
	height: 0
}) });
var ha = k("render-target", { exclusive: !0 }), ga = /* @__PURE__ */ new ArrayBuffer(352), W = new Float32Array(ga), _a = new Uint32Array(ga), va = new Float32Array(16), ya = new Float32Array(16), ba = new Float32Array(16);
function xa(e, t, n, r, i = 0, a = 1, o = 0, s = 0) {
	let c = n / r, l = U.mode[t] === ea.Orthographic ? Ie(U.size[t], c, U.near[t], U.far[t], va) : Fe(U.fov[t], c, U.near[t], U.far[t], va), u = Fi.data.subarray(t * 16, t * 16 + 16);
	A(l, Le(u, ya), e), W.set(e, 0);
	let d = He(e, ba);
	W.set(d, 16), W.set(u, 32);
	let f = ke(U.clearColor[t]);
	W[60] = f.r, W[61] = f.g, W[62] = f.b, W[63] = 1, W[64] = U.mode[t], W[65] = U.size[t], W[66] = n, W[67] = r, W[68] = U.fov[t], W[69] = U.near[t], W[70] = U.far[t], W[71] = i, _a[72] = a, _a[73] = o, _a[74] = 0, _a[75] = s;
}
var Sa = /* @__PURE__ */ new ArrayBuffer(192), G = new Float32Array(Sa);
function Ca(e, t, n, r, i, a, o, s) {
	G[0] = n?.density ?? 0, G[1] = r?.band ?? 0, G[2] = 0, G[3] = 0;
	let c = ke(n?.color ?? 8425648);
	G[4] = c.r, G[5] = c.g, G[6] = c.b, G[7] = 1;
	let l = ke(r?.zenith ?? 0);
	G[8] = l.r, G[9] = l.g, G[10] = l.b, G[11] = +!!r;
	let u = ke(r?.horizon ?? 0);
	G[12] = u.r, G[13] = u.g, G[14] = u.b, G[15] = 1, G[16] = i?.phase ?? .5, G[17] = i?.opacity ?? 1, G[18] = +!!i, G[19] = 0;
	let d = (i?.azimuth ?? 45) * Math.PI / 180, f = (i?.elevation ?? 30) * Math.PI / 180, p = Math.cos(f);
	G[20] = Math.sin(d) * p, G[21] = Math.sin(f), G[22] = Math.cos(d) * p, G[23] = 0, G[24] = a?.intensity ?? .8, G[25] = a?.amount ?? .5, G[26] = +!!a, G[27] = 0, G[28] = o?.coverage ?? 0, G[29] = o?.density ?? 0, G[30] = o?.height ?? 0, G[31] = +!!o;
	let m = ke(o?.color ?? 16777215);
	G[32] = m.r, G[33] = m.g, G[34] = m.b, G[35] = 0, G[36] = s?.size ?? .7, G[37] = +!!s, G[38] = s && s.color !== 0 ? 1 : 0, G[39] = s?.glow ?? 0;
	let h = ke(s?.color ?? 16777215);
	G[40] = h.r, G[41] = h.g, G[42] = h.b, G[43] = 0;
	let g = (s?.azimuth ?? 0) * Math.PI / 180, _ = (s?.elevation ?? 45) * Math.PI / 180, v = Math.cos(_);
	G[44] = Math.sin(g) * v, G[45] = Math.sin(_), G[46] = Math.cos(g) * v, G[47] = 0, e.queue.writeBuffer(t, 0, Sa);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/render/viewport.ts
var wa = {
	color: 0,
	intensity: 0
}, Ta = {
	color: 0,
	intensity: 0,
	directionX: 0,
	directionY: -1,
	directionZ: 0
};
function Ea(e, t, n, r, i) {
	let { width: a, height: o } = i.element ?? i, s = a, c = o;
	if (n.hasComponent(r, ma)) {
		let e = ma.width[r], t = ma.height[r];
		e > 0 && t > 0 ? (s = e, c = t) : t > 0 && o > 0 ? (c = t, s = Math.max(1, Math.round(a / o * t))) : e > 0 && a > 0 && (s = e, c = Math.max(1, Math.round(o / a * e)));
	}
	if (t.viewportCap) {
		let e = t.viewportCap(r, s, c);
		s = e.w, c = e.h;
	}
	t.width = s, t.height = c;
	let l = t.needsDepth, u = t.effects.overlay.length > 0 || l;
	$i(e, s, c, i.textures, i.textureViews, l, u);
	let d = n.only([H]), f = d < 0 || H.shadows[d] !== 0, p = n.hasComponent(r, oa) && f, m = p ? oa.softness[r] ?? 0 : 0, h = p ? Math.max(1, oa.samples[r] ?? 1) : 0, g = +!!n.hasComponent(r, sa), _ = n.only([ca]), v = _ >= 0 ? {
		density: ca.density[_],
		color: ca.color[_]
	} : void 0, y = n.only([la]), b = y >= 0 ? {
		zenith: la.zenith[y],
		horizon: la.horizon[y],
		band: la.band[y]
	} : void 0, x = n.only([ua]), S = x >= 0 ? {
		phase: ua.phase[x],
		opacity: ua.opacity[x],
		azimuth: ua.azimuth[x],
		elevation: ua.elevation[x]
	} : void 0, C = n.only([da]), w = C >= 0 ? {
		intensity: da.intensity[C],
		amount: da.amount[C]
	} : void 0, T = n.only([fa]), ee = T >= 0 ? {
		coverage: fa.coverage[T],
		density: fa.density[T],
		height: fa.height[T],
		color: fa.color[T]
	} : void 0, E = n.only([pa]), te = E >= 0 ? {
		size: pa.size[E],
		color: pa.color[E],
		glow: pa.glow[E],
		azimuth: pa.azimuth[E],
		elevation: pa.elevation[E]
	} : void 0;
	xa(t.viewProj, r, s, c, m, h, g, t.entityCount), wa.color = 0, wa.intensity = 0, Ta.color = 0, Ta.intensity = 0, Ta.directionX = 0, Ta.directionY = -1, Ta.directionZ = 0;
	let D = n.only([Ri]);
	D >= 0 && (wa.color = Ri.color[D], wa.intensity = Ri.intensity[D]), d >= 0 && (Ta.color = H.color[d], Ta.intensity = H.intensity[d], Ta.directionX = H.directionX[d], Ta.directionY = H.directionY[d], Ta.directionZ = H.directionZ[d]);
	let O = Vi(wa, Ta);
	W.set(O, 48), W[76] = n.time.elapsed;
	let ne = 0;
	for (let e of n.query([zi])) if (ne++, ne >= 64) break;
	_a[77] = ne, W[78] = p && d >= 0 ? H.shadows[d] : 0;
	let re = n.hasComponent(r, ta);
	W[80] = re ? ta.exposure[r] : 1, n.hasComponent(r, ra) ? (W[81] = ra.strength[r], W[82] = ra.inner[r], W[83] = ra.outer[r]) : (W[81] = 0, W[82] = 0, W[83] = 1), W[84] = n.hasComponent(r, ia) ? ia.bands[r] : 0, W[85] = n.hasComponent(r, aa) ? aa.strength[r] : 0, _a[86] = +!!re, _a[87] = +!!n.hasComponent(r, na), e.queue.writeBuffer(t.scene, 0, W), Ca(e, t.sky, v, b, S, w, ee, te);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/render/surface/structs.ts
var Da = "\nstruct SurfaceData {\n    worldPos: vec3<f32>,\n    objectPos: vec3<f32>,\n    worldNormal: vec3<f32>,\n    objectNormal: vec3<f32>,\n    baseColor: vec3<f32>,\n    emission: vec3<f32>,\n    uv: vec2<f32>,\n    roughness: f32,\n    reflectivity: f32,\n    opacity: f32,\n}", Oa = "\nstruct Scene {\n    viewProj: mat4x4<f32>,\n    invViewProj: mat4x4<f32>,\n    cameraWorld: mat4x4<f32>,\n    ambientColor: vec4<f32>,\n    sunDirection: vec4<f32>,\n    sunColor: vec4<f32>,\n    clearColor: vec4<f32>,\n    cameraMode: f32,\n    cameraSize: f32,\n    viewport: vec2<f32>,\n    fov: f32,\n    near: f32,\n    far: f32,\n    shadowSoftness: f32,\n    shadowSamples: u32,\n    reflectionEnabled: u32,\n    _reserved0: u32,\n    instanceCount: u32,\n    time: f32,\n    pointLightCount: u32,\n    shadowStrength: f32,\n    _pad2: f32,\n    exposure: f32,\n    vignetteStrength: f32,\n    vignetteInner: f32,\n    vignetteOuter: f32,\n    posterizeBands: f32,\n    ditherStrength: f32,\n    tonemapMode: u32,\n    fxaaEnabled: u32,\n}", ka = "\nstruct Sky {\n    hazeDensity: f32,\n    horizonBand: f32,\n    _pad3: f32,\n    _pad4: f32,\n    hazeColor: vec4<f32>,\n    skyZenith: vec4<f32>,\n    skyHorizon: vec4<f32>,\n    moonParams: vec4<f32>,\n    moonDirection: vec4<f32>,\n    starParams: vec4<f32>,\n    cloudParams: vec4<f32>,\n    cloudColor: vec4<f32>,\n    sunParams: vec4<f32>,\n    sunVisualColor: vec4<f32>,\n    sunDirection: vec4<f32>,\n}", Aa = "\nstruct Data {\n    baseColor: vec4<f32>,\n    pbr: vec4<f32>,\n    emission: vec4<f32>,\n    flags: u32,\n    sizeX: f32,\n    sizeY: f32,\n    sizeZ: f32,\n}", ja = "\nfn toOKLab(c: vec3<f32>) -> vec3<f32> {\n    let lms = vec3(\n        0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b,\n        0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b,\n        0.0883024619 * c.r + 0.2220049174 * c.g + 0.6896926207 * c.b,\n    );\n    let cbrt = pow(max(lms, vec3(0.0)), vec3(1.0 / 3.0));\n    return vec3(\n        0.2104542553 * cbrt.x + 0.7936177850 * cbrt.y - 0.0040720468 * cbrt.z,\n        1.9779984951 * cbrt.x - 2.4285922050 * cbrt.y + 0.4505937099 * cbrt.z,\n        0.0259040371 * cbrt.x + 0.7827717662 * cbrt.y - 0.8086757660 * cbrt.z,\n    );\n}\n\nfn fromOKLab(lab: vec3<f32>) -> vec3<f32> {\n    let l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;\n    let m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;\n    let s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;\n    return max(vec3(\n         4.0767416621 * l*l*l - 3.3077115913 * m*m*m + 0.2309699292 * s*s*s,\n        -1.2684380046 * l*l*l + 2.6097574011 * m*m*m - 0.3413193965 * s*s*s,\n        -0.0041960863 * l*l*l - 0.7034186147 * m*m*m + 1.7076147010 * s*s*s,\n    ), vec3(0.0));\n}\n\nfn darkTone(base: vec3<f32>) -> vec3<f32> {\n    let lab = toOKLab(base);\n    return fromOKLab(vec3(lab.x * 0.75, lab.y, lab.z - 0.02));\n}\n\nfn lightTone(base: vec3<f32>) -> vec3<f32> {\n    let lab = toOKLab(base);\n    return fromOKLab(vec3(lab.x * 1.12, lab.y, lab.z + 0.02));\n}\n", Ma = "\nfn toWorldSpace(localPos: vec3<f32>, eid: u32) -> vec3<f32> {\n    return (matrices[eid] * vec4(localPos, 1.0)).xyz;\n}\nfn toObjectSpace(wp: vec3<f32>, eid: u32) -> vec3<f32> {\n    let m = matrices[eid];\n    let p = wp - m[3].xyz;\n    return vec3(dot(p, m[0].xyz), dot(p, m[1].xyz), dot(p, m[2].xyz));\n}\n", Na = "\nstruct PointLightData {\n    position: vec3<f32>,\n    radius: f32,\n    color: vec3<f32>,\n    shadowIdx: f32,\n}", Pa = "\nstruct PointShadow {\n    viewProj: array<mat4x4<f32>, 24>,\n    lightPosRadius: array<vec4<f32>, 4>,\n}", Fa = "\nstruct Shadow {\n    cascade0ViewProj: mat4x4<f32>,\n    cascade1ViewProj: mat4x4<f32>,\n    cascade2ViewProj: mat4x4<f32>,\n    cascade3ViewProj: mat4x4<f32>,\n    cascadeSplits: vec4<f32>,\n    cascadeTexelSizes: vec4<f32>,\n}", Ia = "\nstruct PulledVertex {\n    position: vec3<f32>,\n    normal: vec3<f32>,\n    uv: vec2<f32>,\n}\n\nfn pullVertex(vertexIndex: u32, eid: u32) -> PulledVertex {\n    let shapeId = shapes[eid];\n    let sm = meshMeta[shapeId];\n    let vtxOffset = sm.x + vertexIndex * 8u;\n    var v: PulledVertex;\n    v.position = vec3(meshVertexData[vtxOffset], meshVertexData[vtxOffset+1u], meshVertexData[vtxOffset+2u]);\n    v.normal = vec3(meshVertexData[vtxOffset+3u], meshVertexData[vtxOffset+4u], meshVertexData[vtxOffset+5u]);\n    v.uv = vec2(meshVertexData[vtxOffset+6u], meshVertexData[vtxOffset+7u]);\n    return v;\n}\n", La = `
struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instance: u32,
}

struct VertexOutput {
    @builtin(position) @invariant position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) worldNormal: vec3<f32>,
    @location(2) @interpolate(flat) entityId: u32,
    @location(3) worldPos: vec3<f32>,
    @location(4) objectPos: vec3<f32>,
    @location(5) objectNormal: vec3<f32>,
    @location(6) uv: vec2<f32>,
}

${Da}
${ja}
${Ma}

struct FragmentOutput {
    @location(0) color: vec4<f32>,
    @location(1) entityId: u32,
}

${Oa}

${Aa}

@group(0) @binding(0) var<uniform> scene: Scene;
@group(0) @binding(1) var<storage, read> entityIds: array<u32>;
@group(0) @binding(2) var<storage, read> matrices: array<mat4x4<f32>>;
@group(0) @binding(3) var<storage, read> sizes: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> data: array<Data>;
@group(0) @binding(8) var<storage, read> shapes: array<u32>;
@group(0) @binding(9) var<storage, read> meshVertexData: array<f32>;
@group(0) @binding(10) var<storage, read> meshMeta: array<vec4<u32>>;

${Ia}
`;
//#endregion
//#region ../../shallot/packages/shallot/src/standard/render/surface/shaders.ts
function Ra(e) {
	return e ? `var pos = localPos;
    var uv = meshUv;
    ${e}
    return VertexTransformResult(pos, uv);` : "return VertexTransformResult(localPos, meshUv);";
}
function za(e) {
	return e.replace("var pos = localPos;", "var pos = localPos;\n    let inst = instanceData[eid];");
}
var Ba = "\nfn hashStar(p: vec2<f32>) -> f32 {\n    var p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);\n    p3 += dot(p3, p3.yzx + 33.33);\n    return fract((p3.x + p3.y) * p3.z);\n}\n\nfn hash2Star(p: vec2<f32>) -> vec2<f32> {\n    var p3 = fract(vec3(p.x, p.y, p.x) * vec3(0.1031, 0.1030, 0.0973));\n    p3 += dot(p3, p3.yzx + 33.33);\n    return fract((p3.xx + p3.yz) * p3.zy);\n}\n\nfn sampleStars(dir: vec3<f32>) -> vec3<f32> {\n    if (sky.starParams.z <= 0.0 || dir.y < 0.0) {\n        return vec3(0.0);\n    }\n\n    let theta = atan2(dir.z, dir.x);\n    let phi = asin(clamp(dir.y, -1.0, 1.0));\n\n    let gridSize = mix(20.0, 100.0, sky.starParams.y);\n    let cell = vec2(theta * gridSize / 3.14159, phi * gridSize / 1.5708);\n    let cellId = floor(cell);\n    let cellFract = fract(cell);\n\n    var starColor = vec3(0.0);\n\n    for (var dy = -1; dy <= 1; dy++) {\n        for (var dx = -1; dx <= 1; dx++) {\n            let neighbor = cellId + vec2(f32(dx), f32(dy));\n            let starHash = hashStar(neighbor);\n\n            if (starHash > sky.starParams.y * 0.7) {\n                continue;\n            }\n\n            let starPos = hash2Star(neighbor);\n            let starCenter = neighbor + starPos;\n            let dist = length(cell - starCenter);\n\n            let brightness = hashStar(neighbor + vec2(100.0, 100.0));\n            let radius = 0.02 + brightness * 0.03;\n\n            if (dist < radius) {\n                let twinkle = 0.8 + 0.2 * sin(brightness * 100.0);\n                let intensity = sky.starParams.x * brightness * twinkle;\n                let falloff = 1.0 - smoothstep(0.0, radius, dist);\n\n                let temp = hashStar(neighbor + vec2(200.0, 200.0));\n                let tint = mix(vec3(1.0, 0.9, 0.8), vec3(0.8, 0.9, 1.0), temp);\n\n                starColor = max(starColor, tint * intensity * falloff);\n            }\n        }\n    }\n\n    return starColor;\n}\n", Va = "\nfn hash2(p: vec2<f32>) -> f32 {\n    var p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);\n    p3 += dot(p3, p3.yzx + 33.33);\n    return fract((p3.x + p3.y) * p3.z);\n}\n\nfn value2d(p: vec2f, seed: vec2f) -> f32 {\n    let i = floor(p);\n    let f = fract(p);\n    let u = f * f * (3.0 - 2.0 * f);\n    return mix(\n        mix(fract(sin(dot(i, seed)) * 43758.5) * 2.0 - 1.0,\n            fract(sin(dot(i + vec2(1.0, 0.0), seed)) * 43758.5) * 2.0 - 1.0, u.x),\n        mix(fract(sin(dot(i + vec2(0.0, 1.0), seed)) * 43758.5) * 2.0 - 1.0,\n            fract(sin(dot(i + vec2(1.0, 1.0), seed)) * 43758.5) * 2.0 - 1.0, u.x), u.y);\n}\n\nfn simplex2(p: vec2<f32>) -> f32 {\n    let K1 = 0.366025404;\n    let K2 = 0.211324865;\n\n    let i = floor(p + (p.x + p.y) * K1);\n    let a = p - i + (i.x + i.y) * K2;\n\n    let o = select(vec2(0.0, 1.0), vec2(1.0, 0.0), a.x > a.y);\n    let b = a - o + K2;\n    let c = a - 1.0 + 2.0 * K2;\n\n    let h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), vec3(0.0));\n    let h4 = h * h * h * h;\n\n    let n = vec3(\n        dot(a, vec2(hash2(i) * 2.0 - 1.0, hash2(i + vec2(0.0, 1.0)) * 2.0 - 1.0)),\n        dot(b, vec2(hash2(i + o) * 2.0 - 1.0, hash2(i + o + vec2(0.0, 1.0)) * 2.0 - 1.0)),\n        dot(c, vec2(hash2(i + 1.0) * 2.0 - 1.0, hash2(i + vec2(1.0, 2.0)) * 2.0 - 1.0))\n    );\n\n    return dot(h4, n) * 70.0;\n}\n\nconst FBM2_OCTAVES = 5;\n\nfn fbm2(p: vec2<f32>) -> f32 {\n    var value = 0.0;\n    var amplitude = 0.5;\n    var frequency = 1.0;\n    var pos = p;\n\n    for (var i = 0; i < FBM2_OCTAVES; i++) {\n        value += amplitude * simplex2(pos * frequency);\n        amplitude *= 0.5;\n        frequency *= 2.0;\n    }\n\n    return value;\n}\n", Ha = "\nfn sampleMoon(dir: vec3<f32>) -> vec3<f32> {\n    if (sky.moonParams.z <= 0.0) {\n        return vec3(0.0);\n    }\n\n    let moonDir = sky.moonDirection.xyz;\n    let moonDot = dot(dir, moonDir);\n\n    let moonSize = 0.9995;\n    let moonColor = vec3(0.9, 0.9, 0.85);\n    let edgeWidth = 0.0003;\n    let opacity = sky.moonParams.y;\n\n    if (moonDot <= moonSize - edgeWidth) {\n        return vec3(0.0);\n    }\n\n    let toCenter = dir - moonDir * moonDot;\n    let diskRight = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0)));\n    let diskUp = cross(diskRight, moonDir);\n\n    let diskRadius = sqrt(1.0 - moonSize * moonSize);\n    let u = dot(toCenter, diskRight) / diskRadius;\n    let v = dot(toCenter, diskUp) / diskRadius;\n\n    let r2 = u * u + v * v;\n    let z = sqrt(max(0.0, 1.0 - r2));\n\n    let diskEdge = smoothstep(1.0 + edgeWidth / diskRadius, 1.0 - edgeWidth / diskRadius, sqrt(r2));\n\n    let limb = pow(z, 0.6);\n\n    let cellU = u * 8.0;\n    let cellV = v * 8.0;\n    let craterNoise = hashStar(floor(vec2(cellU, cellV)) + vec2(50.0, 50.0));\n    let surfaceVariation = 0.85 + 0.15 * craterNoise;\n\n    let phase = sky.moonParams.x;\n    let sunAngle = phase * 6.28318;\n    let sunLocalX = sin(sunAngle);\n    let sunLocalZ = -cos(sunAngle);\n\n    let illumination = u * sunLocalX + z * sunLocalZ;\n    let lit = smoothstep(-0.05, 0.05, illumination);\n\n    let earthshine = vec3(0.06, 0.07, 0.1);\n    let dayColor = moonColor * surfaceVariation * limb;\n    let surfaceColor = mix(earthshine * limb, dayColor, lit);\n\n    return surfaceColor * diskEdge * opacity;\n}\n", Ua = "\nfn sampleClouds(dir: vec3<f32>) -> vec4<f32> {\n    if (sky.cloudParams.w <= 0.0 || dir.y < 0.01) {\n        return vec4(0.0);\n    }\n\n    let t = sky.cloudParams.z / max(dir.y, 0.001);\n    let uv = dir.xz * t;\n\n    var n = fbm2(uv);\n\n    let coverage = sky.cloudParams.x;\n    let density = sky.cloudParams.y;\n    n = smoothstep(1.0 - coverage, 1.0, n * 0.5 + 0.5) * density;\n\n    n *= smoothstep(0.0, 0.15, dir.y);\n\n    return vec4(sky.cloudColor.rgb, n);\n}\n", Wa = "\nconst DEG_TO_RAD: f32 = 0.017453292;\n\nfn computeSkyDir(screenX: f32, screenY: f32) -> vec3<f32> {\n    let width = scene.viewport.x;\n    let height = scene.viewport.y;\n\n    let ndcX = screenX * 2.0 - 1.0;\n    let ndcY = 1.0 - screenY * 2.0;\n\n    let aspect = width / height;\n\n    let cameraWorld = scene.cameraWorld;\n    let r00 = cameraWorld[0][0]; let r10 = cameraWorld[0][1]; let r20 = cameraWorld[0][2];\n    let r01 = cameraWorld[1][0]; let r11 = cameraWorld[1][1]; let r21 = cameraWorld[1][2];\n    let r02 = cameraWorld[2][0]; let r12 = cameraWorld[2][1]; let r22 = cameraWorld[2][2];\n\n    let skyFov = select(scene.fov, 60.0, scene.cameraMode > 0.5);\n    let tanHalfFov = tan((skyFov * DEG_TO_RAD) / 2.0);\n    let camDirX = ndcX * aspect * tanHalfFov;\n    let camDirY = ndcY * tanHalfFov;\n    let camDirZ = -1.0;\n    var dirX = r00 * camDirX + r01 * camDirY + r02 * camDirZ;\n    var dirY = r10 * camDirX + r11 * camDirY + r12 * camDirZ;\n    var dirZ = r20 * camDirX + r21 * camDirY + r22 * camDirZ;\n    let len = sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);\n    dirX /= len; dirY /= len; dirZ /= len;\n    return vec3(dirX, dirY, dirZ);\n}\n", Ga = `
${Ba}
${Ha}
${Ua}

fn sampleSky(dir: vec3<f32>) -> vec3<f32> {
    if (sky.skyZenith.a <= 0.0) {
        return scene.clearColor.rgb;
    }

    let t = pow(clamp(dir.y, 0.0, 1.0), 0.25);
    var color = mix(sky.skyHorizon.rgb, sky.skyZenith.rgb, t);

    if (sky.horizonBand > 0.0) {
        let horizonBlend = pow(1.0 - abs(dir.y), 32.0) * sky.horizonBand;
        let bandColor = sky.skyHorizon.rgb * 1.5;
        color = mix(color, bandColor, horizonBlend);
    }

    color += sampleStars(dir);

    let clouds = sampleClouds(dir);
    color = mix(color, clouds.rgb, clouds.a);

    let moonContrib = sampleMoon(dir);
    color += moonContrib * (1.0 - clouds.a * 0.7);

    if (sky.sunParams.y > 0.0) {
        let sunDir = sky.sunDirection.xyz;
        let sunDot = dot(dir, sunDir);

        let sunVisualColor = select(scene.sunColor.rgb, sky.sunVisualColor.rgb, sky.sunParams.z > 0.5);

        let glowStrength = sky.sunParams.w;
        if (glowStrength > 0.0) {
            let g = 0.76;
            let gg = g * g;
            let mie = (1.0 - gg) / pow(1.0 + gg - 2.0 * g * sunDot, 1.5);
            color += sunVisualColor * mie * glowStrength * 0.025;

            let angle = max(0.0, sunDot);
            let corona = pow(angle, 512.0) * 0.4 + pow(angle, 128.0) * 0.06;
            let warmTint = vec3f(1.0, 0.9, 0.7);
            color += warmTint * sunVisualColor * corona * glowStrength;
        }

        let baseSunSize = 0.9995;
        let sunSizeParam = sky.sunParams.x;
        let sunThreshold = 1.0 - (1.0 - baseSunSize) * sunSizeParam;
        let sunEdgeWidth = (1.0 - sunThreshold) * 0.15;

        let diskBlend = smoothstep(sunThreshold - sunEdgeWidth, sunThreshold + sunEdgeWidth, sunDot);
        if (diskBlend > 0.0) {
            let radial = saturate((sunDot - sunThreshold) / (1.0 - sunThreshold));
            let r = 1.0 - radial;
            let mu = sqrt(1.0 - r * r);
            let limbDarken = 1.0 - 0.6 * (1.0 - mu);
            color += sunVisualColor * limbDarken * diskBlend;

            let edgeDist = 1.0 - smoothstep(0.0, 1.0, radial);
            let fringe = vec3f(
                smoothstep(0.3, 0.7, edgeDist),
                smoothstep(0.5, 0.9, edgeDist),
                smoothstep(0.7, 1.0, edgeDist)
            );
            color += fringe * sunVisualColor * 0.15 * diskBlend * (1.0 - radial);
        }
    }

    if (sky.hazeDensity > 0.0) {
        let horizonFactor = 1.0 - clamp(dir.y, 0.0, 1.0);
        let hazeAmount = pow(horizonFactor, 2.0) * saturate(sky.hazeDensity * 5.0);
        color = mix(color, sky.hazeColor.rgb, hazeAmount);
    }

    return color;
}
`, Ka = "\nfn applyHaze(color: vec3<f32>, dist: f32) -> vec3<f32> {\n    if (sky.hazeDensity <= 0.0) {\n        return color;\n    }\n    let haze = 1.0 - exp(-sky.hazeDensity * dist);\n    return mix(color, sky.hazeColor.rgb, haze);\n}\n", qa = "\nconst CASCADE_BLEND_RANGE: f32 = 0.1;\nconst PCF_SAMPLE_COUNT: i32 = 5;\nconst VOGEL_GOLDEN_ANGLE: f32 = 2.399963;\n\nfn selectCascade(viewZ: f32) -> u32 {\n    if (viewZ < shadow.cascadeSplits.x) { return 0u; }\n    if (viewZ < shadow.cascadeSplits.y) { return 1u; }\n    if (viewZ < shadow.cascadeSplits.z) { return 2u; }\n    return 3u;\n}\n\nfn getCascadeViewProj(cascade: u32) -> mat4x4<f32> {\n    switch cascade {\n        case 0u: { return shadow.cascade0ViewProj; }\n        case 1u: { return shadow.cascade1ViewProj; }\n        case 2u: { return shadow.cascade2ViewProj; }\n        default: { return shadow.cascade3ViewProj; }\n    }\n}\n\nfn getCascadeSplit(cascade: u32) -> f32 {\n    switch cascade {\n        case 0u: { return shadow.cascadeSplits.x; }\n        case 1u: { return shadow.cascadeSplits.y; }\n        case 2u: { return shadow.cascadeSplits.z; }\n        default: { return shadow.cascadeSplits.w; }\n    }\n}\n\nfn sampleShadowAtCascade(worldPos: vec3<f32>, cascade: u32, fragCoord: vec2<f32>) -> f32 {\n    let lightPos = getCascadeViewProj(cascade) * vec4(worldPos, 1.0);\n    let ndc = lightPos.xyz / lightPos.w;\n\n    let inBounds = abs(ndc.x) <= 1.0 && abs(ndc.y) <= 1.0 && ndc.z >= 0.0 && ndc.z <= 1.0;\n    if (!inBounds) { return 1.0; }\n\n    var uv = ndc.xy * 0.5 + 0.5;\n    uv.y = 1.0 - uv.y;\n\n    let offset = vec2(f32(cascade % 2u) * 0.5, f32(cascade / 2u) * 0.5);\n    uv = uv * 0.5 + offset;\n\n    let atlasSize = vec2<f32>(textureDimensions(shadowMap));\n    let pcfRadius = scene.shadowSoftness / atlasSize.x;\n\n    let ign = fract(52.9829189 * fract(0.06711056 * fragCoord.x + 0.00583715 * fragCoord.y));\n    let angle = ign * 6.28318;\n\n    var total = 0.0;\n    for (var i = 0; i < PCF_SAMPLE_COUNT; i++) {\n        let r = sqrt((f32(i) + 0.5) / f32(PCF_SAMPLE_COUNT)) * pcfRadius;\n        let a = f32(i) * VOGEL_GOLDEN_ANGLE + angle;\n        let tapOffset = vec2(cos(a), sin(a)) * r;\n        total += textureSampleCompareLevel(shadowMap, shadowSampler, uv + tapOffset, ndc.z);\n    }\n    return total / f32(PCF_SAMPLE_COUNT);\n}\n\nfn computeCascadeBlend(viewZ: f32, cascade: u32) -> f32 {\n    if (cascade >= 3u) { return 0.0; }\n\n    let splitEnd = getCascadeSplit(cascade);\n    let blendStart = splitEnd * (1.0 - CASCADE_BLEND_RANGE);\n\n    if (viewZ < blendStart) { return 0.0; }\n    return saturate((viewZ - blendStart) / (splitEnd - blendStart));\n}\n\nfn distanceFade(viewZ: f32, maxDist: f32) -> f32 {\n    let fadeStart = maxDist * 0.9;\n    let fade = saturate((maxDist - viewZ) / (maxDist - fadeStart));\n    return select(fade, 1.0, viewZ <= fadeStart);\n}\n\nfn sampleShadow(worldPos: vec3<f32>, viewZ: f32, fragCoord: vec2<f32>) -> f32 {\n    let cascade = selectCascade(viewZ);\n    let shadowCurrent = sampleShadowAtCascade(worldPos, cascade, fragCoord);\n\n    let nextCascade = min(cascade + 1u, 3u);\n    let shadowNext = sampleShadowAtCascade(worldPos, nextCascade, fragCoord);\n\n    let blendFactor = computeCascadeBlend(viewZ, cascade) * f32(cascade < 3u);\n    let cascadeShadow = mix(shadowCurrent, shadowNext, blendFactor);\n\n    let fade = distanceFade(viewZ, shadow.cascadeSplits.w);\n    return mix(1.0, cascadeShadow, fade);\n}\n", Ja = "\nfn blinnPhongSpecular(N: vec3<f32>, L: vec3<f32>, V: vec3<f32>, roughness: f32) -> f32 {\n    let H = normalize(L + V);\n    let NdotH = max(dot(N, H), 0.0);\n    let shininess = pow(2.0, (1.0 - roughness) * 10.0);\n    let intensity = (1.0 - roughness) * (1.0 - roughness);\n    return pow(NdotH, shininess) * intensity;\n}\n", Ya = "\nfn selectCubeFace(dir: vec3<f32>) -> u32 {\n    let absDir = abs(dir);\n    if (absDir.x >= absDir.y && absDir.x >= absDir.z) {\n        return select(1u, 0u, dir.x > 0.0);\n    }\n    if (absDir.y >= absDir.x && absDir.y >= absDir.z) {\n        return select(3u, 2u, dir.y > 0.0);\n    }\n    return select(5u, 4u, dir.z > 0.0);\n}\n\nfn samplePointShadow(worldPos: vec3<f32>, normal: vec3<f32>, shadowIdx: u32, lightPos: vec3<f32>, lightRadius: f32) -> f32 {\n    let toFrag = worldPos - lightPos;\n    let dist = length(toFrag);\n    if (dist < 1e-4) { return 1.0; }\n    let dir = toFrag / dist;\n\n    let texelSize = dist * 2.0 / 512.0;\n    let NdotL = abs(dot(normal, -dir));\n    let offsetScale = texelSize * (1.0 + 2.0 * saturate(1.0 - NdotL));\n    let offsetPos = worldPos + normal * offsetScale;\n\n    let face = selectCubeFace(dir);\n    let vpIdx = shadowIdx * 6u + face;\n    let lightClip = pointShadow.viewProj[vpIdx] * vec4(offsetPos, 1.0);\n    let ndc = lightClip.xyz / lightClip.w;\n\n    var uv = ndc.xy * 0.5 + 0.5;\n    uv.y = 1.0 - uv.y;\n\n    let border = 1.0 / 512.0;\n    uv = clamp(uv, vec2(border), vec2(1.0 - border));\n\n    let atlasU = (f32(face) + uv.x) / 6.0;\n    let atlasV = (f32(shadowIdx) + uv.y) / 4.0;\n\n    return textureSampleCompareLevel(pointShadowMap, shadowSampler, vec2(atlasU, atlasV), ndc.z);\n}\n", Xa = "\nfn evaluatePointLight(\n    surface: SurfaceData,\n    lightColor: vec3<f32>,\n    L: vec3<f32>,\n    V: vec3<f32>,\n    NdotL: f32,\n    attenuation: f32,\n    shadow: f32,\n) -> vec3<f32> {\n    let diffuse = surface.baseColor * lightColor * NdotL * attenuation * shadow;\n    let spec = blinnPhongSpecular(surface.worldNormal, L, V, surface.roughness);\n    let specular = lightColor * spec * NdotL * attenuation * shadow * surface.reflectivity;\n    return diffuse + specular;\n}\n";
`${Va}${Ga}${Ka}${Ja}${Xa}`;
var Za = "\nlet V = normalize(scene.cameraWorld[3].xyz - surface.worldPos);\nlet L = -scene.sunDirection.xyz;\nlet NdotL = max(dot(surface.worldNormal, L), 0.0);\nlet ambient = scene.ambientColor.rgb * scene.ambientColor.a;\nlet sunDiffuse = scene.sunColor.rgb * NdotL * shadowFactor;\nlet diffuseColor = surface.baseColor * (ambient + sunDiffuse) + surface.emission;\nlet specTerm = blinnPhongSpecular(surface.worldNormal, L, V, surface.roughness);\nlet specular = scene.sunColor.rgb * specTerm * NdotL * shadowFactor * surface.reflectivity;\nlet litColor = diffuseColor + specular;\n", Qa = "\nfn sampleReflection(dir: vec3<f32>) -> vec4<f32> {\n    return vec4<f32>(sampleSky(dir), 0.0);\n}\n\nfn reflectionColor(surface: SurfaceData, V: vec3<f32>) -> vec3<f32> {\n    if (scene.reflectionEnabled == 0u || surface.reflectivity <= 0.001) {\n        return vec3<f32>(0.0);\n    }\n    let R = reflect(-V, surface.worldNormal);\n    let env = sampleReflection(R).rgb;\n    let smoothness = 1.0 - surface.roughness;\n    return env * surface.reflectivity * smoothness * smoothness;\n}\n\nfn applyReflection(surface: SurfaceData, V: vec3<f32>, litColor: vec3<f32>) -> vec3<f32> {\n    return litColor + reflectionColor(surface, V);\n}\n", $a = "if (surface.opacity <= 0.0) { discard; }";
function eo(e, t) {
	let n = Ra(t.vertex);
	return `
fn userVertexTransform_${e}(localPos: vec3<f32>, normal: vec3<f32>, meshUv: vec2<f32>, eid: u32) -> VertexTransformResult {
    ${t.properties && t.properties.length > 0 && _o() && t.vertex?.includes("inst.") ? za(n) : n}
}`;
}
function to(e, t, n) {
	let r = (t.properties && t.properties.length > 0 && _o() ? "let inst = instanceData[eid];\n    " : "") + (t.fragment ?? ""), i = "";
	return n?.lighting && (i = `
fn applyLighting_${e}(surface: SurfaceData, ${n.lighting.params}) -> vec3<f32> {
    ${n.lighting.body(e)}
}
`), `
// === surface ${e}: "${oo.getName(e) ?? `#${e}`}" ===
fn userFragment_${e}(surface: ptr<function, SurfaceData>, position: vec4<f32>, eid: u32) {
    ${r}
}
${i}`;
}
function no(e) {
	return `
struct VertexTransformResult {
    position: vec3<f32>,
    uv: vec2<f32>,
}

fn dispatchVertexTransform(surfaceId: u32, localPos: vec3<f32>, normal: vec3<f32>, uv: vec2<f32>, eid: u32) -> VertexTransformResult {
    switch surfaceId {
${Array.from({ length: e }, (e, t) => `        case ${t}u: { return userVertexTransform_${t}(localPos, normal, uv, eid); }`).join("\n")}
        default: { return userVertexTransform_0(localPos, normal, uv, eid); }
    }
}`;
}
function ro(e, t) {
	let n = Array.from({ length: e }, (e, t) => `        case ${t}u: { userFragment_${t}(surface, position, eid); }`).join("\n"), r = "";
	if (t?.lighting) {
		let n = Array.from({ length: e }, (e, n) => `        case ${n}u: { return applyLighting_${n}(surface, ${ao(t.lighting.params)}); }`).join("\n");
		r = `
fn dispatchLighting(surfaceId: u32, surface: SurfaceData, ${t.lighting.params}) -> vec3<f32> {
    switch surfaceId {
${n}
        default: { return applyLighting_0(surface, ${ao(t.lighting.params)}); }
    }
}
`;
	}
	return `
${no(e)}

fn dispatchFragment(surfaceId: u32, surface: ptr<function, SurfaceData>, position: vec4<f32>, eid: u32) {
    switch surfaceId {
${n}
        default: { userFragment_0(surface, position, eid); }
    }
}
${r}`;
}
function io(e, t) {
	return `${e.map((e, t) => eo(t, e)).join("\n")}\n${e.map((e, n) => to(n, e, t)).join("\n")}\n${ro(e.length, t)}`;
}
function ao(e) {
	return e.split(",").map((e) => e.trim().split(":")[0].trim()).join(", ");
}
var oo = We(32);
function so() {
	oo.add({}, "default"), oo.add({ fragment: "(*surface).baseColor = (*surface).worldNormal * 0.5 + 0.5;" }, "normals"), oo.add({ fragment: "\n    let depth = position.z;\n    let remapped = pow(1.0 - depth, 0.1);\n    (*surface).baseColor = vec3(remapped);" }, "depth"), oo.add({}, "albedo");
}
so();
var co = {
	Default: 0,
	Normals: 1,
	Depth: 2,
	Albedo: 3
};
function lo() {
	oo.clear(), vo(), so();
}
N(Uint32Array, 1, 0);
var uo = /* @__PURE__ */ new Map(), fo = [], po = 0;
function mo() {
	return fo;
}
function ho() {
	return po;
}
function go() {
	return uo.size;
}
function _o() {
	return uo.size > 0;
}
function vo() {
	uo.clear(), fo = [], po = 0;
}
function yo() {
	if (fo.length === 0) return "";
	let e = fo.map((e) => `    ${e.name}: ${e.type},`), t = (po - fo.length * 4) / 4;
	for (let n = 0; n < t; n++) e.push(`    _pad${n}: u32,`);
	return `struct InstanceData {\n${e.join("\n")}\n}`;
}
function bo(e) {
	return fo.length === 0 ? "" : `@group(0) @binding(${e}) var<storage, read> instanceData: array<InstanceData>;`;
}
function xo() {
	return fo.length === 0 ? "" : `
${yo()}

@group(0) @binding(0) var<storage, read> source: array<u32>;
@group(0) @binding(1) var<storage, read_write> instanceData: array<InstanceData>;
@group(0) @binding(2) var<storage, read> entityCount: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let eid = gid.x;
    let count = entityCount[0];
    if (eid >= count) { return; }

    var d: InstanceData;
${fo.map((e, t) => {
		let n = `source[${t}u * count + eid]`;
		return `    d.${e.name} = ${e.type === "u32" ? n : `bitcast<${e.type}>(${n})`};`;
	}).join("\n")}
    instanceData[eid] = d;
}
`;
}
var So = 256 * 32, Co = 4294967295, wo = We(256);
function To() {
	wo.count() === 0 && (wo.add(ns(), "box"), wo.add(rs(), "sphere"), wo.add(is(), "capsule"), wo.add(as(), "plane"));
}
var Eo = {
	Box: 0,
	Sphere: 1,
	Capsule: 2,
	Plane: 3
};
function Do(e, t) {
	return To(), wo.add(e, t);
}
function Oo(e) {
	return To(), wo.getByName(e);
}
function ko(e) {
	return To(), wo.getName(e);
}
function Ao(e) {
	return To(), wo.get(e);
}
function jo() {
	return wo.version;
}
function Mo() {
	return To(), wo.count();
}
function No() {
	wo.clear(), Yo.clear();
}
var Po = N(Uint8Array, 1, 0), Fo = N(Float32Array, 4, 0), Io = N(Float32Array, 4, 0), Lo = N(Float32Array, 4, 0), Ro = N(Float32Array, 4, 0), zo = N(Uint8Array, 1, 0);
N(Uint32Array, 1, Co);
var Bo = {
	Solid: 0,
	HalfSpace: 1
};
function Vo(e) {
	let t = e.chunks;
	function n(e) {
		let n = t[e >>> 12], r = (e & qe) * 4, i = Math.round(Oe(n[r]) * 255), a = Math.round(Oe(n[r + 1]) * 255), o = Math.round(Oe(n[r + 2]) * 255);
		return i << 16 | a << 8 | o;
	}
	function r(e, n) {
		let r = t[e >>> 12], i = (e & qe) * 4;
		r[i] = De((n >> 16 & 255) / 255), r[i + 1] = De((n >> 8 & 255) / 255), r[i + 2] = De((n & 255) / 255);
	}
	return new Proxy([], {
		get(e, t) {
			if (t === "get") return n;
			if (t === "set") return r;
			let i = Number(t);
			if (!Number.isNaN(i)) return n(i);
		},
		set(e, t, n) {
			let i = Number(t);
			return Number.isNaN(i) ? !1 : (r(i, n), !0);
		}
	});
}
var Ho = {
	box: j.Box,
	sphere: j.Sphere,
	capsule: j.Capsule,
	plane: j.Plane,
	mesh: j.Mesh
};
function Uo(e) {
	return Ho[e];
}
function Wo(e) {
	for (let [t, n] of Object.entries(Ho)) if (n === e) return t;
}
var Go = N(Uint16Array, 1, 0), K = {
	shape: F(Po, 1, 0),
	surface: F(Go, 1, 0),
	volume: F(zo, 1, 0),
	color: Vo(Fo),
	colorR: F(Fo, 4, 0),
	colorG: F(Fo, 4, 1),
	colorB: F(Fo, 4, 2),
	opacity: F(Fo, 4, 3),
	sizeX: F(Io, 4, 0),
	sizeY: F(Io, 4, 1),
	sizeZ: F(Io, 4, 2),
	shadows: F(Io, 4, 3),
	roughness: F(Lo, 4, 0),
	reflectivity: F(Lo, 4, 1),
	emission: Vo(Ro),
	emissionIntensity: F(Ro, 4, 3)
};
P(K, {
	requires: [V],
	defaults: () => ({
		shape: j.Box,
		surface: co.Default,
		color: 16777215,
		opacity: 1,
		sizeX: 1,
		sizeY: 1,
		sizeZ: 1,
		shadows: 1,
		roughness: 1,
		reflectivity: 0,
		emission: 0,
		emissionIntensity: 0,
		volume: Bo.Solid
	}),
	parse: {
		shape: Uo,
		surface: (e) => oo.getByName(e)
	},
	format: {
		shape: Wo,
		surface: (e) => oo.getName(e),
		color: S,
		emission: S
	},
	enums: {
		surface: co,
		volume: Bo,
		shape: j
	}
});
var Ko = N(Uint32Array, 1, 0), qo = { geometry: F(Ko, 1, 0) };
P(qo, {
	requires: [K],
	defaults: () => ({ geometry: Eo.Box }),
	parse: { geometry: Oo },
	format: { geometry: ko }
});
var Jo = {};
P(Jo, { requires: [K] });
var Yo = /* @__PURE__ */ new Map(), Xo = /* @__PURE__ */ new Set();
function Zo(e) {
	return Xo.has(e);
}
function Qo(e) {
	if (Yo.has(e)) return;
	let t = Ao(es(e));
	if (!t) return;
	let n = Do({
		vertices: new Float32Array(t.vertices),
		indices: new Uint16Array(t.indices),
		vertexCount: t.vertexCount,
		indexCount: t.indexCount
	});
	Xo.add(n), Yo.set(e, {
		meshId: n,
		priorShape: K.shape[e],
		priorGeometry: qo.geometry[e],
		baseFloatOffset: -1,
		atlasFloatOffset: -1,
		atlasIndexOffset: -1,
		vertexCount: t.vertexCount
	}), qo.geometry[e] = n, K.shape[e] = j.Mesh;
}
function $o(e) {
	let t = Yo.get(e);
	t && (Xo.delete(t.meshId), K.shape[e] = t.priorShape, qo.geometry[e] = t.priorGeometry), Yo.delete(e);
}
function es(e) {
	switch (K.shape[e]) {
		case j.Box: return Eo.Box;
		case j.Sphere: return Eo.Sphere;
		case j.Capsule: return Eo.Capsule;
		case j.Plane: return Eo.Plane;
		case j.Mesh: return qo.geometry[e];
		default: return Eo.Box;
	}
}
function ts(e) {
	let { vertices: t, vertexCount: n } = e;
	if (n === 0) return {
		minX: 0,
		minY: 0,
		minZ: 0,
		maxX: 0,
		maxY: 0,
		maxZ: 0
	};
	let r = t[0], i = t[1], a = t[2], o = t[0], s = t[1], c = t[2];
	for (let e = 1; e < n; e++) {
		let n = t[e * 8], l = t[e * 8 + 1], u = t[e * 8 + 2];
		n < r && (r = n), l < i && (i = l), u < a && (a = u), n > o && (o = n), l > s && (s = l), u > c && (c = u);
	}
	return {
		minX: r,
		minY: i,
		minZ: a,
		maxX: o,
		maxY: s,
		maxZ: c
	};
}
function ns() {
	return {
		vertices: new Float32Array([
			-.5,
			-.5,
			.5,
			0,
			0,
			1,
			0,
			0,
			.5,
			-.5,
			.5,
			0,
			0,
			1,
			1,
			0,
			.5,
			.5,
			.5,
			0,
			0,
			1,
			1,
			1,
			-.5,
			.5,
			.5,
			0,
			0,
			1,
			0,
			1,
			.5,
			-.5,
			-.5,
			0,
			0,
			-1,
			0,
			0,
			-.5,
			-.5,
			-.5,
			0,
			0,
			-1,
			1,
			0,
			-.5,
			.5,
			-.5,
			0,
			0,
			-1,
			1,
			1,
			.5,
			.5,
			-.5,
			0,
			0,
			-1,
			0,
			1,
			-.5,
			.5,
			.5,
			0,
			1,
			0,
			0,
			0,
			.5,
			.5,
			.5,
			0,
			1,
			0,
			1,
			0,
			.5,
			.5,
			-.5,
			0,
			1,
			0,
			1,
			1,
			-.5,
			.5,
			-.5,
			0,
			1,
			0,
			0,
			1,
			-.5,
			-.5,
			-.5,
			0,
			-1,
			0,
			0,
			0,
			.5,
			-.5,
			-.5,
			0,
			-1,
			0,
			1,
			0,
			.5,
			-.5,
			.5,
			0,
			-1,
			0,
			1,
			1,
			-.5,
			-.5,
			.5,
			0,
			-1,
			0,
			0,
			1,
			.5,
			-.5,
			.5,
			1,
			0,
			0,
			0,
			0,
			.5,
			-.5,
			-.5,
			1,
			0,
			0,
			1,
			0,
			.5,
			.5,
			-.5,
			1,
			0,
			0,
			1,
			1,
			.5,
			.5,
			.5,
			1,
			0,
			0,
			0,
			1,
			-.5,
			-.5,
			-.5,
			-1,
			0,
			0,
			0,
			0,
			-.5,
			-.5,
			.5,
			-1,
			0,
			0,
			1,
			0,
			-.5,
			.5,
			.5,
			-1,
			0,
			0,
			1,
			1,
			-.5,
			.5,
			-.5,
			-1,
			0,
			0,
			0,
			1
		]),
		indices: new Uint16Array([
			0,
			1,
			2,
			0,
			2,
			3,
			4,
			5,
			6,
			4,
			6,
			7,
			8,
			9,
			10,
			8,
			10,
			11,
			12,
			13,
			14,
			12,
			14,
			15,
			16,
			17,
			18,
			16,
			18,
			19,
			20,
			21,
			22,
			20,
			22,
			23
		]),
		vertexCount: 24,
		indexCount: 36
	};
}
function rs(e = 32, t = 16) {
	let n = [], r = [], i = .5;
	for (let r = 0; r <= t; r++) {
		let a = r / t, o = a * Math.PI;
		for (let t = 0; t <= e; t++) {
			let r = t / e, s = r * Math.PI * 2, c = Math.sin(o) * Math.cos(s), l = Math.cos(o), u = Math.sin(o) * Math.sin(s);
			n.push(c * i, l * i, u * i, c, l, u, r, a);
		}
	}
	for (let n = 0; n < t; n++) for (let t = 0; t < e; t++) {
		let i = n * (e + 1) + t, a = i + e + 1;
		r.push(i, i + 1, a), r.push(i + 1, a + 1, a);
	}
	return {
		vertices: new Float32Array(n),
		indices: new Uint16Array(r),
		vertexCount: (t + 1) * (e + 1),
		indexCount: t * e * 6
	};
}
function is(e = 32, t = 16) {
	let n = [], r = [], i = .5, a = .5, o = t / 2;
	for (let t = 0; t <= o; t++) {
		let r = t / o * (Math.PI / 2), s = t / o * .25;
		for (let t = 0; t <= e; t++) {
			let o = t / e, c = o * Math.PI * 2, l = Math.sin(r) * Math.cos(c), u = Math.cos(r), d = Math.sin(r) * Math.sin(c);
			n.push(l * i, u * i + a, d * i, l, u, d, o, s);
		}
	}
	for (let t = 0; t <= e; t++) {
		let r = t / e, o = r * Math.PI * 2, s = Math.cos(o), c = Math.sin(o);
		n.push(s * i, a, c * i, s, 0, c, r, .25);
	}
	for (let t = 0; t <= e; t++) {
		let r = t / e, o = r * Math.PI * 2, s = Math.cos(o), c = Math.sin(o);
		n.push(s * i, -a, c * i, s, 0, c, r, .75);
	}
	for (let t = 0; t <= o; t++) {
		let r = t / o * (Math.PI / 2), s = .75 + t / o * .25;
		for (let t = 0; t <= e; t++) {
			let o = t / e, c = o * Math.PI * 2, l = Math.sin(r) * Math.cos(c), u = -Math.cos(r), d = Math.sin(r) * Math.sin(c);
			n.push(l * i, u * i - a, d * i, l, u, d, o, s);
		}
	}
	let s = e + 1;
	for (let t = 0; t < o; t++) for (let n = 0; n < e; n++) {
		let e = t * s + n, i = e + s;
		r.push(e, e + 1, i), r.push(e + 1, i + 1, i);
	}
	let c = (o + 1) * s, l = c + s;
	for (let t = 0; t < e; t++) {
		let e = c + t, n = l + t;
		r.push(e, e + 1, n), r.push(e + 1, n + 1, n);
	}
	let u = l + s;
	for (let t = 0; t < o; t++) for (let n = 0; n < e; n++) {
		let e = u + t * s + n, i = e + s;
		r.push(e, i, e + 1), r.push(e + 1, i, i + 1);
	}
	return {
		vertices: new Float32Array(n),
		indices: new Uint16Array(r),
		vertexCount: n.length / 8,
		indexCount: r.length
	};
}
function as() {
	return {
		vertices: new Float32Array([
			-.5,
			0,
			.5,
			0,
			1,
			0,
			0,
			0,
			.5,
			0,
			.5,
			0,
			1,
			0,
			1,
			0,
			.5,
			0,
			-.5,
			0,
			1,
			0,
			1,
			1,
			-.5,
			0,
			-.5,
			0,
			1,
			0,
			0,
			1
		]),
		indices: new Uint16Array([
			0,
			1,
			2,
			0,
			2,
			3
		]),
		vertexCount: 4,
		indexCount: 6
	};
}
function os() {
	let e = [], t = [], n = [], r = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
	for (let e of Yo.values()) a.set(e.meshId, e);
	let o = 0, s = 0, c = 0, l = 0, u = Mo();
	for (let d = 0; d < u; d++) {
		let u = Ao(d);
		if (!u) {
			r.push({
				vertexOffset: 0,
				indexOffset: 0,
				triCount: 0
			});
			continue;
		}
		let f = u.indexCount / 3;
		r.push({
			vertexOffset: o,
			indexOffset: s,
			triCount: f
		});
		let p = a.get(d);
		if (p) {
			i.set(d, o * 4), p.atlasFloatOffset = o, p.atlasIndexOffset = s, p.baseFloatOffset = l;
			for (let e = 0; e < u.vertices.length; e++) n.push(u.vertices[e]);
			l += u.vertices.length;
		}
		for (let t = 0; t < u.vertices.length; t++) e.push(u.vertices[t]);
		for (let e = 0; e < u.indices.length; e++) t.push(u.indices[e]);
		o += u.vertices.length, s += u.indices.length, c += f;
	}
	let d = new Float32Array(e), f = new Uint32Array(t), p = new Float32Array(n), m = new Uint32Array(256 * 4);
	for (let e = 0; e < r.length; e++) m[e * 4] = r[e].vertexOffset, m[e * 4 + 1] = r[e].indexOffset, m[e * 4 + 2] = r[e].triCount, m[e * 4 + 3] = 0;
	return {
		verticesData: d,
		indicesData: f,
		metaData: m,
		baseVerticesData: p,
		shapeCount: r.filter((e) => e.triCount > 0).length,
		maxTriangles: c,
		dynOffsets: i
	};
}
function ss(e) {
	return Math.max(e * 2, 256) * 4;
}
function cs(e) {
	let { verticesData: t, indicesData: n, metaData: r, baseVerticesData: i, shapeCount: a, maxTriangles: o, dynOffsets: s } = os(), c = ss(t.length), l = ss(n.length), u = ss(Math.max(i.length, 1)), d = e.createBuffer({
		label: "unified-vertices",
		size: c,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});
	e.queue.writeBuffer(d, 0, t);
	let f = e.createBuffer({
		label: "unified-indices",
		size: l,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
	});
	e.queue.writeBuffer(f, 0, n);
	let p = e.createBuffer({
		label: "unified-meta",
		size: 256 * 16,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});
	e.queue.writeBuffer(p, 0, r);
	let m = e.createBuffer({
		label: "dynamic-base-vertices",
		size: u,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});
	return i.length > 0 && e.queue.writeBuffer(m, 0, i), {
		vertices: d,
		indices: f,
		meta: p,
		baseVertices: m,
		shapeCount: a,
		maxTriangles: o,
		vertexCapacity: c,
		indexCapacity: l,
		baseVertexCapacity: u,
		dynOffsets: s
	};
}
function ls(e, t) {
	let { verticesData: n, indicesData: r, metaData: i, baseVerticesData: a, dynOffsets: o } = os(), s = n.byteLength > t.vertexCapacity, c = r.byteLength > t.indexCapacity, l = a.byteLength > t.baseVertexCapacity;
	s && (t.vertices.destroy(), t.vertexCapacity = ss(n.length), t.vertices = e.createBuffer({
		label: "unified-vertices",
		size: t.vertexCapacity,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	})), c && (t.indices.destroy(), t.indexCapacity = ss(r.length), t.indices = e.createBuffer({
		label: "unified-indices",
		size: t.indexCapacity,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
	})), l && (t.baseVertices.destroy(), t.baseVertexCapacity = ss(Math.max(a.length, 1)), t.baseVertices = e.createBuffer({
		label: "dynamic-base-vertices",
		size: t.baseVertexCapacity,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	})), t.dynOffsets = o, e.queue.writeBuffer(t.vertices, 0, n), e.queue.writeBuffer(t.indices, 0, r), e.queue.writeBuffer(t.meta, 0, i), a.length > 0 && e.queue.writeBuffer(t.baseVertices, 0, a);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/render/present.ts
function us() {
	return `
${Oa}

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var maskTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> scene: Scene;

fn aces(x: vec3<f32>) -> vec3<f32> {
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    return saturate((x * (a * x + b)) / (x * (c * x + d) + e));
}

fn linearToSrgb(c: vec3<f32>) -> vec3<f32> {
    let lo = c * 12.92;
    let hi = 1.055 * pow(max(c, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.4)) - 0.055;
    return select(hi, lo, c <= vec3<f32>(0.0031308));
}

fn linearToOKLab(c: vec3<f32>) -> vec3<f32> {
    let l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    let m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    let s = 0.0883024619 * c.r + 0.2220049174 * c.g + 0.6896926207 * c.b;
    let l_ = pow(max(l, 0.0), 1.0 / 3.0);
    let m_ = pow(max(m, 0.0), 1.0 / 3.0);
    let s_ = pow(max(s, 0.0), 1.0 / 3.0);
    return vec3<f32>(
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    );
}

fn OKLabToLinear(lab: vec3<f32>) -> vec3<f32> {
    let l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    let m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    let s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;
    return vec3<f32>(
         4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    );
}

fn applyPosterize(color: vec3<f32>) -> vec3<f32> {
    if (scene.posterizeBands <= 0.0) { return color; }
    var lab = linearToOKLab(color);
    let L = clamp(lab.x, 0.0, 1.0);
    lab.x = floor(L * scene.posterizeBands + 0.5) / scene.posterizeBands;
    lab.z += (lab.x - 0.5) * 0.05;
    return max(OKLabToLinear(lab), vec3<f32>(0.0));
}

fn bayer4(pos: vec2<f32>) -> f32 {
    let x = u32(pos.x) % 4u;
    let y = u32(pos.y) % 4u;
    let m = array<f32, 16>(
        0.0, 8.0, 2.0, 10.0,
        12.0, 4.0, 14.0, 6.0,
        3.0, 11.0, 1.0, 9.0,
        15.0, 7.0, 13.0, 5.0,
    );
    return m[x + y * 4u] / 16.0 - 0.5;
}

fn applyDither(color: vec3<f32>, pos: vec2<f32>) -> vec3<f32> {
    if (scene.ditherStrength <= 0.0) { return color; }
    let d = bayer4(pos) * scene.ditherStrength;
    return color + vec3<f32>(d);
}

fn applyVignette(color: vec3<f32>, uv: vec2<f32>) -> vec3<f32> {
    if (scene.vignetteStrength <= 0.0) { return color; }
    let d = distance(uv, vec2<f32>(0.5, 0.5));
    let v = 1.0 - smoothstep(scene.vignetteInner, scene.vignetteOuter, d) * scene.vignetteStrength;
    return color * v;
}

fn applyTonemap(color: vec3<f32>) -> vec3<f32> {
    if (scene.tonemapMode == 0u) { return color; }
    return aces(color * scene.exposure);
}

fn luma(c: vec3<f32>) -> f32 {
    return dot(c, vec3<f32>(0.299, 0.587, 0.114));
}

fn loadInput(coord: vec2<i32>, dims: vec2<i32>) -> vec3<f32> {
    return textureLoad(inputTexture, clamp(coord, vec2<i32>(0), dims - 1), 0).rgb;
}

const FXAA_REDUCE_MIN: f32 = 1.0 / 128.0;
const FXAA_REDUCE_MUL: f32 = 1.0 / 8.0;
const FXAA_SPAN_MAX: f32 = 8.0;

fn applyFXAA(coord: vec2<i32>, colorM: vec3<f32>, dims: vec2<i32>) -> vec3<f32> {
    let colorNW = loadInput(coord + vec2<i32>(-1, -1), dims);
    let colorNE = loadInput(coord + vec2<i32>(1, -1), dims);
    let colorSW = loadInput(coord + vec2<i32>(-1, 1), dims);
    let colorSE = loadInput(coord + vec2<i32>(1, 1), dims);

    let lumaM = luma(colorM);
    let lumaNW = luma(colorNW);
    let lumaNE = luma(colorNE);
    let lumaSW = luma(colorSW);
    let lumaSE = luma(colorSE);

    let lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    let lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    var dir: vec2<f32>;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    let dirReduce = max(
        (lumaNW + lumaNE + lumaSW + lumaSE) * 0.25 * FXAA_REDUCE_MUL,
        FXAA_REDUCE_MIN,
    );
    let rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
    let dirPixels = clamp(
        dir * rcpDirMin,
        vec2<f32>(-FXAA_SPAN_MAX),
        vec2<f32>(FXAA_SPAN_MAX),
    );

    let fc = vec2<f32>(f32(coord.x), f32(coord.y));
    let colorA = 0.5 * (
        loadInput(vec2<i32>(round(fc + dirPixels * (1.0 / 3.0 - 0.5))), dims) +
        loadInput(vec2<i32>(round(fc + dirPixels * (2.0 / 3.0 - 0.5))), dims)
    );

    let colorB = colorA * 0.5 + 0.25 * (
        loadInput(vec2<i32>(round(fc + dirPixels * -0.5)), dims) +
        loadInput(vec2<i32>(round(fc + dirPixels * 0.5)), dims)
    );

    let lumaB = luma(colorB);
    if (lumaB < lumaMin || lumaB > lumaMax) { return colorA; }
    return colorB;
}

struct VOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs(@builtin(vertex_index) vid: u32) -> VOut {
    let xy = vec2<f32>(f32((vid << 1u) & 2u), f32(vid & 2u));
    var out: VOut;
    out.pos = vec4<f32>(xy * 2.0 - 1.0, 0.0, 1.0);
    out.uv = vec2<f32>(xy.x, 1.0 - xy.y);
    return out;
}

@fragment
fn fs(in: VOut) -> @location(0) vec4<f32> {
    let inDims = vec2<i32>(textureDimensions(inputTexture));
    let inCoord = clamp(
        vec2<i32>(in.uv * vec2<f32>(inDims)),
        vec2<i32>(0),
        inDims - 1,
    );

    var color = textureLoad(inputTexture, inCoord, 0).rgb;
    let inPos = vec2<f32>(f32(inCoord.x), f32(inCoord.y));

    if (scene.fxaaEnabled != 0u) {
        let mask = textureLoad(maskTexture, inCoord, 0).r;
        let fxaaColor = applyFXAA(inCoord, color, inDims);
        color = select(fxaaColor, color, mask >= 0.5);
    }

    color = applyTonemap(color);
    color = linearToSrgb(saturate(color));
    color = applyDither(color, inPos);
    color = applyPosterize(color);
    color = applyVignette(color, in.uv);

    return vec4<f32>(saturate(color), 1.0);
}
`;
}
function ds(e) {
	let t = null, n = {
		bindGroup: null,
		cachedInputView: null,
		cachedMaskView: null
	};
	return {
		name: "present",
		inputs: ["color", "mask"],
		outputs: ["framebuffer"],
		async prepare(e) {
			let n = navigator.gpu.getPreferredCanvasFormat(), r = us(), i = e.createShaderModule({ code: r });
			t = await e.createRenderPipelineAsync({
				label: "present",
				layout: "auto",
				vertex: {
					module: i,
					entryPoint: "vs"
				},
				fragment: {
					module: i,
					entryPoint: "fs",
					targets: [{ format: n }]
				},
				primitive: { topology: "triangle-list" }
			});
		},
		execute(r) {
			if (!t) return;
			let { device: i, encoder: a, canvasView: o } = r, s = r.getTextureView("color"), c = r.getTextureView("mask");
			if (!s || !c) return;
			(s !== n.cachedInputView || c !== n.cachedMaskView) && (n.bindGroup = i.createBindGroup({
				layout: t.getBindGroupLayout(0),
				entries: [
					{
						binding: 0,
						resource: s
					},
					{
						binding: 1,
						resource: c
					},
					{
						binding: 2,
						resource: { buffer: e }
					}
				]
			}), n.cachedInputView = s, n.cachedMaskView = c);
			let l = r.timestampWrites?.("present"), u = a.beginRenderPass({
				label: "present",
				colorAttachments: [{
					view: o,
					loadOp: "clear",
					storeOp: "store",
					clearValue: {
						r: 0,
						g: 0,
						b: 0,
						a: 1
					}
				}],
				timestampWrites: l
			});
			u.setPipeline(t), u.setBindGroup(0, n.bindGroup), u.draw(3), u.end();
		}
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/render/overlay.ts
var fs = "\n@group(0) @binding(0) var depthTex: texture_2d<f32>;\n\nstruct FsOut {\n    @location(0) color: vec4f,\n    @location(1) mask: f32,\n    @location(2) eid: u32,\n    @builtin(frag_depth) depth: f32,\n}\n\n@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {\n    var p = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));\n    return vec4f(p[i], 0, 1);\n}\n\n@fragment fn fs(@builtin(position) pos: vec4f) -> FsOut {\n    var out: FsOut;\n    out.depth = textureLoad(depthTex, vec2i(pos.xy), 0).r;\n    return out;\n}\n\n@fragment fn fsDepthOnly(@builtin(position) pos: vec4f) -> @builtin(frag_depth) f32 {\n    return textureLoad(depthTex, vec2i(pos.xy), 0).r;\n}\n", ps = {
	view: null,
	loadOp: "load",
	storeOp: "store"
}, ms = {
	view: null,
	clearValue: {
		r: 0,
		g: 0,
		b: 0,
		a: 0
	},
	loadOp: "clear",
	storeOp: "store"
}, hs = {
	view: null,
	loadOp: "load",
	storeOp: "store"
}, gs = {
	view: null,
	depthClearValue: 1,
	depthLoadOp: "clear",
	depthStoreOp: "store"
}, _s = {
	colorAttachments: [
		ps,
		ms,
		hs
	],
	depthStencilAttachment: gs
}, vs = {
	view: null,
	depthClearValue: 1,
	depthLoadOp: "clear",
	depthStoreOp: "store"
}, ys = {
	colorAttachments: [],
	depthStencilAttachment: vs
};
function bs(e) {
	let t = null, n = null, r = null, i = null, a = null, o = null, s = null;
	return {
		name: "overlay",
		inputs: [
			"z",
			"eid",
			"depth"
		],
		outputs: ["color", "mask"],
		async prepare(e) {
			let t = e.createShaderModule({ code: fs });
			n = await e.createRenderPipelineAsync({
				label: "depth-inject",
				layout: "auto",
				vertex: {
					module: t,
					entryPoint: "vs"
				},
				fragment: {
					module: t,
					entryPoint: "fs",
					targets: [
						{
							format: Yi,
							writeMask: 0
						},
						{
							format: qi,
							writeMask: 0
						},
						{
							format: Ji,
							writeMask: 0
						}
					]
				},
				depthStencil: {
					format: "depth24plus",
					depthWriteEnabled: !0,
					depthCompare: "always"
				},
				primitive: { topology: "triangle-list" }
			}), a = await e.createRenderPipelineAsync({
				label: "depth-only",
				layout: "auto",
				vertex: {
					module: t,
					entryPoint: "vs"
				},
				fragment: {
					module: t,
					entryPoint: "fsDepthOnly",
					targets: []
				},
				depthStencil: {
					format: "depth24plus",
					depthWriteEnabled: !0,
					depthCompare: "always"
				},
				primitive: { topology: "triangle-list" }
			});
		},
		execute(c) {
			let { device: l, encoder: u } = c, d = c.getTextureView("color") ?? c.canvasView, f = c.getTextureView("z"), p = c.getTextureView("mask"), m = c.getTextureView("eid"), h = e.hasDepthWriter?.(c.subGraph) ?? !1, g = e.overlays;
			if (g.length === 0 && h && a) {
				let e = c.getTextureView("depth");
				if (e) {
					e !== s && (o = l.createBindGroup({
						layout: a.getBindGroupLayout(0),
						entries: [{
							binding: 0,
							resource: e
						}]
					}), s = e), vs.view = f, ys.timestampWrites = c.timestampWrites?.("raster-overlay");
					let t = u.beginRenderPass(ys);
					t.setPipeline(a), t.setBindGroup(0, o), t.draw(3), t.end();
				}
			} else if (g.length > 0) {
				(!t || t.length !== g.length) && (t = g.slice().sort((e, t) => e.order - t.order)), ps.view = d, ms.view = p, hs.view = m, gs.view = f, gs.depthLoadOp = h ? "clear" : "load", _s.timestampWrites = c.timestampWrites?.("raster-overlay");
				let e = u.beginRenderPass(_s);
				if (h && n) {
					let t = c.getTextureView("depth");
					t && (t !== i && (r = l.createBindGroup({
						layout: n.getBindGroupLayout(0),
						entries: [{
							binding: 0,
							resource: t
						}]
					}), i = t), e.setPipeline(n), e.setBindGroup(0, r), e.draw(3));
				}
				let a = {
					device: l,
					format: Yi,
					maskFormat: qi,
					eidFormat: Ji
				};
				for (let n of t) n.draw(e, a);
				e.end();
			}
		}
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/render/data.ts
var xs = 64, Ss = `
${Aa}

@group(0) @binding(0) var<storage, read> colors: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> pbr: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> emission: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> surfaces: array<u32>;
@group(0) @binding(4) var<storage, read> entityCount: array<u32>;
@group(0) @binding(5) var<storage, read_write> data: array<Data>;
@group(0) @binding(6) var<storage, read> sizes: array<vec4<f32>>;

@compute @workgroup_size(${xs})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let eid = gid.x;
    let count = entityCount[0];
    if (eid >= count) { return; }

    let s = sizes[eid];
    var d: Data;
    d.baseColor = colors[eid];
    d.pbr = pbr[eid];
    d.emission = emission[eid];
    d.flags = surfaces[eid];
    d.sizeX = s.x;
    d.sizeY = s.y;
    d.sizeZ = s.z;
    data[eid] = d;
}
`;
function Cs(e) {
	let t = null, n = null, r = M();
	function i(n) {
		return n.createBindGroup({
			layout: t.getBindGroupLayout(0),
			entries: [
				R(0, e.colors),
				R(1, e.pbr),
				R(2, e.emission),
				R(3, e.surfaces),
				R(4, e.entityCountBuffer),
				{
					binding: 5,
					resource: { buffer: e.data.buffer }
				},
				R(6, e.sizes)
			]
		});
	}
	return {
		name: "data",
		scope: "frame",
		inputs: [],
		outputs: ["data"],
		async prepare(e) {
			let r = e.createShaderModule({ code: Ss });
			t = await e.createComputePipelineAsync({
				label: "upload-data",
				layout: "auto",
				compute: {
					module: r,
					entryPoint: "main"
				}
			}), n = i(e);
		},
		execute(a) {
			if (!t) return;
			M() !== r && (r = M(), n = null), n ||= i(a.device);
			let o = Math.ceil(e.entityCount / xs), s = L(a.encoder, a.timestampWrites?.("data-upload"));
			s.setPipeline(t), s.setBindGroup(0, n), s.dispatchWorkgroups(o), s.end();
		}
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/render/instance.ts
var ws = 64;
function Ts(e) {
	let t = null, n = null, r = null, i = M();
	function a(r) {
		return r.createBindGroup({
			layout: n.getBindGroupLayout(0),
			entries: [
				{
					binding: 0,
					resource: { buffer: t.buffer }
				},
				{
					binding: 1,
					resource: { buffer: e.instanceDataBuffer.buffer }
				},
				R(2, e.entityCountBuffer)
			]
		});
	}
	return {
		name: "instance-data",
		scope: "frame",
		inputs: [],
		outputs: ["instance-data"],
		async prepare(i) {
			if (!_o()) return;
			let o = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
			t || (t = z(i, "instance-data-source", o, (e) => e * go() * 4), e.instanceDataBuffer = z(i, "instance-data", o, (e) => e * ho()));
			let s = xo();
			if (!s) return;
			let c = i.createShaderModule({ code: s });
			n = await i.createComputePipelineAsync({
				label: "instance",
				layout: "auto",
				compute: {
					module: c,
					entryPoint: "main"
				}
			}), r = a(i);
		},
		execute(o) {
			if (!n || !t || !e.instanceDataBuffer) return;
			M() !== i && (i = M(), r = null), r ||= a(o.device);
			let s = e.entityCount, c = mo();
			for (let e = 0; e < c.length; e++) nt(o.device.queue, t.buffer, e * s * 4, c[e].data, s);
			let l = Math.ceil(s / ws), u = L(o.encoder, o.timestampWrites?.("instance-upload"));
			u.setPipeline(n), u.setBindGroup(0, r), u.dispatchWorkgroups(l), u.end();
		}
	};
}
var Es = So * 2 + 1, Ds = So * 2 + 2;
function Os() {
	return M() >>> 5;
}
function ks() {
	return 0;
}
function As() {
	return M() >>> 2;
}
function js() {
	return As() + M();
}
function Ms() {
	return js() + (M() >>> 1);
}
function Ns() {
	return Ms() + (M() >>> 2);
}
function Ps() {
	return Ns() + Os();
}
function Fs() {
	return Ps() + 1;
}
var Is = new Uint32Array(1);
function Ls(e) {
	let t = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, n = e.createBuffer({
		label: "resolve-params",
		size: 4,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
	return e.queue.writeBuffer(n, 0, new Uint32Array([M()])), {
		entityIds: z(e, "batch-entity-ids", t, (e) => e * 4),
		indirect: e.createBuffer({
			label: "batch-indirect",
			size: So * 2 * 5 * 4,
			usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
		}),
		slotCounts: e.createBuffer({
			label: "batch-slot-counts",
			size: So * 2 * 4,
			usage: t
		}),
		entityBatchInfo: z(e, "batch-entity-info", t, (e) => e * 4),
		scatterCounters: e.createBuffer({
			label: "batch-scatter-counters",
			size: Ds * 4,
			usage: t
		}),
		transparentEntities: z(e, "batch-transparent-entities", t, (e) => e * 4),
		cullEntities: z(e, "batch-cull-entities", t, (e) => e * 2 * 4),
		activeSlotsGPU: e.createBuffer({
			label: "batch-active-slots",
			size: So * 4,
			usage: t
		}),
		prefixParams: e.createBuffer({
			label: "batch-prefix-params",
			size: 8,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		}),
		resolveInputBuffer: z(e, "resolve-input", t, () => Fs() * 4),
		resolveParamsBuffer: n,
		cullEntityCount: 0,
		shapeAABBs: new Float32Array(256 * 6),
		activeSlots: new Uint32Array(So),
		activeSlotCount: 0,
		partMask: new Uint32Array(Os())
	};
}
var Rs = -1;
function zs(e) {
	let t = jo();
	if (t !== Rs) {
		Rs = t, e.shapeAABBs.fill(0);
		for (let t = 0; t < 256; t++) {
			let n = Ao(t);
			if (!n) continue;
			let r = t * 6;
			if (Zo(t)) {
				e.shapeAABBs[r] = -1e6, e.shapeAABBs[r + 1] = -1e6, e.shapeAABBs[r + 2] = -1e6, e.shapeAABBs[r + 3] = 1e6, e.shapeAABBs[r + 4] = 1e6, e.shapeAABBs[r + 5] = 1e6;
				continue;
			}
			let i = ts(n);
			e.shapeAABBs[r] = i.minX, e.shapeAABBs[r + 1] = i.minY, e.shapeAABBs[r + 2] = i.minZ, e.shapeAABBs[r + 3] = i.maxX, e.shapeAABBs[r + 4] = i.maxY, e.shapeAABBs[r + 5] = i.maxZ;
		}
	}
}
function Bs(e, t, n, r, i) {
	for (let a = 0; a < i; a++) {
		let i = r[a];
		e.drawIndexedIndirect(t, (n + i) * 5 * 4);
	}
}
var Vs = -1, Hs = -1;
function Us(e) {
	let t = jo(), n = oo.count();
	if (t === Vs && n === Hs) return;
	Vs = t, Hs = n;
	let r = Mo(), i = 0;
	for (let t = 0; t < r; t++) for (let r = 0; r < n; r++) e.activeSlots[i++] = t * 32 + r;
	e.activeSlotCount = i;
}
function Ws(e, t, n, r, i, a, o) {
	let s = t.resolveInputBuffer.buffer;
	nt(e.queue, s, ks() * 4, n, o), nt(e.queue, s, As() * 4, r, o), nt(e.queue, s, js() * 4, i, o), nt(e.queue, s, Ms() * 4, a, o), e.queue.writeBuffer(s, Ns() * 4, t.partMask), Is[0] = o, e.queue.writeBuffer(s, Ps() * 4, Is);
}
var Gs = `
@group(0) @binding(0) var<storage, read> resolveInput: array<u32>;
@group(0) @binding(1) var<storage, read_write> outShapes: array<u32>;
@group(0) @binding(2) var<storage, read_write> outSurfaces: array<u32>;
@group(0) @binding(3) var<storage, read> sizes: array<vec4<f32>>;

struct ResolveParams { capacity: u32 }
@group(0) @binding(4) var<uniform> resolveParams: ResolveParams;

const INVALID_SHAPE: u32 = 0xFFFFFFFFu;

const SHAPE_BOX: u32 = ${j.Box}u;
const SHAPE_SPHERE: u32 = ${j.Sphere}u;
const SHAPE_CAPSULE: u32 = ${j.Capsule}u;
const SHAPE_PLANE: u32 = ${j.Plane}u;
const SHAPE_MESH: u32 = ${j.Mesh}u;

fn unpackU8(offset: u32, index: u32) -> u32 {
    let word = resolveInput[offset + (index >> 2u)];
    return (word >> ((index & 3u) * 8u)) & 0xFFu;
}

fn unpackU16(offset: u32, index: u32) -> u32 {
    let word = resolveInput[offset + (index >> 1u)];
    return (word >> ((index & 1u) * 16u)) & 0xFFFFu;
}

fn shapeToPrimitive(shape: u32) -> u32 {
    if (shape == SHAPE_MESH) { return 7u; }
    return shape & 7u;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let cap = resolveParams.capacity;
    let SHAPES_OFFSET = 0u;
    let MESH_GEOM_OFFSET = cap >> 2u;
    let SURFACES_OFFSET = MESH_GEOM_OFFSET + cap;
    let VOLUMES_OFFSET = SURFACES_OFFSET + (cap >> 1u);
    let MASK_OFFSET = VOLUMES_OFFSET + (cap >> 2u);
    let COUNT_OFFSET = MASK_OFFSET + (cap >> 5u);

    let eid = gid.x;
    if (eid >= resolveInput[COUNT_OFFSET]) { return; }

    let maskWord = resolveInput[MASK_OFFSET + (eid >> 5u)];
    if ((maskWord & (1u << (eid & 31u))) == 0u) {
        outShapes[eid] = INVALID_SHAPE;
        return;
    }

    let shape = unpackU8(SHAPES_OFFSET, eid);
    var shapeId: u32;
    switch (shape) {
        case SHAPE_BOX: { shapeId = 0u; }
        case SHAPE_SPHERE: { shapeId = 1u; }
        case SHAPE_CAPSULE: { shapeId = 2u; }
        case SHAPE_PLANE: { shapeId = 3u; }
        case SHAPE_MESH: { shapeId = resolveInput[MESH_GEOM_OFFSET + eid]; }
        default: { shapeId = 0u; }
    }
    outShapes[eid] = shapeId;

    let surf = unpackU16(SURFACES_OFFSET, eid);
    let vol = unpackU8(VOLUMES_OFFSET, eid);
    let hasShadows = select(0u, 1u, sizes[eid].w != 0.0);
    let prim = shapeToPrimitive(shape);

    outSurfaces[eid] = (surf & 0xFFu)
        | ((vol & 0xFu) << 8u)
        | (hasShadows << 12u)
        | (prim << 13u)
        | ((shapeId & 0xFFFFu) << 16u);
}
`, Ks = `
@group(0) @binding(0) var<storage, read> shapes: array<u32>;
@group(0) @binding(1) var<storage, read> surfaces: array<u32>;
@group(0) @binding(2) var<storage, read> colors: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> slotCounts: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> entityBatchInfo: array<u32>;
@group(0) @binding(5) var<storage, read> entityCount: array<u32>;

const INVALID_SHAPE: u32 = 0xFFFFFFFFu;
const MAX_SURFACES: u32 = 32u;
const MAX_BATCH_SLOTS: u32 = ${So}u;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let eid = gid.x;
    if (eid >= entityCount[0]) { return; }

    let shapeId = shapes[eid];
    if (shapeId == INVALID_SHAPE) {
        entityBatchInfo[eid] = INVALID_SHAPE;
        return;
    }

    let surfaceId = surfaces[eid] & 0xFFu;
    let batchIndex = shapeId * MAX_SURFACES + surfaceId;
    if (batchIndex >= MAX_BATCH_SLOTS) {
        entityBatchInfo[eid] = INVALID_SHAPE;
        return;
    }

    let alpha = colors[eid].w;
    let isTransparent = select(0u, 1u, alpha < 1.0);
    let slotIndex = batchIndex + isTransparent * MAX_BATCH_SLOTS;

    atomicAdd(&slotCounts[slotIndex], 1u);
    entityBatchInfo[eid] = batchIndex | (isTransparent << 31u);
}
`, qs = `
@group(0) @binding(0) var<storage, read> slotCounts: array<u32>;
@group(0) @binding(1) var<storage, read_write> indirect: array<u32>;
@group(0) @binding(2) var<storage, read> meshMeta: array<vec4<u32>>;
@group(0) @binding(3) var<storage, read> activeSlots: array<u32>;
@group(0) @binding(4) var<uniform> params: vec2<u32>;

const MAX_SURFACES: u32 = 32u;
const MAX_BATCH_SLOTS: u32 = ${So}u;
const INDIRECT_STRIDE: u32 = 5u;

fn writeSlot(slotIndex: u32, batchIndex: u32, offset: ptr<function, u32>) {
    let count = slotCounts[slotIndex];
    let iBase = slotIndex * INDIRECT_STRIDE;

    if (count > 0u) {
        let shapeId = batchIndex / MAX_SURFACES;
        let sm = meshMeta[shapeId];
        indirect[iBase] = sm.z * 3u;
        indirect[iBase + 1u] = count;
        indirect[iBase + 2u] = sm.y;
        indirect[iBase + 3u] = 0u;
        indirect[iBase + 4u] = *offset;
    } else {
        indirect[iBase + 1u] = 0u;
    }

    *offset += count;
}

@compute @workgroup_size(1)
fn main() {
    var offset: u32 = 0u;
    let slotCount = params.x;

    for (var i: u32 = 0u; i < slotCount; i++) {
        writeSlot(activeSlots[i], activeSlots[i], &offset);
    }
    for (var i: u32 = 0u; i < slotCount; i++) {
        writeSlot(activeSlots[i] + MAX_BATCH_SLOTS, activeSlots[i], &offset);
    }
}
`, Js = `
@group(0) @binding(0) var<storage, read> entityBatchInfo: array<u32>;
@group(0) @binding(1) var<storage, read> indirect: array<u32>;
@group(0) @binding(2) var<storage, read_write> scatterCounters: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> entityIds: array<u32>;
@group(0) @binding(4) var<storage, read_write> cullEntities: array<vec2<u32>>;
@group(0) @binding(5) var<storage, read> entityCount: array<u32>;
@group(0) @binding(6) var<storage, read_write> transparentEntities: array<u32>;

const INVALID_SHAPE: u32 = 0xFFFFFFFFu;
const MAX_BATCH_SLOTS: u32 = ${So}u;
const INDIRECT_STRIDE: u32 = 5u;
const CULL_COUNTER: u32 = ${So * 2}u;
const TRANSPARENT_COUNTER: u32 = ${Es}u;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let eid = gid.x;
    if (eid >= entityCount[0]) { return; }

    let info = entityBatchInfo[eid];
    if (info == INVALID_SHAPE) { return; }

    let batchIndex = info & 0x7FFFFFFFu;
    let isTransparent = info >> 31u;
    let slotIndex = batchIndex + isTransparent * MAX_BATCH_SLOTS;

    let firstInstance = indirect[slotIndex * INDIRECT_STRIDE + 4u];
    let localIdx = atomicAdd(&scatterCounters[slotIndex], 1u);
    entityIds[firstInstance + localIdx] = eid;

    if (isTransparent == 1u) {
        let transIdx = atomicAdd(&scatterCounters[TRANSPARENT_COUNTER], 1u);
        transparentEntities[transIdx] = eid;
    }

    let cullIdx = atomicAdd(&scatterCounters[CULL_COUNTER], 1u);
    cullEntities[cullIdx] = vec2(eid, slotIndex);
}
`;
function Ys(e) {
	let t = null, n = null, r = null, i = null, a = null, o = null, s = null, c = null, l = new Uint32Array(2), u = new Uint32Array(1), d = M(), f = e.meshVersion;
	return {
		name: "batch-compute",
		scope: "frame",
		inputs: ["data"],
		outputs: ["batched"],
		async prepare(l) {
			let u = e.batching, d = l.createShaderModule({ code: Gs }), f = l.createShaderModule({ code: Ks }), p = l.createShaderModule({ code: qs }), m = l.createShaderModule({ code: Js });
			[t, n, r, i] = await Promise.all([
				l.createComputePipelineAsync({
					label: "batch-resolve",
					layout: "auto",
					compute: {
						module: d,
						entryPoint: "main"
					}
				}),
				l.createComputePipelineAsync({
					label: "batch-count",
					layout: "auto",
					compute: {
						module: f,
						entryPoint: "main"
					}
				}),
				l.createComputePipelineAsync({
					label: "batch-prefix",
					layout: "auto",
					compute: {
						module: p,
						entryPoint: "main"
					}
				}),
				l.createComputePipelineAsync({
					label: "batch-scatter",
					layout: "auto",
					compute: {
						module: m,
						entryPoint: "main"
					}
				})
			]), a = cn(l, t.getBindGroupLayout(0), () => [
				{
					binding: 0,
					resource: { buffer: u.resolveInputBuffer.buffer }
				},
				R(1, e.shapes),
				R(2, e.surfaces),
				R(3, e.sizes),
				{
					binding: 4,
					resource: { buffer: u.resolveParamsBuffer }
				}
			]), o = cn(l, n.getBindGroupLayout(0), () => [
				R(0, e.shapes),
				R(1, e.surfaces),
				R(2, e.colors),
				{
					binding: 3,
					resource: { buffer: u.slotCounts }
				},
				{
					binding: 4,
					resource: { buffer: u.entityBatchInfo.buffer }
				},
				R(5, e.entityCountBuffer)
			]), s = l.createBindGroup({
				layout: r.getBindGroupLayout(0),
				entries: [
					{
						binding: 0,
						resource: { buffer: u.slotCounts }
					},
					{
						binding: 1,
						resource: { buffer: u.indirect }
					},
					{
						binding: 2,
						resource: { buffer: e.meshAtlas.meta }
					},
					{
						binding: 3,
						resource: { buffer: u.activeSlotsGPU }
					},
					{
						binding: 4,
						resource: { buffer: u.prefixParams }
					}
				]
			}), c = cn(l, i.getBindGroupLayout(0), () => [
				{
					binding: 0,
					resource: { buffer: u.entityBatchInfo.buffer }
				},
				{
					binding: 1,
					resource: { buffer: u.indirect }
				},
				{
					binding: 2,
					resource: { buffer: u.scatterCounters }
				},
				{
					binding: 3,
					resource: { buffer: u.entityIds.buffer }
				},
				{
					binding: 4,
					resource: { buffer: u.cullEntities.buffer }
				},
				R(5, e.entityCountBuffer),
				{
					binding: 6,
					resource: { buffer: u.transparentEntities.buffer }
				}
			]);
		},
		execute(p) {
			if (!t || !n || !r || !i || !a || !o || !s || !c) return;
			let m = e.entityCount;
			if (m === 0) return;
			let h = e.batching;
			M() !== d && (d = M(), u[0] = d, p.device.queue.writeBuffer(h.resolveParamsBuffer, 0, u)), e.meshVersion !== f && r && (f = e.meshVersion, s = p.device.createBindGroup({
				layout: r.getBindGroupLayout(0),
				entries: [
					{
						binding: 0,
						resource: { buffer: h.slotCounts }
					},
					{
						binding: 1,
						resource: { buffer: h.indirect }
					},
					{
						binding: 2,
						resource: { buffer: e.meshAtlas.meta }
					},
					{
						binding: 3,
						resource: { buffer: h.activeSlotsGPU }
					},
					{
						binding: 4,
						resource: { buffer: h.prefixParams }
					}
				]
			})), p.encoder.clearBuffer(h.slotCounts), p.encoder.clearBuffer(h.scatterCounters), Us(h), l[0] = h.activeSlotCount, p.device.queue.writeBuffer(h.prefixParams, 0, l), p.device.queue.writeBuffer(h.activeSlotsGPU, 0, h.activeSlots.buffer, 0, h.activeSlotCount * 4);
			let g = L(p.encoder, p.timestampWrites?.("batch-resolve"));
			g.setPipeline(t), g.setBindGroup(0, a.group), g.dispatchWorkgroups(Math.ceil(m / 64)), g.end();
			let _ = L(p.encoder, p.timestampWrites?.("batch-count"));
			_.setPipeline(n), _.setBindGroup(0, o.group), _.dispatchWorkgroups(Math.ceil(m / 64)), _.end();
			let v = L(p.encoder, p.timestampWrites?.("batch-prefix"));
			v.setPipeline(r), v.setBindGroup(0, s), v.dispatchWorkgroups(1), v.end();
			let y = L(p.encoder, p.timestampWrites?.("batch-scatter"));
			y.setPipeline(i), y.setBindGroup(0, c.group), y.dispatchWorkgroups(Math.ceil(m / 64)), y.end(), zs(h);
		}
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/render/index.ts
var Xs = I("render"), Zs = {
	name: "Render",
	systems: [{
		group: "draw",
		annotations: { mode: "always" },
		first: !0,
		update(e) {
			let t = Xs.from(e), n = un.from(e);
			if (!t || !n) return;
			let { device: r } = n, i = jo();
			i !== t.meshVersion && (ls(r, t.meshAtlas), t.meshVersion = i), t.entityCount = e.max + 1;
			let a = t.entityCount, o = performance.now();
			r.queue.writeBuffer(t.matrices.buffer, 0, Fi.data, 0, a * 16);
			let s = M() * 16;
			nt(r.queue, t.propertiesBuffer.buffer, 0, Fo, a), nt(r.queue, t.propertiesBuffer.buffer, s, Io, a), nt(r.queue, t.propertiesBuffer.buffer, s * 2, Lo, a), nt(r.queue, t.propertiesBuffer.buffer, s * 3, Ro, a), e.scheduler.reportCpu("Render/0:upload", performance.now() - o), o = performance.now(), Ws(r, t.batching, Po, Ko, Go, zo, a), Is[0] = a, r.queue.writeBuffer(t.u32Buffer.buffer, M() * 2 * 4, Is), e.scheduler.reportCpu("Render/0:write", performance.now() - o);
		}
	}],
	components: {
		Camera: U,
		Part: K,
		Mesh: qo,
		Dynamic: Jo,
		AmbientLight: Ri,
		DirectionalLight: H,
		PointLight: zi,
		Tonemap: ta,
		FXAA: na,
		Vignette: ra,
		Posterize: ia,
		Dither: aa,
		Shadows: oa,
		Reflections: sa,
		Haze: ca,
		Sky: la,
		Moon: ua,
		Stars: da,
		Clouds: fa,
		Sun: pa,
		Viewport: ma
	},
	relations: [ha],
	dependencies: [fn, Mr],
	async initialize(e, t) {
		lo(), No();
		let n = un.from(e);
		if (!n) return;
		let { device: r } = n, i = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC, a = cs(r), o = Ls(r), s = z(r, "matrices", i, (e) => e * 64), u = z(r, "properties", i, (e) => e * 64), d = z(r, "u32-props", i, (e) => e * 8 + 256), f = z(r, "data", i, (e) => e * 64), p = r.createBuffer({
			label: "point-lights",
			size: Hi,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		}), m = {
			viewProj: new Float32Array(16),
			scene: Xi(r),
			sky: Zi(r),
			matrices: s,
			propertiesBuffer: u,
			u32Buffer: d,
			colors: ln(u, () => 0, (e) => e * 16),
			sizes: ln(u, (e) => e * 16, (e) => e * 16),
			pbr: ln(u, (e) => e * 32, (e) => e * 16),
			emission: ln(u, (e) => e * 48, (e) => e * 16),
			shapes: ln(d, () => 0, (e) => e * 4),
			surfaces: ln(d, (e) => e * 4, (e) => e * 4),
			entityCountBuffer: ln(d, (e) => e * 8, () => 256),
			data: f,
			entityCount: 1,
			meshVersion: jo(),
			batching: o,
			effects: { overlay: [] },
			meshAtlas: a,
			width: 0,
			height: 0,
			instanceDataBuffer: null,
			pointLightBuffer: p,
			pointLightData: [new Float32Array(), 0],
			needsDepth: !1
		};
		e.setResource(Xs, m), e.setResource(hr, { eid: -1 });
		let h = Cs(m);
		n.graph.add(h);
		let g = Ts(m);
		n.graph.add(g), e.observe(c(K), (e) => {
			let t = e >>> 5, n = m.batching;
			if (t >= n.partMask.length) {
				let e = new Uint32Array(M() >>> 5);
				e.set(n.partMask), n.partMask = e;
			}
			n.partMask[t] |= 1 << (e & 31), n.cullEntityCount++;
		}), e.observe(l(K), (e) => {
			m.batching.partMask[e >>> 5] &= ~(1 << (e & 31)), m.batching.cullEntityCount--;
		}), e.observe(c(Jo), (e) => {
			Qo(e);
		}), e.observe(l(Jo), (e) => {
			$o(e);
		});
		let _ = Ys(m);
		n.graph.add(_), n.graph.add({
			name: "point-light-upload",
			scope: "frame",
			inputs: ["data"],
			outputs: ["point-light-data"],
			execute(t) {
				let n = hr.from(e)?.eid ?? -1;
				m.pointLightData = Wi(e, n >= 0 && e.hasComponent(n, oa));
				let [r, i] = m.pointLightData;
				i > 0 && t.device.queue.writeBuffer(m.pointLightBuffer, 0, r.buffer, r.byteOffset, i * 8 * 4);
			}
		}), n.graph.add(bs({
			overlays: m.effects.overlay,
			hasDepthWriter: (() => {
				let e = /* @__PURE__ */ new Map();
				return (t) => {
					let r = e.get(t);
					if (r !== void 0) return r;
					r = !1;
					let i = n.graph.subGraphs.get(t);
					if (i) for (let e of i.nodes.values()) {
						for (let t of e.outputs) if (t === "depth") {
							r = !0;
							break;
						}
						if (r) break;
					}
					return e.set(t, r), r;
				};
			})()
		})), n.graph.add(ds(m.scene)), t?.(1);
	},
	async warm(e) {
		let t = [];
		for (let n of e.query([U])) U.active[n] && t.push(n);
		if (t.length > 0) {
			let n = [];
			for (let t of e.query([_r])) n.push(t);
			if (n.length === 0) {
				let t = e.addEntity();
				e.addComponent(t, _r), n.push(t);
			}
			for (let r of t) e.getFirstRelationTarget(r, ha) >= 0 || n.length === 1 && e.addRelation(r, ha, n[0]);
		}
		let n = vr.from(e);
		n && n.push((e, t, n) => {
			let r = hr.from(e), i = Xs.from(e), a = un.from(e);
			if (!a) return;
			let o = -1;
			for (let n of e.query([U])) if (U.active[n] && e.getFirstRelationTarget(n, ha) === t) {
				o = n;
				break;
			}
			o < 0 || (r && (r.eid = o), i && Ea(a.device, i, e, o, n));
		});
	}
}, Qs = `
struct CullParams {
    planes: array<vec4<f32>, 6>,
    entityCount: u32,
}

@group(0) @binding(0) var<uniform> params: CullParams;
@group(0) @binding(1) var<storage, read> matrices: array<mat4x4<f32>>;
@group(0) @binding(2) var<storage, read> sizes: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> shapeAABBs: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> cullEntities: array<vec2<u32>>;

@group(1) @binding(0) var<storage, read_write> indirect: array<atomic<u32>>;
@group(1) @binding(1) var<storage, read_write> entityIds: array<u32>;

struct WorldSphere {
    center: vec3<f32>,
    radius: f32,
    batchSlot: u32,
    eid: u32,
}

fn computeWorldSphere(gid: u32) -> WorldSphere {
    let packed = cullEntities[gid];
    let eid = packed.x;
    let batchSlot = packed.y;

    let shapeIdx = (batchSlot % ${So}u) / 32u;
    let aabbIdx = shapeIdx * 2u;
    let aabbMin = shapeAABBs[aabbIdx];
    let aabbMax = shapeAABBs[aabbIdx + 1u];

    let size = sizes[eid];
    let localMin = aabbMin.xyz * size.xyz;
    let localMax = aabbMax.xyz * size.xyz;

    let localCenter = (localMin + localMax) * 0.5;
    let localExtent = (localMax - localMin) * 0.5;

    let world = matrices[eid];
    let worldCenter = (world * vec4<f32>(localCenter, 1.0)).xyz;

    let absCol0 = abs(world[0].xyz);
    let absCol1 = abs(world[1].xyz);
    let absCol2 = abs(world[2].xyz);
    let worldExtent = absCol0 * localExtent.x + absCol1 * localExtent.y + absCol2 * localExtent.z;
    let radius = length(worldExtent);

    return WorldSphere(worldCenter, radius, batchSlot, eid);
}

fn frustumTest(center: vec3<f32>, radius: f32) -> bool {
    for (var i = 0u; i < 6u; i++) {
        let plane = params.planes[i];
        let dist = dot(plane.xyz, center) + plane.w;
        if (dist < -radius) { return false; }
    }
    return true;
}

fn emitVisible(sphere: WorldSphere) {
    let indirectBase = sphere.batchSlot * 5u;
    let firstInstance = atomicLoad(&indirect[indirectBase + 4u]);
    let idx = atomicAdd(&indirect[indirectBase + 1u], 1u);
    entityIds[firstInstance + idx] = sphere.eid;
}
`;
function $s(e, t) {
	for (let n = 0; n < 256; n++) {
		let r = n * 6, i = n * 8;
		t[i] = e[r], t[i + 1] = e[r + 1], t[i + 2] = e[r + 2], t[i + 3] = 0, t[i + 4] = e[r + 3], t[i + 5] = e[r + 4], t[i + 6] = e[r + 5], t[i + 7] = 0;
	}
}
function ec() {
	return M() * 16;
}
function tc() {
	return ec() * 2;
}
var nc = 20, rc = nc + 1, ic = rc + 10, ac = ic + 1, oc = ac + 1 + 1 + 1, sc = oc + 1 + 1, cc = sc + 1, lc = cc + 1, uc = lc + 1, dc = uc + 1, fc = dc + 1, pc = (fc + 10) * 4, mc = 4608;
function hc() {
	return 2 * ec();
}
function gc() {
	return hc() + M() + 1;
}
function _c() {
	return gc() + M();
}
function vc() {
	return (_c() + M() * 33) * 4;
}
function yc() {
	return (M() * 2 + 24 + 1) * 4;
}
var bc = Math.ceil(pc / 256) * 256;
function xc() {
	return bc + tc() * 4;
}
function Sc() {
	return vc() + yc();
}
var Cc = "struct Body {\n    pos: vec3f,\n    mass: f32,\n    vel: vec3f,\n    momentX: f32,\n    angVel: vec3f,\n    radius: f32,\n    inertial: vec3f,\n    friction: f32,\n    initial: vec3f,\n    hullId: u32,\n    quat: vec4f,\n    inertialQuat: vec4f,\n    initialQuat: vec4f,\n    prevVel: vec3f,\n    momentY: f32,\n    prevAngVel: vec3f,\n    momentZ: f32,\n    cumAng: vec3f,\n    gravity: f32,\n    halfExtents: vec3f,\n    colliderType: f32,\n    collisionGroup: u32,\n    moved: f32,\n    _pad50: f32,\n    _pad51: f32,\n}", wc = "\nstruct GPUConstraint {\n    bodyA: u32,\n    bodyB: i32,\n    featureKey: u32,\n    stick: u32,\n    normal: vec3f,\n    C_init_n: f32,\n    tangent1: vec3f,\n    C_init_t1: f32,\n    tangent2: vec3f,\n    C_init_t2: f32,\n    rA: vec3f,\n    lambda_n: f32,\n    rB: vec3f,\n    penalty_n: f32,\n    rAW: vec3f,\n    friction: f32,\n    lambda_t1: f32,\n    penalty_t1: f32,\n    lambda_t2: f32,\n    penalty_t2: f32,\n    isNew: u32,\n    warmstartIdx: u32,\n    bilateral: u32,\n    _pad1: f32,\n    _pad2: f32,\n    _pad3: f32,\n    fmin_n: f32,\n    fmax_n: f32,\n    stiffness: f32,\n    rBW_x: f32,\n    rBW_y: f32,\n    rBW_z: f32,\n}\n\nconst CONSTRAINT_CONTACT = 0u;\nconst CONSTRAINT_BALL = 1u;\nconst CONSTRAINT_SPRING = 2u;\nconst CONSTRAINT_KINEMATIC = 3u;\n\nstruct WarmstartEntry {\n    lambda_n: f32,\n    penalty_n: f32,\n    lambda_t1: f32,\n    penalty_t1: f32,\n    lambda_t2: f32,\n    penalty_t2: f32,\n    stick: u32,\n    featureKey: u32,\n    rA: vec3f,\n    _pad0: f32,\n    rB: vec3f,\n    _pad1: f32,\n}\n", Tc = `

${Cc}
${wc}

struct Params {
    dt: f32,
    gravity: f32,
    iterations: u32,
    alpha: f32,
    betaLin: f32,
    gamma: f32,
    bodyCount: u32,
    jointCount: u32,
    capacity: u32,
    constraintMul: u32,
    hashMul: u32,
    betaAng: f32,
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
    _pad3: u32,
}

const PENALTY_MIN: f32 = 1.0;
const PENALTY_MAX: f32 = 1e10;
const COLLISION_MARGIN: f32 = 0.01;
const STICK_THRESH: f32 = 1e-5;
const MAX_PAIR_CONTACTS: u32 = 4u;
const HASH_EMPTY: u32 = 0xFFFFFFFFu;
const MAX_PROBE: u32 = 128u;
const SHAPE_BOX: f32 = 0.0;
const SHAPE_SPHERE: f32 = 1.0;
const SHAPE_CAPSULE: f32 = 2.0;

const FEATURE_KEY_NONE: u32 = 0xFFFFFFFFu;

const SS_CONSTRAINT_COUNT: u32 = 0u;
const SS_WARMSTART_HITS: u32 = 3u;
const SS_CONSTRAINT_OVERFLOW: u32 = 4u;
const SS_STACK_OVERFLOW: u32 = 5u;
const DEBUG_BROADPHASE: u32 = ${rc}u;
const SS_WARMSTART_NAN: u32 = ${ac}u;
const SS_WARMSTART_LOADED: u32 = ${oc}u;
const NUM_PAIR_TYPES: u32 = 10u;
const SS_PAIR_TYPE_BASE: u32 = ${fc}u;
const SS_CONTACT_COUNT: u32 = ${uc}u;
const SS_CONTACT_OVERFLOW: u32 = ${dc}u;
const MAX_CONTACTS: u32 = 128u;
const CONTACT_STRIDE: u32 = 9u;
const HASH_BASE: u32 = ${bc / 4}u;
`, Ec = "\nstruct Joint {\n    localAnchorA: vec3f,\n    bodyA: u32,\n    localAnchorB: vec3f,\n    bodyB: u32,\n    jointType: u32,\n    restLength: f32,\n    stiffness: f32,\n    targetSpeed: f32,\n    axis: vec3f,\n    maxTorque: f32,\n    fracture: f32,\n    broken: u32,\n    _pad0: f32,\n    _pad1: f32,\n}\n", Dc = "\nstruct TreeNode {\n    minX: f32,\n    minY: f32,\n    minZ: f32,\n    leftChild: u32,\n    maxX: f32,\n    maxY: f32,\n    maxZ: f32,\n    rightChild: u32,\n}\n\nconst LEAF_FLAG: u32 = 0x80000000u;\n\nstruct LeafAABB {\n    minX: f32, minY: f32, minZ: f32, _pad0: u32,\n    maxX: f32, maxY: f32, maxZ: f32, _pad1: u32,\n}\n", Oc = "\n@group(0) @binding(0) var<storage, read_write> bodies: array<Body>;\n@group(0) @binding(1) var<uniform> params: Params;\n@group(0) @binding(2) var<storage, read_write> constraints: array<GPUConstraint>;\n@group(0) @binding(3) var<storage, read_write> warmstarts: array<WarmstartEntry>;\n@group(0) @binding(5) var<storage, read_write> solverState: array<atomic<u32>>;\n", kc = `
${Ec}
${Dc}
@group(0) @binding(0) var<storage, read_write> bodies: array<Body>;
@group(0) @binding(1) var<uniform> params: Params;
@group(0) @binding(4) var<storage, read_write> joints: array<Joint>;
@group(0) @binding(5) var<storage, read_write> solverState: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read> treeNodes: array<TreeNode>;
@group(0) @binding(7) var<storage, read> sortedBodyIds: array<u32>;
@group(0) @binding(8) var<storage, read> leafAABBs: array<LeafAABB>;
`, Ac = `
${Ec}
${Dc}
@group(0) @binding(0) var<storage, read_write> bodies: array<Body>;
@group(0) @binding(1) var<uniform> params: Params;
@group(0) @binding(2) var<storage, read_write> constraints: array<GPUConstraint>;
@group(0) @binding(3) var<storage, read_write> warmstarts: array<WarmstartEntry>;
@group(0) @binding(4) var<storage, read_write> joints: array<Joint>;
@group(0) @binding(5) var<storage, read_write> solverState: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read> treeNodes: array<TreeNode>;
@group(0) @binding(7) var<storage, read> sortedBodyIds: array<u32>;
@group(0) @binding(8) var<storage, read> leafAABBs: array<LeafAABB>;
@group(0) @binding(9) var<storage, read> forces: array<f32>;
@group(0) @binding(10) var<storage, read_write> bodyCols: array<vec4f>;
`, jc = 0, Mc = 1, Nc = 2, Pc = 3, Fc = 4, Ic = `
${Tc}
${Ac}
`, Lc = "\n\nfn quatRotate(q: vec4f, v: vec3f) -> vec3f {\n    let u = q.xyz;\n    let t = 2.0 * cross(u, v);\n    return v + q.w * t + cross(u, t);\n}\n\nfn hashKey(k: u32) -> u32 {\n    var h = k;\n    h ^= h >> 16u;\n    h *= 0x85ebca6bu;\n    h ^= h >> 13u;\n    h *= 0xc2b2ae35u;\n    h ^= h >> 16u;\n    return h;\n}\n\nfn hashLookup(key: u32) -> u32 {\n    let hCap = params.capacity * params.hashMul;\n    let mask = hCap - 1u;\n    var slot = hashKey(key) & mask;\n    for (var p = 0u; p < MAX_PROBE; p++) {\n        let idx = (slot + p) & mask;\n        let stored = atomicLoad(&solverState[HASH_BASE + idx]);\n        if (stored == key) { return idx; }\n        if (stored == HASH_EMPTY) { return hCap; }\n    }\n    return hCap;\n}\n\nfn tangentBasis(n: vec3f) -> array<vec3f, 2> {\n    var t1: vec3f;\n    if (abs(n.x) > abs(n.y)) {\n        t1 = vec3f(-n.z, 0.0, n.x);\n    } else {\n        t1 = vec3f(0.0, n.z, -n.y);\n    }\n    t1 = normalize(t1);\n    let t2 = cross(t1, n);\n    return array<vec3f, 2>(t1, t2);\n}\n\nfn defaultWarmstart() -> WarmstartEntry {\n    return WarmstartEntry(0.0, PENALTY_MIN, 0.0, PENALTY_MIN, 0.0, PENALTY_MIN, 0u, FEATURE_KEY_NONE, vec3f(0.0), 0.0, vec3f(0.0), 0.0);\n}\n\nfn isNanOrInf(v: f32) -> bool {\n    return !(v == v) || abs(v) > 1e30;\n}\n\nfn applyWarmstart(ws: WarmstartEntry, stiffnessCap: f32) -> array<f32, 6> {\n    let a = params.alpha;\n    let g = params.gamma;\n    return array<f32, 6>(\n        (ws.lambda_n * a) * g,\n        min(clamp(ws.penalty_n * g, PENALTY_MIN, PENALTY_MAX), stiffnessCap),\n        (ws.lambda_t1 * a) * g,\n        min(clamp(ws.penalty_t1 * g, PENALTY_MIN, PENALTY_MAX), stiffnessCap),\n        (ws.lambda_t2 * a) * g,\n        min(clamp(ws.penalty_t2 * g, PENALTY_MIN, PENALTY_MAX), stiffnessCap),\n    );\n}\n\nfn pushConstraintWithWarmstart(\n    bodyA: u32, bodyB: i32, featureKey: u32,\n    normal: vec3f, C_init_n: f32,\n    tangent1: vec3f, C_init_t1: f32,\n    tangent2: vec3f, C_init_t2: f32,\n    rA: vec3f, rB: vec3f,\n    friction: f32,\n    wsKey: u32, bilateral: u32,\n    fmin_n: f32, fmax_n: f32, cStiffness: f32,\n    ws: WarmstartEntry,\n) {\n    var warm = applyWarmstart(ws, cStiffness);\n    if (bilateral == CONSTRAINT_KINEMATIC) {\n        warm[0] = 0.0;\n        warm[2] = 0.0;\n        warm[4] = 0.0;\n    }\n    let isNew: u32 = select(0u, 1u, ws.featureKey == FEATURE_KEY_NONE);\n    if (isNew == 0u) {\n        atomicAdd(&solverState[SS_WARMSTART_HITS], 1u);\n    }\n\n    let ci = atomicAdd(&solverState[SS_CONSTRAINT_COUNT], 1u);\n    if (ci >= params.capacity * params.constraintMul) { atomicAdd(&solverState[SS_CONSTRAINT_OVERFLOW], 1u); return; }\n    constraints[ci] = GPUConstraint(\n        bodyA, bodyB, featureKey, ws.stick,\n        normal, C_init_n,\n        tangent1, C_init_t1,\n        tangent2, C_init_t2,\n        rA, warm[0],\n        rB, warm[1],\n        vec3f(0.0), friction,\n        warm[2], warm[3], warm[4], warm[5],\n        isNew, wsKey, bilateral, 0.0,\n        0.0, 0.0, fmin_n, fmax_n,\n        cStiffness, 0.0, 0.0, 0.0,\n    );\n}\n", Rc = `
${Ic}
${`
${Lc}

fn quatMul(a: vec4f, b: vec4f) -> vec4f {
    return vec4f(
        a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
        a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
        a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    );
}

fn hashInsert(key: u32) -> u32 {
    let hCap = params.capacity * params.hashMul;
    let mask = hCap - 1u;
    var slot = hashKey(key) & mask;
    for (var p = 0u; p < MAX_PROBE; p++) {
        let idx = (slot + p) & mask;
        let old = atomicCompareExchangeWeak(&solverState[HASH_BASE + idx], HASH_EMPTY, key);
        if (old.exchanged || old.old_value == key) {
            return idx;
        }
    }
    return hCap;
}

fn loadWarmstartHash(key: u32, featureKey: u32) -> WarmstartEntry {
    let hCap = params.capacity * params.hashMul;
    let idx = hashLookup(key);
    if (idx < hCap) {
        let ws = warmstarts[idx];
        if (ws.featureKey == featureKey && featureKey != FEATURE_KEY_NONE) {
            if (isNanOrInf(ws.lambda_n) || isNanOrInf(ws.penalty_n) ||
                isNanOrInf(ws.lambda_t1) || isNanOrInf(ws.penalty_t1) ||
                isNanOrInf(ws.lambda_t2) || isNanOrInf(ws.penalty_t2)) {
                atomicAdd(&solverState[SS_WARMSTART_NAN], 1u);
                return defaultWarmstart();
            }
            if (ws.penalty_n > PENALTY_MIN) {
                atomicAdd(&solverState[SS_WARMSTART_LOADED], 1u);
            }
            return ws;
        }
    }
    return defaultWarmstart();
}

fn pushConstraint(
    bodyA: u32, bodyB: i32, featureKey: u32,
    normal: vec3f, C_init_n: f32,
    tangent1: vec3f, C_init_t1: f32,
    tangent2: vec3f, C_init_t2: f32,
    rA: vec3f, rB: vec3f,
    friction: f32,
    wsKey: u32, bilateral: u32,
    fmin_n: f32, fmax_n: f32, cStiffness: f32,
) {
    let ws = loadWarmstartHash(wsKey, featureKey);
    pushConstraintWithWarmstart(bodyA, bodyB, featureKey, normal, C_init_n, tangent1, C_init_t1, tangent2, C_init_t2, rA, rB, friction, wsKey, bilateral, fmin_n, fmax_n, cStiffness, ws);
}

`}
`, zc = "\nfn packKey(bodyA: u32, bodyB: u32, slot: u32) -> u32 {\n    let lo = min(bodyA, bodyB);\n    let hi = max(bodyA, bodyB);\n    var h = lo * 0x9e3779b9u + hi;\n    h ^= slot * 0x517cc1b7u;\n    h ^= h >> 16u;\n    h *= 0x85ebca6bu;\n    h ^= h >> 13u;\n    h *= 0xc2b2ae35u;\n    h ^= h >> 16u;\n    return select(h, h ^ 1u, h == HASH_EMPTY);\n}\n", Bc = `

const MAX_ANGVEL: f32 = 50.0;
const SOLVER_SHAPE_SPHERE: f32 = 1.0;
const SOLVER_SHAPE_CAPSULE: f32 = 2.0;
const SOLVER_SHAPE_HULL: f32 = 3.0;
const G_ZERO = array<f32, 6>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
const MAX_DEGREE: u32 = 32u;
const MAX_COLORS: u32 = 12u;
const ADJ_STRIDE: u32 = 33u;
const UNCOLORED: u32 = 0xFFFFFFFFu;
const KINEMATIC_COLOR: u32 = 0xFFFFFFFEu;

const SS_ITERATION: u32 = 1u;
const SS_CURRENT_COLOR: u32 = 2u;
const SS_HASH_OVERFLOW: u32 = 6u;
const SS_USED_COLORS: u32 = 7u;
const DEBUG_OFFSET: u32 = 8u;
const NAN_COUNT_OFFSET: u32 = ${nc}u;
const SS_PENALTY_SATURATED: u32 = ${ic}u;
const SS_ADJ_OVERFLOW: u32 = ${sc}u;
const SS_UNCOLORED: u32 = ${cc}u;
const SS_HASH_OCCUPANCY: u32 = ${lc}u;

struct CapacityLayout {
    csrDataOffset: u32,
    csrOffsetsOffset: u32,
    csrHeadsOffset: u32,
    adjOffset: u32,
    csBase: u32,
    sortedOffset: u32,
    colorMetaOffset: u32,
}

fn getLayout() -> CapacityLayout {
    let cap = params.capacity;
    let mc = cap * params.constraintMul;
    let hc = cap * params.hashMul;
    let cdb = HASH_BASE + hc;
    let csrOff = cdb + mc * 2u;
    let csrHeads = csrOff + cap + 1u;
    let adj = csrHeads + cap;
    let cgSize = adj - cdb + cap * ADJ_STRIDE;
    return CapacityLayout(
        cdb,
        csrOff, csrHeads, adj,
        cdb + cgSize,
        cap, cap * 2u,
    );
}

`, Vc = `
${Rc}
${`
${Bc}

fn quatNormalize(q: vec4f) -> vec4f {
    let len = length(q);
    if (len < 1e-12) {
        return vec4f(0.0, 0.0, 0.0, 1.0);
    }
    return q / len;
}

fn quatIntegrate(q: vec4f, v: vec3f) -> vec4f {
    let dq = vec4f(v, 0.0);
    let prod = quatMul(dq, q);
    return quatNormalize(q + prod * 0.5);
}

fn quatInv(q: vec4f) -> vec4f {
    let ls = dot(q, q);
    return vec4f(-q.xyz, q.w) / ls;
}

fn angDispFromInitial(quat: vec4f, initialQuat: vec4f) -> vec3f {
    let dq = quatMul(quat, quatInv(initialQuat));
    return 2.0 * dq.xyz;
}

fn solve6(a: array<f32, 36>, b: array<f32, 6>) -> array<f32, 6> {
    let D0 = max(a[0], 1e-20);
    let L10 = a[6] / D0;
    let L20 = a[12] / D0;
    let L30 = a[18] / D0;
    let L40 = a[24] / D0;
    let L50 = a[30] / D0;

    let D1 = max(a[7] - L10 * L10 * D0, 1e-20);
    let L21 = (a[13] - L20 * L10 * D0) / D1;
    let L31 = (a[19] - L30 * L10 * D0) / D1;
    let L41 = (a[25] - L40 * L10 * D0) / D1;
    let L51 = (a[31] - L50 * L10 * D0) / D1;

    let D2 = max(a[14] - (L20 * L20 * D0 + L21 * L21 * D1), 1e-20);
    let L32 = (a[20] - L30 * L20 * D0 - L31 * L21 * D1) / D2;
    let L42 = (a[26] - L40 * L20 * D0 - L41 * L21 * D1) / D2;
    let L52 = (a[32] - L50 * L20 * D0 - L51 * L21 * D1) / D2;

    let D3 = max(a[21] - ((L30 * L30 * D0 + L31 * L31 * D1) + L32 * L32 * D2), 1e-20);
    let L43 = (a[27] - L40 * L30 * D0 - L41 * L31 * D1 - L42 * L32 * D2) / D3;
    let L53 = (a[33] - L50 * L30 * D0 - L51 * L31 * D1 - L52 * L32 * D2) / D3;

    let D4 = max(a[28] - (((L40 * L40 * D0 + L41 * L41 * D1) + L42 * L42 * D2) + L43 * L43 * D3), 1e-20);
    let L54 = (a[34] - L50 * L40 * D0 - L51 * L41 * D1 - L52 * L42 * D2 - L53 * L43 * D3) / D4;

    let D5 = max(a[35] - ((((L50 * L50 * D0 + L51 * L51 * D1) + L52 * L52 * D2) + L53 * L53 * D3) + L54 * L54 * D4), 1e-20);

    var y: array<f32, 6>;
    y[0] = b[0];
    y[1] = b[1] - L10 * y[0];
    y[2] = b[2] - L20 * y[0] - L21 * y[1];
    y[3] = b[3] - L30 * y[0] - L31 * y[1] - L32 * y[2];
    y[4] = b[4] - L40 * y[0] - L41 * y[1] - L42 * y[2] - L43 * y[3];
    y[5] = b[5] - L50 * y[0] - L51 * y[1] - L52 * y[2] - L53 * y[3] - L54 * y[4];

    y[0] /= D0;
    y[1] /= D1;
    y[2] /= D2;
    y[3] /= D3;
    y[4] /= D4;
    y[5] /= D5;

    var x: array<f32, 6>;
    x[5] = y[5];
    x[4] = y[4] - L54 * x[5];
    x[3] = y[3] - L43 * x[4] - L53 * x[5];
    x[2] = y[2] - L32 * x[3] - L42 * x[4] - L52 * x[5];
    x[1] = y[1] - L21 * x[2] - L31 * x[3] - L41 * x[4] - L51 * x[5];
    x[0] = y[0] - L10 * x[1] - L20 * x[2] - L30 * x[3] - L40 * x[4] - L50 * x[5];

    return x;
}

fn addJacobianToSystem(lhs: ptr<function, array<f32, 36>>, rhs: ptr<function, array<f32, 6>>, n: vec3f, rxn: vec3f, f: f32, pen: f32, G: array<f32, 6>) {
    let J0 = n.x; let J1 = n.y; let J2 = n.z;
    let J3 = rxn.x; let J4 = rxn.y; let J5 = rxn.z;

    (*rhs)[0] += J0 * f;
    (*rhs)[1] += J1 * f;
    (*rhs)[2] += J2 * f;
    (*rhs)[3] += J3 * f;
    (*rhs)[4] += J4 * f;
    (*rhs)[5] += J5 * f;

    (*lhs)[0]  += J0 * J0 * pen + G[0];
    (*lhs)[6]  += J1 * J0 * pen;
    (*lhs)[7]  += J1 * J1 * pen + G[1];
    (*lhs)[12] += J2 * J0 * pen;
    (*lhs)[13] += J2 * J1 * pen;
    (*lhs)[14] += J2 * J2 * pen + G[2];

    (*lhs)[18] += J3 * J0 * pen;
    (*lhs)[19] += J3 * J1 * pen;
    (*lhs)[20] += J3 * J2 * pen;
    (*lhs)[21] += J3 * J3 * pen + G[3];
    (*lhs)[24] += J4 * J0 * pen;
    (*lhs)[25] += J4 * J1 * pen;
    (*lhs)[26] += J4 * J2 * pen;
    (*lhs)[27] += J4 * J3 * pen;
    (*lhs)[28] += J4 * J4 * pen + G[4];
    (*lhs)[30] += J5 * J0 * pen;
    (*lhs)[31] += J5 * J1 * pen;
    (*lhs)[32] += J5 * J2 * pen;
    (*lhs)[33] += J5 * J3 * pen;
    (*lhs)[34] += J5 * J4 * pen;
    (*lhs)[35] += J5 * J5 * pen + G[5];
}

fn accumulateContact(
    lhs: ptr<function, array<f32, 36>>,
    rhs: ptr<function, array<f32, 6>>,
    jac: Jacobians,
    F: vec3f,
    pen_n: f32, pen_t1: f32, pen_t2: f32,
) {
    let K = vec3f(pen_n, pen_t1, pen_t2);
    let jLT0 = vec3f(jac.J_n.x, jac.J_t1.x, jac.J_t2.x);
    let jLT1 = vec3f(jac.J_n.y, jac.J_t1.y, jac.J_t2.y);
    let jLT2 = vec3f(jac.J_n.z, jac.J_t1.z, jac.J_t2.z);
    let jAT0 = vec3f(jac.rxn_n.x, jac.rxn_t1.x, jac.rxn_t2.x);
    let jAT1 = vec3f(jac.rxn_n.y, jac.rxn_t1.y, jac.rxn_t2.y);
    let jAT2 = vec3f(jac.rxn_n.z, jac.rxn_t1.z, jac.rxn_t2.z);
    let jLTK0 = jLT0 * K;
    let jLTK1 = jLT1 * K;
    let jLTK2 = jLT2 * K;
    let jATK0 = jAT0 * K;
    let jATK1 = jAT1 * K;
    let jATK2 = jAT2 * K;

    (*lhs)[0]  += dot(jLTK0, jLT0);
    (*lhs)[6]  += dot(jLTK1, jLT0);
    (*lhs)[7]  += dot(jLTK1, jLT1);
    (*lhs)[12] += dot(jLTK2, jLT0);
    (*lhs)[13] += dot(jLTK2, jLT1);
    (*lhs)[14] += dot(jLTK2, jLT2);

    (*lhs)[21] += dot(jATK0, jAT0);
    (*lhs)[27] += dot(jATK1, jAT0);
    (*lhs)[28] += dot(jATK1, jAT1);
    (*lhs)[33] += dot(jATK2, jAT0);
    (*lhs)[34] += dot(jATK2, jAT1);
    (*lhs)[35] += dot(jATK2, jAT2);

    (*lhs)[18] += dot(jATK0, jLT0);
    (*lhs)[19] += dot(jATK0, jLT1);
    (*lhs)[20] += dot(jATK0, jLT2);
    (*lhs)[24] += dot(jATK1, jLT0);
    (*lhs)[25] += dot(jATK1, jLT1);
    (*lhs)[26] += dot(jATK1, jLT2);
    (*lhs)[30] += dot(jATK2, jLT0);
    (*lhs)[31] += dot(jATK2, jLT1);
    (*lhs)[32] += dot(jATK2, jLT2);

    (*rhs)[0] += jLT0.x * F.x + jLT0.y * F.y + jLT0.z * F.z;
    (*rhs)[1] += jLT1.x * F.x + jLT1.y * F.y + jLT1.z * F.z;
    (*rhs)[2] += jLT2.x * F.x + jLT2.y * F.y + jLT2.z * F.z;
    (*rhs)[3] += jAT0.x * F.x + jAT0.y * F.y + jAT0.z * F.z;
    (*rhs)[4] += jAT1.x * F.x + jAT1.y * F.y + jAT1.z * F.z;
    (*rhs)[5] += jAT2.x * F.x + jAT2.y * F.y + jAT2.z * F.z;
}

fn applyBallJointDirect(
    lhs: ptr<function, array<f32, 36>>,
    rhs: ptr<function, array<f32, 6>>,
    con: GPUConstraint, idx: u32,
) {
    let bA = bodies[con.bodyA];
    let bB = bodies[u32(con.bodyB)];

    let rAw = quatRotate(bA.quat, con.rA);
    let rBw = quatRotate(bB.quat, con.rB);

    var C = (bA.pos + rAw) - (bB.pos + rBw);
    if (con.stiffness >= 1e30) {
        C -= vec3f(con.C_init_n, con.C_init_t1, con.C_init_t2) * params.alpha;
    }

    let K = vec3f(con.penalty_n, con.penalty_t1, con.penalty_t2);
    let F = K * C + vec3f(con.lambda_n, con.lambda_t1, con.lambda_t2);

    let isA = idx == con.bodyA;
    let s = select(-1.0, 1.0, isA);
    let rWorld = quatRotate(bodies[idx].quat, select(con.rB, con.rA, isA));
    let angArm = select(rWorld, -rWorld, isA);

    (*lhs)[0]  += K.x;
    (*lhs)[7]  += K.y;
    (*lhs)[14] += K.z;

    let rx = angArm.x; let ry = angArm.y; let rz = angArm.z;

    (*lhs)[21] += K.y * rz * rz + K.z * ry * ry;
    (*lhs)[27] += -K.z * rx * ry;
    (*lhs)[28] += K.x * rz * rz + K.z * rx * rx;
    (*lhs)[33] += -K.y * rx * rz;
    (*lhs)[34] += -K.x * ry * rz;
    (*lhs)[35] += K.x * ry * ry + K.y * rx * rx;

    (*lhs)[18] += 0.0;            (*lhs)[19] += rz * K.y * s;   (*lhs)[20] += -ry * K.z * s;
    (*lhs)[24] += -rz * K.x * s;  (*lhs)[25] += 0.0;            (*lhs)[26] += rx * K.z * s;
    (*lhs)[30] += ry * K.x * s;   (*lhs)[31] += -rx * K.y * s;  (*lhs)[32] += 0.0;

    let geoArm = select(-rWorld, rWorld, isA);
    let Hc0 = vec3f(-(F.y * geoArm.y + F.z * geoArm.z), F.x * geoArm.y, F.x * geoArm.z);
    let Hc1 = vec3f(F.y * geoArm.x, -(F.x * geoArm.x + F.z * geoArm.z), F.y * geoArm.z);
    let Hc2 = vec3f(F.z * geoArm.x, F.z * geoArm.y, -(F.x * geoArm.x + F.y * geoArm.y));
    (*lhs)[21] += length(Hc0);
    (*lhs)[28] += length(Hc1);
    (*lhs)[35] += length(Hc2);

    (*rhs)[0] += s * F.x;
    (*rhs)[1] += s * F.y;
    (*rhs)[2] += s * F.z;
    let angF = -cross(angArm, F);
    (*rhs)[3] += angF.x;
    (*rhs)[4] += angF.y;
    (*rhs)[5] += angF.z;
}


`}
${`
const COL_POS: u32 = ${jc}u;
const COL_INITIAL: u32 = ${Mc}u;
const COL_CUMANG: u32 = ${Nc}u;
const COL_QUAT: u32 = ${Pc}u;
const COL_INITIAL_QUAT: u32 = ${Fc}u;

fn colIdx(col: u32, i: u32) -> u32 {
    return col * params.capacity + i;
}

fn contactArmFields(rA: vec3f, rB: vec3f, normal: vec3f, isA: bool, quat: vec4f, initialQuat: vec4f, radius: f32, collType: f32) -> vec3f {
    let s = select(1.0, -1.0, isA);
    let radial = s * normal * radius;
    let localArm = select(rB, rA, isA);
    let isSphere = collType == SOLVER_SHAPE_SPHERE;
    let isCapsule = collType == SOLVER_SHAPE_CAPSULE;
    let iqc = vec4f(-initialQuat.xyz, initialQuat.w);
    let radialLocal = quatRotate(iqc, radial);
    let capsuleArm = quatRotate(quat, localArm - radialLocal) + radial;
    let boxArm = quatRotate(quat, localArm);
    let arm = select(boxArm, capsuleArm, isCapsule);
    return select(arm, radial, isSphere);
}
`}

@compute @workgroup_size(64)
fn syncBodyCols(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= params.bodyCount) { return; }
    let body = bodies[idx];
    bodyCols[colIdx(COL_POS, idx)]          = vec4f(body.pos, body.radius);
    bodyCols[colIdx(COL_INITIAL, idx)]      = vec4f(body.initial, body.colliderType);
    bodyCols[colIdx(COL_CUMANG, idx)]       = vec4f(body.cumAng, 0.0);
    bodyCols[colIdx(COL_QUAT, idx)]         = body.quat;
    bodyCols[colIdx(COL_INITIAL_QUAT, idx)] = body.initialQuat;
}

fn detectBallJoint(ji: u32) {
    let joint = joints[ji];
    let bodyA = bodies[joint.bodyA];
    let bodyB = bodies[joint.bodyB];

    let rAw = quatRotate(bodyA.quat, joint.localAnchorA);
    let rBw = quatRotate(bodyB.quat, joint.localAnchorB);

    let worldA = bodyA.pos + rAw;
    let worldB = bodyB.pos + rBw;
    let diff_init = worldA - worldB;

    let featureKey = 0x80000000u + ji;
    let wsKey = 0x80000000u | ji;

    let stiffness = select(1e30, joint.stiffness, joint.stiffness > 0.0);

    pushConstraint(
        joint.bodyA, i32(joint.bodyB), featureKey,
        vec3f(1.0, 0.0, 0.0), diff_init.x,
        vec3f(0.0, 1.0, 0.0), diff_init.y,
        vec3f(0.0, 0.0, 1.0), diff_init.z,
        joint.localAnchorA, joint.localAnchorB,
        0.0,
        wsKey, 1u,
        -1e30, 1e30, stiffness,
    );
}

fn detectSpring(ji: u32) {
    let joint = joints[ji];
    let bodyA = bodies[joint.bodyA];
    let bodyB = bodies[joint.bodyB];

    let rA = quatRotate(bodyA.quat, joint.localAnchorA);
    let rB = quatRotate(bodyB.quat, joint.localAnchorB);

    let worldA = bodyA.pos + rA;
    let worldB = bodyB.pos + rB;
    let diff = worldB - worldA;
    let dist = length(diff);
    let restLength = joint.restLength;
    let stiffness = joint.stiffness;

    var normal = vec3f(1.0, 0.0, 0.0);
    if (dist > 1e-8) {
        normal = diff / dist;
    }

    let C_n = dist - restLength;
    let featureKey = 0x90000000u + ji;
    let t = tangentBasis(normal);
    let wsKey = 0x90000000u | ji;

    pushConstraint(
        joint.bodyA, i32(joint.bodyB), featureKey,
        normal, C_n,
        t[0], 0.0, t[1], 0.0,
        rA, rB,
        0.0,
        wsKey, 2u,
        -1e30, 1e30, stiffness,
    );
}

fn computeBallJointCFn(c: GPUConstraint, ji: u32, currentAlpha: f32) -> vec3f {
    let bodyA = bodies[c.bodyA];
    let bodyB = bodies[u32(c.bodyB)];

    let rA = quatRotate(bodyA.quat, c.rA);
    let rB = quatRotate(bodyB.quat, c.rB);

    let worldA = bodyA.pos + rA;
    let worldB = bodyB.pos + rB;
    let diff = worldA - worldB;

    let Cn_n = dot(c.normal, diff);
    let Cn_t1 = dot(c.tangent1, diff);
    let Cn_t2 = dot(c.tangent2, diff);

    return vec3f(
        Cn_n - currentAlpha * c.C_init_n,
        Cn_t1 - currentAlpha * c.C_init_t1,
        Cn_t2 - currentAlpha * c.C_init_t2,
    );
}

fn computeSpringCFn(c: GPUConstraint, ji: u32) -> vec3f {
    let joint = joints[ji];
    let bodyA = bodies[c.bodyA];
    let bodyB = bodies[u32(c.bodyB)];

    let rA = quatRotate(bodyA.quat, joint.localAnchorA);
    let rB = quatRotate(bodyB.quat, joint.localAnchorB);

    let worldA = bodyA.pos + rA;
    let worldB = bodyB.pos + rB;
    let diff = worldB - worldA;
    let dist = length(diff);

    return vec3f(dist - joint.restLength, 0.0, 0.0);
}

fn contactArm(c: GPUConstraint, bodyIdx: u32) -> vec3f {
    let body = bodies[bodyIdx];
    let isA = bodyIdx == c.bodyA;
    let s = select(1.0, -1.0, isA);
    let radial = s * c.normal * body.radius;
    let localArm = select(c.rB, c.rA, isA);
    let isSphere = body.colliderType == SOLVER_SHAPE_SPHERE;
    let isCapsule = body.colliderType == SOLVER_SHAPE_CAPSULE;
    let iqc = vec4f(-body.initialQuat.xyz, body.initialQuat.w);
    let radialLocal = quatRotate(iqc, radial);
    let capsuleArm = quatRotate(body.quat, localArm - radialLocal) + radial;
    let boxArm = quatRotate(body.quat, localArm);
    let arm = select(boxArm, capsuleArm, isCapsule);
    return select(arm, radial, isSphere);
}

fn computeConstraintC(c: GPUConstraint, currentAlpha: f32) -> vec3f {
    let bA = bodies[c.bodyA];
    let bB = bodies[u32(c.bodyB)];
    let dqALin = bA.pos - bA.initial;
    let dqAAng = bA.cumAng;
    let dqBLin = bB.pos - bB.initial;
    let dqBAng = bB.cumAng;
    let rAW = contactArm(c, c.bodyA);
    let rBW = contactArm(c, u32(c.bodyB));
    let oneMinusAlpha = 1.0 - currentAlpha;

    let jALin_n = c.normal;
    let jBLin_n = -c.normal;
    let jAAng_n = cross(rAW, jALin_n);
    let jBAng_n = cross(rBW, jBLin_n);
    let C_n = oneMinusAlpha * c.C_init_n + dot(jALin_n, dqALin) + dot(jBLin_n, dqBLin) + dot(jAAng_n, dqAAng) + dot(jBAng_n, dqBAng);

    let jALin_t1 = c.tangent1;
    let jBLin_t1 = -c.tangent1;
    let jAAng_t1 = cross(rAW, jALin_t1);
    let jBAng_t1 = cross(rBW, jBLin_t1);
    let C_t1 = oneMinusAlpha * c.C_init_t1 + dot(jALin_t1, dqALin) + dot(jBLin_t1, dqBLin) + dot(jAAng_t1, dqAAng) + dot(jBAng_t1, dqBAng);

    let jALin_t2 = c.tangent2;
    let jBLin_t2 = -c.tangent2;
    let jAAng_t2 = cross(rAW, jALin_t2);
    let jBAng_t2 = cross(rBW, jBLin_t2);
    let C_t2 = oneMinusAlpha * c.C_init_t2 + dot(jALin_t2, dqALin) + dot(jBLin_t2, dqBLin) + dot(jAAng_t2, dqAAng) + dot(jBAng_t2, dqBAng);

    return vec3f(C_n, C_t1, C_t2);
}

struct Jacobians {
    J_n: vec3f,
    rxn_n: vec3f,
    J_t1: vec3f,
    rxn_t1: vec3f,
    J_t2: vec3f,
    rxn_t2: vec3f,
}

fn applySpringDirect(lhs: ptr<function, array<f32, 36>>, rhs: ptr<function, array<f32, 6>>, c: GPUConstraint, idx: u32) {
    let ji = c.featureKey - 0x90000000u;
    let joint = joints[ji];
    let sBodyA = bodies[c.bodyA];
    let sBodyB = bodies[u32(c.bodyB)];
    let srA = quatRotate(sBodyA.quat, joint.localAnchorA);
    let srB = quatRotate(sBodyB.quat, joint.localAnchorB);
    let sDiff = (sBodyA.pos + srA) - (sBodyB.pos + srB);
    let sDist = length(sDiff);
    if (sDist <= 1e-6) { return; }
    let sNormal = sDiff / sDist;
    let springC = sDist - joint.restLength;
    let springF = joint.stiffness * springC;
    let isA = idx == c.bodyA;
    let sSign = select(-1.0, 1.0, isA);
    let sArm = select(srB, srA, isA);
    let sJ_n = sNormal * sSign;
    let sRxn_n = cross(sArm, sJ_n);
    addJacobianToSystem(lhs, rhs, sJ_n, sRxn_n, springF, joint.stiffness, G_ZERO);
}

fn computeCForType(c: GPUConstraint, currentAlpha: f32) -> vec3f {
    if (c.bilateral == CONSTRAINT_SPRING) {
        let ji = c.featureKey - 0x90000000u;
        return computeSpringCFn(c, ji);
    }
    if (c.bilateral == CONSTRAINT_BALL) {
        let ji = c.featureKey - 0x80000000u;
        return computeBallJointCFn(c, ji, currentAlpha);
    }
    let alpha = select(currentAlpha, 0.0, c.bilateral == CONSTRAINT_KINEMATIC);
    return computeConstraintC(c, alpha);
}

@compute @workgroup_size(64)
fn warmstartBodies(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= params.bodyCount) { return; }

    let dt = params.dt;
    let dt2 = dt * dt;

    var body = bodies[idx];
    let g = vec3f(0.0, params.gravity * body.gravity, 0.0);

    if (body.pos.x != body.pos.x || body.pos.y != body.pos.y || body.pos.z != body.pos.z) {
        atomicAdd(&solverState[NAN_COUNT_OFFSET], 1u);
    }

    if (body.mass <= 0.0) {
        body.initial = body.pos;
        body.initialQuat = body.quat;
        bodies[idx] = body;
        return;
    }

    let fOff = idx * 8u;
    let extForce = vec3f(forces[fOff], forces[fOff + 1u], forces[fOff + 2u]);
    let extTorque = vec3f(forces[fOff + 3u], forces[fOff + 4u], forces[fOff + 5u]);
    let forceMode = forces[fOff + 6u];

    if (forceMode > 0.5) {
        body.vel = extForce;
        body.angVel = extTorque;
    } else {
        body.vel += (extForce / body.mass) * dt;

        let invI = vec3f(1.0 / body.momentX, 1.0 / body.momentY, 1.0 / body.momentZ);
        let q = body.quat;
        let tLocal = quatRotate(quatInv(q), extTorque);
        body.angVel += invI * tLocal * dt;
    }

    let angSpeedPre = length(body.angVel);
    if (angSpeedPre > MAX_ANGVEL) {
        body.angVel = body.angVel * (MAX_ANGVEL / angSpeedPre);
    }

    body.inertial = body.pos + body.vel * dt + g * dt2;
    body.inertialQuat = quatIntegrate(body.quat, body.angVel * dt);

    let accel = (body.vel - body.prevVel) / dt;
    let accelExt = accel.y * sign(params.gravity);
    var accelWeight = clamp(accelExt / abs(params.gravity), 0.0, 1.0);
    if (accelWeight != accelWeight) { accelWeight = 0.0; }

    body.initial = body.pos;
    body.initialQuat = body.quat;

    body.pos = body.pos + body.vel * dt + g * (accelWeight * dt * dt);
    body.quat = body.inertialQuat;

    bodies[idx] = body;
}

@compute @workgroup_size(64)
fn detectJoints(@builtin(global_invocation_id) gid: vec3u) {
    let ji = gid.x;
    if (ji >= params.jointCount) { return; }
    if (joints[ji].broken != 0u) { return; }
    if (joints[ji].jointType == 1u) {
        detectSpring(ji);
    } else {
        detectBallJoint(ji);
    }
}


@compute @workgroup_size(64)
fn initBodyCache(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= params.bodyCount) { return; }
    let body = bodies[idx];
    if (body.mass <= 0.0) {
        bodies[idx].cumAng = vec3f(0.0);
    } else {
        bodies[idx].cumAng = angDispFromInitial(body.quat, body.initialQuat);
    }
}

@compute @workgroup_size(64)
fn cacheContactC(@builtin(global_invocation_id) gid: vec3u) {
    let ci = gid.x;
    let numConstraints = atomicLoad(&solverState[SS_CONSTRAINT_COUNT]);
    if (ci >= numConstraints) { return; }
    let c = constraints[ci];
    if (c.bilateral != CONSTRAINT_CONTACT && c.bilateral != CONSTRAINT_KINEMATIC) { return; }
    let rAW = quatRotate(bodies[c.bodyA].initialQuat, c.rA);
    let rBW = quatRotate(bodies[u32(c.bodyB)].initialQuat, c.rB);
    constraints[ci].rAW = rAW;
    constraints[ci].rBW_x = rBW.x;
    constraints[ci].rBW_y = rBW.y;
    constraints[ci].rBW_z = rBW.z;
}

@compute @workgroup_size(64)
fn solveDual(@builtin(global_invocation_id) gid: vec3u) {
    let ci = gid.x;
    let numConstraints = atomicLoad(&solverState[SS_CONSTRAINT_COUNT]);
    if (ci >= numConstraints) { return; }

    var c = constraints[ci];
    if (c.bilateral == CONSTRAINT_SPRING) {
        constraints[ci] = c;
        return;
    }

    let penCap = min(PENALTY_MAX, c.stiffness);
    let beta = params.betaLin;

    if (c.bilateral == CONSTRAINT_BALL) {
        let bji = c.featureKey - 0x80000000u;
        let bA = bodies[c.bodyA];
        let bB = bodies[u32(c.bodyB)];
        let rAw = quatRotate(bA.quat, c.rA);
        let rBw = quatRotate(bB.quat, c.rB);
        var C = (bA.pos + rAw) - (bB.pos + rBw);
        if (c.stiffness >= 1e30) {
            C -= vec3f(c.C_init_n, c.C_init_t1, c.C_init_t2) * params.alpha;
            let K = vec3f(c.penalty_n, c.penalty_t1, c.penalty_t2);
            let newLambda = K * C + vec3f(c.lambda_n, c.lambda_t1, c.lambda_t2);
            c.lambda_n = newLambda.x;
            c.lambda_t1 = newLambda.y;
            c.lambda_t2 = newLambda.z;
        }
        c.penalty_n = min(c.penalty_n + beta * abs(C.x), penCap);
        c.penalty_t1 = min(c.penalty_t1 + beta * abs(C.y), penCap);
        c.penalty_t2 = min(c.penalty_t2 + beta * abs(C.z), penCap);
        c.stick = 0u;

        let frac = joints[bji].fracture;
        if (frac > 0.0) {
            let forceSq = c.lambda_n * c.lambda_n + c.lambda_t1 * c.lambda_t1 + c.lambda_t2 * c.lambda_t2;
            if (forceSq > frac * frac) {
                c.lambda_n = 0.0;
                c.lambda_t1 = 0.0;
                c.lambda_t2 = 0.0;
                c.penalty_n = 0.0;
                c.penalty_t1 = 0.0;
                c.penalty_t2 = 0.0;
                joints[bji].broken = 1u;
            }
        }
    } else {
        let Cs = computeCForType(c, params.alpha);
        let lambda_used = select(0.0, c.lambda_n, c.stiffness >= 1e30);
        c.lambda_n = clamp(c.penalty_n * Cs.x + lambda_used, c.fmin_n, c.fmax_n);
        if (c.lambda_n > c.fmin_n && c.lambda_n < c.fmax_n) {
            c.penalty_n = min(c.penalty_n + beta * abs(Cs.x), penCap);
        }
        if (c.penalty_n >= penCap) {
            atomicAdd(&solverState[SS_PENALTY_SATURATED], 1u);
        }

        if (c.friction > 0.0) {
            let dualBound = abs(c.lambda_n) * c.friction;
            let lambda_t1_used = select(0.0, c.lambda_t1, c.stiffness >= 1e30);
            let lambda_t2_used = select(0.0, c.lambda_t2, c.stiffness >= 1e30);
            var f_t1 = c.penalty_t1 * Cs.y + lambda_t1_used;
            var f_t2 = c.penalty_t2 * Cs.z + lambda_t2_used;
            let fScale = sqrt(f_t1 * f_t1 + f_t2 * f_t2);
            if (fScale > dualBound && fScale > 0.0) {
                let ratio = dualBound / fScale;
                f_t1 *= ratio;
                f_t2 *= ratio;
            }
            c.lambda_t1 = f_t1;
            c.lambda_t2 = f_t2;
            if (fScale <= dualBound) {
                c.penalty_t1 = min(c.penalty_t1 + beta * abs(Cs.y), penCap);
                c.penalty_t2 = min(c.penalty_t2 + beta * abs(Cs.z), penCap);
                c.stick = select(0u, 1u, sqrt(Cs.y * Cs.y + Cs.z * Cs.z) < STICK_THRESH);
            }
        }

    }

    constraints[ci] = c;
}

@compute @workgroup_size(1)
fn advanceIteration(@builtin(global_invocation_id) gid: vec3u) {
    atomicAdd(&solverState[SS_ITERATION], 1u);
}

@compute @workgroup_size(64)
fn computeVelocities(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= params.bodyCount) { return; }

    let dt = params.dt;
    var body = bodies[idx];

    if (body.mass <= 0.0) { return; }

    body.prevVel = body.vel;
    body.prevAngVel = body.angVel;
    body.vel = (body.pos - body.initial) / dt;

    let dqFinal = quatMul(body.quat, quatInv(body.initialQuat));
    body.angVel = 2.0 * dqFinal.xyz / dt;
    bodies[idx] = body;
}

@compute @workgroup_size(64)
fn writebackWarmstarts(@builtin(global_invocation_id) gid: vec3u) {
    let ci = gid.x;
    let numConstraints = atomicLoad(&solverState[SS_CONSTRAINT_COUNT]);
    if (ci >= numConstraints) { return; }

    let c = constraints[ci];
    let slot = hashInsert(c.warmstartIdx);
    if (slot >= params.capacity * params.hashMul) { atomicAdd(&solverState[SS_HASH_OVERFLOW], 1u); return; }
    atomicAdd(&solverState[SS_HASH_OCCUPANCY], 1u);
    warmstarts[slot] = WarmstartEntry(
        c.lambda_n, c.penalty_n,
        c.lambda_t1, c.penalty_t1,
        c.lambda_t2, c.penalty_t2,
        c.stick, c.featureKey,
        c.rA, 0.0,
        c.rB, 0.0,
    );
}

@compute @workgroup_size(64)
fn solvePrimal(@builtin(global_invocation_id) gid: vec3u) {
    let L = getLayout();
    let currentColor = atomicLoad(&solverState[SS_CURRENT_COLOR]);
    let colorOffset = atomicLoad(&solverState[L.csBase + L.colorMetaOffset + MAX_COLORS + currentColor]);
    let nextOffset = atomicLoad(&solverState[L.csBase + L.colorMetaOffset + MAX_COLORS + currentColor + 1u]);
    let colorCount = nextOffset - colorOffset;
    if (gid.x >= colorCount) { return; }

    let idx = atomicLoad(&solverState[L.csBase + L.sortedOffset + colorOffset + gid.x]);
    var body = bodies[idx];
    if (body.mass <= 0.0) { return; }

    let dt = params.dt;
    let dt2 = dt * dt;
    let clStart = atomicLoad(&solverState[L.csrOffsetsOffset + idx]);
    let clEnd = atomicLoad(&solverState[L.csrOffsetsOffset + idx + 1u]);

    var lhs: array<f32, 36>;
    let mdt2 = body.mass / dt2;
    lhs[0] = mdt2;
    lhs[7] = mdt2;
    lhs[14] = mdt2;
    lhs[21] = body.momentX / dt2;
    lhs[28] = body.momentY / dt2;
    lhs[35] = body.momentZ / dt2;

    let dp = body.pos - body.inertial;
    var rhs: array<f32, 6>;
    rhs[0] = mdt2 * dp.x;
    rhs[1] = mdt2 * dp.y;
    rhs[2] = mdt2 * dp.z;

    let dq = quatMul(body.quat, quatInv(body.inertialQuat));
    let angDisp2 = 2.0 * dq.xyz;
    rhs[3] = body.momentX / dt2 * angDisp2.x;
    rhs[4] = body.momentY / dt2 * angDisp2.y;
    rhs[5] = body.momentZ / dt2 * angDisp2.z;

    for (var k = clStart; k < clEnd; k++) {
        let ci = atomicLoad(&solverState[L.csrDataOffset + k]);
        var c = constraints[ci];
        if (c.bodyA != idx && c.bodyB != i32(idx)) { continue; }

        if (c.bilateral == CONSTRAINT_SPRING) {
            applySpringDirect(&lhs, &rhs, c, idx);
            continue;
        }

        if (c.bilateral == CONSTRAINT_BALL) {
            applyBallJointDirect(&lhs, &rhs, c, idx);
            continue;
        }

        let bA_isOwn = idx == c.bodyA;
        let neighborIdx = select(c.bodyA, u32(c.bodyB), bA_isOwn);

        let nPosCol         = bodyCols[colIdx(COL_POS, neighborIdx)];
        let nInitialCol     = bodyCols[colIdx(COL_INITIAL, neighborIdx)];
        let nCumAngCol      = bodyCols[colIdx(COL_CUMANG, neighborIdx)];
        let nQuat           = bodyCols[colIdx(COL_QUAT, neighborIdx)];
        let nInitialQuat    = bodyCols[colIdx(COL_INITIAL_QUAT, neighborIdx)];

        let quatA           = select(nQuat,        body.quat,        bA_isOwn);
        let quatB           = select(body.quat,    nQuat,            bA_isOwn);
        let initialQuatA    = select(nInitialQuat, body.initialQuat, bA_isOwn);
        let initialQuatB    = select(body.initialQuat, nInitialQuat, bA_isOwn);
        let radiusA         = select(nPosCol.w,    body.radius,      bA_isOwn);
        let radiusB         = select(body.radius,  nPosCol.w,        bA_isOwn);
        let collA           = select(nInitialCol.w, body.colliderType, bA_isOwn);
        let collB           = select(body.colliderType, nInitialCol.w, bA_isOwn);

        let rAW = contactArmFields(c.rA, c.rB, c.normal, true,  quatA, initialQuatA, radiusA, collA);
        let rBW = contactArmFields(c.rA, c.rB, c.normal, false, quatB, initialQuatB, radiusB, collB);

        let posA    = select(nPosCol.xyz,     body.pos,     bA_isOwn);
        let posB    = select(body.pos,        nPosCol.xyz,  bA_isOwn);
        let initA   = select(nInitialCol.xyz, body.initial, bA_isOwn);
        let initB   = select(body.initial,    nInitialCol.xyz, bA_isOwn);
        let cumAngA = select(nCumAngCol.xyz,  body.cumAng,  bA_isOwn);
        let cumAngB = select(body.cumAng,     nCumAngCol.xyz, bA_isOwn);

        let dqALin = posA - initA;
        let dqBLin = posB - initB;
        let dqAAng = cumAngA;
        let dqBAng = cumAngB;

        let alphaUsed = select(params.alpha, 0.0, c.bilateral == CONSTRAINT_KINEMATIC);
        let oneMinusAlpha = 1.0 - alphaUsed;

        let jALin_n = c.normal;
        let jBLin_n = -c.normal;
        let jAAng_n = cross(rAW, jALin_n);
        let jBAng_n = cross(rBW, jBLin_n);
        let C_n = oneMinusAlpha * c.C_init_n + dot(jALin_n, dqALin) + dot(jBLin_n, dqBLin) + dot(jAAng_n, dqAAng) + dot(jBAng_n, dqBAng);

        let jALin_t1 = c.tangent1;
        let jBLin_t1 = -c.tangent1;
        let jAAng_t1 = cross(rAW, jALin_t1);
        let jBAng_t1 = cross(rBW, jBLin_t1);
        let C_t1 = oneMinusAlpha * c.C_init_t1 + dot(jALin_t1, dqALin) + dot(jBLin_t1, dqBLin) + dot(jAAng_t1, dqAAng) + dot(jBAng_t1, dqBAng);

        let jALin_t2 = c.tangent2;
        let jBLin_t2 = -c.tangent2;
        let jAAng_t2 = cross(rAW, jALin_t2);
        let jBAng_t2 = cross(rBW, jBLin_t2);
        let C_t2 = oneMinusAlpha * c.C_init_t2 + dot(jALin_t2, dqALin) + dot(jBLin_t2, dqBLin) + dot(jAAng_t2, dqAAng) + dot(jBAng_t2, dqBAng);

        let Cs = vec3f(C_n, C_t1, C_t2);

        let lambda_used = select(0.0, c.lambda_n, c.stiffness >= 1e30);
        let f_n = clamp(c.penalty_n * Cs.x + lambda_used, c.fmin_n, c.fmax_n);

        let armOwn = select(rBW, rAW, bA_isOwn);
        let sJ = select(-1.0, 1.0, bA_isOwn);
        let J_n  = c.normal   * sJ;
        let J_t1 = c.tangent1 * sJ;
        let J_t2 = c.tangent2 * sJ;
        let jac = Jacobians(J_n, cross(armOwn, J_n), J_t1, cross(armOwn, J_t1), J_t2, cross(armOwn, J_t2));

        let lambda_t1_used = select(0.0, c.lambda_t1, c.stiffness >= 1e30);
        let lambda_t2_used = select(0.0, c.lambda_t2, c.stiffness >= 1e30);

        var f_t1 = c.penalty_t1 * Cs.y + lambda_t1_used;
        var f_t2 = c.penalty_t2 * Cs.z + lambda_t2_used;
        if (c.friction > 0.0) {
            let bound = abs(f_n) * c.friction;
            let fScale = sqrt(f_t1 * f_t1 + f_t2 * f_t2);
            if (fScale > bound && fScale > 0.0) {
                let ratio = bound / fScale;
                f_t1 *= ratio;
                f_t2 *= ratio;
            }
        }
        let F = vec3f(f_n, f_t1, f_t2);

        accumulateContact(&lhs, &rhs, jac, F, c.penalty_n, c.penalty_t1, c.penalty_t2);
    }

    for (var nr = 0u; nr < 6u; nr++) { rhs[nr] = -rhs[nr]; }
    let delta = solve6(lhs, rhs);
    let newPos = body.pos + vec3f(delta[0], delta[1], delta[2]);
    let newQuat = quatIntegrate(body.quat, vec3f(delta[3], delta[4], delta[5]));
    let newCumAng = body.cumAng + vec3f(delta[3], delta[4], delta[5]);
    bodies[idx].pos    = newPos;
    bodies[idx].quat   = newQuat;
    bodies[idx].cumAng = newCumAng;
    bodyCols[colIdx(COL_POS, idx)]    = vec4f(newPos, body.radius);
    bodyCols[colIdx(COL_QUAT, idx)]   = newQuat;
    bodyCols[colIdx(COL_CUMANG, idx)] = vec4f(newCumAng, 0.0);
}

@compute @workgroup_size(1)
fn advanceColor(@builtin(global_invocation_id) gid: vec3u) {
    atomicAdd(&solverState[SS_CURRENT_COLOR], 1u);
}

@compute @workgroup_size(1)
fn resetColor(@builtin(global_invocation_id) gid: vec3u) {
    atomicStore(&solverState[SS_CURRENT_COLOR], 0u);
}

`, Hc = `
${Ic}
${Bc}

fn colorPriority(id: u32) -> u32 {
    return id * 2654435761u;
}

@compute @workgroup_size(64)
fn clearColorBuffers(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    let L = getLayout();
    if (idx < MAX_COLORS) {
        atomicStore(&solverState[L.csBase + L.colorMetaOffset + idx], 0u);
        atomicStore(&solverState[L.csBase + L.colorMetaOffset + MAX_COLORS + idx], 0u);
    }
    if (idx == 0u) {
        atomicStore(&solverState[L.csBase + L.colorMetaOffset + MAX_COLORS * 2u], 0u);
        atomicStore(&solverState[SS_CURRENT_COLOR], 0u);
    }
    if (idx >= params.bodyCount) { return; }
    atomicStore(&solverState[L.adjOffset + idx * ADJ_STRIDE], 0u);
    atomicStore(&solverState[L.csrHeadsOffset + idx], 0u);
    atomicStore(&solverState[L.csBase + idx], UNCOLORED);
}

@compute @workgroup_size(64)
fn countBodyConstraints(@builtin(global_invocation_id) gid: vec3u) {
    let ci = gid.x;
    if (ci >= atomicLoad(&solverState[SS_CONSTRAINT_COUNT])) { return; }
    let L = getLayout();
    let c = constraints[ci];
    atomicAdd(&solverState[L.csrHeadsOffset + c.bodyA], 1u);
    if (c.bodyB >= 0) {
        let b = u32(c.bodyB);
        if (bodies[b].mass > 0.0) {
            atomicAdd(&solverState[L.csrHeadsOffset + b], 1u);
        }
    }
}

@compute @workgroup_size(64)
fn scatterBodyConstraints(@builtin(global_invocation_id) gid: vec3u) {
    let ci = gid.x;
    if (ci >= atomicLoad(&solverState[SS_CONSTRAINT_COUNT])) { return; }
    let L = getLayout();
    let c = constraints[ci];
    let slotA = atomicAdd(&solverState[L.csrHeadsOffset + c.bodyA], 1u);
    atomicStore(&solverState[L.csrDataOffset + slotA], ci);
    if (c.bodyB >= 0) {
        let b = u32(c.bodyB);
        if (bodies[b].mass > 0.0) {
            let slotB = atomicAdd(&solverState[L.csrHeadsOffset + b], 1u);
            atomicStore(&solverState[L.csrDataOffset + slotB], ci);
        }
    }
}

@compute @workgroup_size(64)
fn buildAdjacencyList(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= params.bodyCount) { return; }
    if (bodies[idx].mass <= 0.0) { return; }
    let L = getLayout();
    let clStart = atomicLoad(&solverState[L.csrOffsetsOffset + idx]);
    let clEnd = atomicLoad(&solverState[L.csrOffsetsOffset + idx + 1u]);
    var degree = 0u;
    for (var k = clStart; k < clEnd; k++) {
        let ci = atomicLoad(&solverState[L.csrDataOffset + k]);
        let c = constraints[ci];
        var neighbor = c.bodyA;
        if (neighbor == idx) {
            if (c.bodyB < 0) { continue; }
            neighbor = u32(c.bodyB);
        }
        if (neighbor == idx) { continue; }
        if (bodies[neighbor].mass <= 0.0) { continue; }
        var dup = false;
        for (var d = 0u; d < degree; d++) {
            if (atomicLoad(&solverState[L.adjOffset + idx * ADJ_STRIDE + 1u + d]) == neighbor) {
                dup = true;
                break;
            }
        }
        if (dup) { continue; }
        if (degree < MAX_DEGREE) {
            atomicStore(&solverState[L.adjOffset + idx * ADJ_STRIDE + 1u + degree], neighbor);
            degree++;
        } else {
            atomicAdd(&solverState[SS_ADJ_OVERFLOW], 1u);
        }
    }

    atomicStore(&solverState[L.adjOffset + idx * ADJ_STRIDE], degree);
}

@compute @workgroup_size(64)
fn graphColor(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= params.bodyCount) { return; }
    let L = getLayout();
    if (bodies[idx].mass <= 0.0) {
        atomicStore(&solverState[L.csBase + idx], KINEMATIC_COLOR);
        return;
    }
    if (atomicLoad(&solverState[L.csBase + idx]) != UNCOLORED) { return; }

    let myPriority = colorPriority(idx);
    let adjCount = min(atomicLoad(&solverState[L.adjOffset + idx * ADJ_STRIDE]), MAX_DEGREE);
    for (var i = 0u; i < adjCount; i++) {
        let neighbor = atomicLoad(&solverState[L.adjOffset + idx * ADJ_STRIDE + 1u + i]);
        if (colorPriority(neighbor) < myPriority && atomicLoad(&solverState[L.csBase + neighbor]) == UNCOLORED) {
            return;
        }
    }

    var usedColors = 0u;
    for (var i = 0u; i < adjCount; i++) {
        let neighbor = atomicLoad(&solverState[L.adjOffset + idx * ADJ_STRIDE + 1u + i]);
        let nc = atomicLoad(&solverState[L.csBase + neighbor]);
        if (nc < MAX_COLORS) {
            usedColors |= (1u << nc);
        }
    }
    atomicStore(&solverState[L.csBase + idx], countTrailingZeros(~usedColors));
}

@compute @workgroup_size(64)
fn countColors(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= params.bodyCount) { return; }
    let L = getLayout();
    let c = atomicLoad(&solverState[L.csBase + idx]);
    if (c < MAX_COLORS) {
        atomicAdd(&solverState[L.csBase + L.colorMetaOffset + c], 1u);
    } else if (bodies[idx].mass > 0.0) {
        atomicAdd(&solverState[SS_UNCOLORED], 1u);
        atomicAdd(&solverState[L.csBase + L.colorMetaOffset + 0u], 1u);
    }
}

@compute @workgroup_size(1)
fn prefixSumColors(@builtin(global_invocation_id) gid: vec3u) {
    let L = getLayout();
    var runningOffset = 0u;
    var usedColors = 0u;
    for (var c = 0u; c < MAX_COLORS; c++) {
        let count = atomicLoad(&solverState[L.csBase + L.colorMetaOffset + c]);
        atomicStore(&solverState[DEBUG_OFFSET + c], count);
        if (count > 0u) { usedColors++; }
        atomicStore(&solverState[L.csBase + L.colorMetaOffset + MAX_COLORS + c], runningOffset);
        atomicStore(&solverState[L.csBase + L.colorMetaOffset + c], runningOffset);
        runningOffset += count;
    }
    atomicStore(&solverState[L.csBase + L.colorMetaOffset + MAX_COLORS * 2u], runningOffset);
    atomicStore(&solverState[SS_USED_COLORS], usedColors);
}

@compute @workgroup_size(64)
fn sortBodiesByColor(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= params.bodyCount) { return; }
    let L = getLayout();
    var c = atomicLoad(&solverState[L.csBase + idx]);
    if (c >= MAX_COLORS && bodies[idx].mass > 0.0) {
        c = 0u;
    }
    if (c < MAX_COLORS) {
        let slot = atomicAdd(&solverState[L.csBase + L.colorMetaOffset + c], 1u);
        atomicStore(&solverState[L.csBase + L.sortedOffset + slot], idx);
    }
}
`, Uc = `
const MAX_COLORS: u32 = 12u;
const DEBUG_OFFSET: u32 = 8u;

@group(0) @binding(0) var<storage> solverState: array<u32>;
@group(0) @binding(1) var<storage, read_write> indirectDispatch: array<u32>;

@compute @workgroup_size(1)
fn main() {
    for (var c = 0u; c < MAX_COLORS; c++) {
        let count = solverState[DEBUG_OFFSET + c];
        let wg = (count + 63u) / 64u;
        indirectDispatch[c * 3u] = wg;
        indirectDispatch[c * 3u + 1u] = 1u;
        indirectDispatch[c * 3u + 2u] = 1u;
    }
    let constraintCount = solverState[0u];
    let constraintWG = (constraintCount + 63u) / 64u;
    indirectDispatch[MAX_COLORS * 3u] = constraintWG;
    indirectDispatch[MAX_COLORS * 3u + 1u] = 1u;
    indirectDispatch[MAX_COLORS * 3u + 2u] = 1u;
    var totalPairs = 0u;
    for (var t = 0u; t < 10u; t++) {
        let typeCount = solverState[${fc}u + t];
        totalPairs += typeCount;
        let typeWG = (typeCount + 63u) / 64u;
        let off = (MAX_COLORS + 1u + t) * 3u;
        indirectDispatch[off] = typeWG;
        indirectDispatch[off + 1u] = 1u;
        indirectDispatch[off + 2u] = 1u;
    }
}
`, Wc = `

${Cc}

@group(0) @binding(0) var<storage> bodies: array<Body>;
@group(0) @binding(1) var<storage, read_write> compact: array<f32>;
@group(0) @binding(2) var<uniform> bodyCount: u32;

@compute @workgroup_size(64)
fn readback(@builtin(global_invocation_id) gid: vec3u) {
    let i = gid.x;
    if (i >= bodyCount) { return; }
    let o = i * 7u;
    let pos = bodies[i].pos;
    let quat = bodies[i].quat;
    compact[o]     = pos.x;
    compact[o + 1u] = pos.y;
    compact[o + 2u] = pos.z;
    compact[o + 3u] = quat.x;
    compact[o + 4u] = quat.y;
    compact[o + 5u] = quat.z;
    compact[o + 6u] = quat.w;
}
`, Gc = `

${Cc}
${wc}

const SS_CONSTRAINT_COUNT: u32 = 0u;
const SS_CONTACT_COUNT: u32 = ${uc}u;
const SS_CONTACT_OVERFLOW: u32 = ${dc}u;
const MAX_CONTACTS: u32 = 128u;
const CONTACT_STRIDE: u32 = 9u;
const CONTACT_IMPULSE_THRESHOLD: f32 = 0.01;

@group(0) @binding(0) var<storage> bodies: array<Body>;
@group(0) @binding(1) var<storage> constraints: array<GPUConstraint>;
@group(0) @binding(2) var<storage, read_write> solverState: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> contacts: array<u32>;

@compute @workgroup_size(64)
fn emitContacts(@builtin(global_invocation_id) gid: vec3u) {
    let ci = gid.x;
    if (ci >= atomicLoad(&solverState[SS_CONSTRAINT_COUNT])) { return; }

    let c = constraints[ci];
    if (c.bilateral != CONSTRAINT_CONTACT && c.bilateral != CONSTRAINT_KINEMATIC) { return; }
    if (c.isNew == 0u) { return; }
    // lambda_n is negative in AVBD (clamped to [-1e30, 0]); negate for physical impulse
    let impulse = -c.lambda_n;
    if (impulse <= CONTACT_IMPULSE_THRESHOLD) { return; }

    let slot = atomicAdd(&solverState[SS_CONTACT_COUNT], 1u);
    if (slot >= MAX_CONTACTS) {
        atomicAdd(&solverState[SS_CONTACT_OVERFLOW], 1u);
        return;
    }
    let pos = bodies[c.bodyA].pos + c.rAW;
    let base = slot * CONTACT_STRIDE;
    contacts[base + 0u] = c.bodyA;
    contacts[base + 1u] = bitcast<u32>(c.bodyB);
    contacts[base + 2u] = bitcast<u32>(pos.x);
    contacts[base + 3u] = bitcast<u32>(pos.y);
    contacts[base + 4u] = bitcast<u32>(pos.z);
    contacts[base + 5u] = bitcast<u32>(c.normal.x);
    contacts[base + 6u] = bitcast<u32>(c.normal.y);
    contacts[base + 7u] = bitcast<u32>(c.normal.z);
    contacts[base + 8u] = bitcast<u32>(impulse);
}
`, Kc = `

${Cc}

const SHAPE_BOX: f32 = 0.0;
const SHAPE_SPHERE: f32 = 1.0;
const SHAPE_CAPSULE: f32 = 2.0;
const SHAPE_HULL: f32 = 3.0;
struct PackParams {
    bodyCount: u32,
    section: u32,
    offset: u32,
}

@group(0) @binding(0) var<storage> sizes: array<f32>;
@group(0) @binding(1) var<storage> shapes: array<u32>;
@group(0) @binding(2) var<storage> bodyProps: array<f32>;
@group(0) @binding(3) var<storage> eids: array<u32>;
@group(0) @binding(4) var<storage, read_write> bodies: array<Body>;
@group(0) @binding(5) var<uniform> packParams: PackParams;
@group(0) @binding(6) var<storage> transform: array<f32>;
@group(0) @binding(7) var<storage> hullIds: array<u32>;

@compute @workgroup_size(64)
fn packBodies(@builtin(global_invocation_id) gid: vec3u) {
    let i = gid.x;
    if (i >= packParams.bodyCount) { return; }

    let eid = eids[i];
    let S = packParams.section;

    let sizeOff = eid * 4u;
    let hx = sizes[sizeOff] / 2.0;
    let hy = sizes[sizeOff + 1u] / 2.0;
    let hz = sizes[sizeOff + 2u] / 2.0;
    let shapeRadius = hx;
    let boundingRadius = length(vec3f(hx, hy, hz));

    let shapeByte = (shapes[eid / 4u] >> ((eid % 4u) * 8u)) & 0xFFu;
    let isSphere = shapeByte == 1u;
    let isCapsule = shapeByte == 2u;
    let isHull = shapeByte == 255u;
    let isBox = !isSphere && !isCapsule && !isHull;

    let propsOff = eid * 4u;
    let m = bodyProps[propsOff];
    let fric = bodyProps[propsOff + 1u];
    let grav = bodyProps[propsOff + 2u];
    let group = u32(bodyProps[propsOff + 3u]);

    var momentX: f32;
    var momentY: f32;
    var momentZ: f32;
    if (isBox || isHull) {
        momentX = (m / 3.0) * (hy * hy + hz * hz);
        momentY = (m / 3.0) * (hx * hx + hz * hz);
        momentZ = (m / 3.0) * (hx * hx + hy * hy);
    } else if (isCapsule) {
        let r = shapeRadius;
        let h = 2.0 * hy;
        let cylVol = h;
        let sphVol = 4.0 * r / 3.0;
        let totalVol = cylVol + sphVol;
        let mCyl = m * cylVol / max(totalVol, 1e-12);
        let mHs = m * sphVol * 0.5 / max(totalVol, 1e-12);
        momentY = 0.5 * mCyl * r * r + 0.8 * mHs * r * r;
        momentX = mCyl * (3.0 * r * r + h * h) / 12.0
                + 2.0 * mHs * (0.4 * r * r + h * h / 4.0 + 0.375 * h * r);
        momentZ = momentX;
    } else {
        let r = shapeRadius;
        let I = (2.0 / 5.0) * m * r * r;
        momentX = I;
        momentY = I;
        momentZ = I;
    }

    var colliderType = SHAPE_BOX;
    if (isSphere) { colliderType = SHAPE_SPHERE; }
    else if (isCapsule) { colliderType = SHAPE_CAPSULE; }
    else if (isHull) { colliderType = SHAPE_HULL; }

    let radius = select(boundingRadius, shapeRadius, isSphere || isCapsule);
    let halfExtents = vec3f(hx, hy, hz);
    let hullId = select(0u, hullIds[i], isHull);

    if (i >= packParams.offset) {
        // New body — full initialization.
        var body: Body;
        body.pos = vec3f(transform[eid], transform[eid + S], transform[eid + S * 2u]);
        body.mass = m;
        body.vel = vec3f(0.0);
        body.momentX = momentX;
        body.angVel = vec3f(0.0);
        body.radius = radius;
        body.inertial = vec3f(0.0);
        body.friction = fric;
        body.initial = vec3f(0.0);
        body.hullId = hullId;
        body.quat = vec4f(
            transform[eid + S * 3u],
            transform[eid + S * 4u],
            transform[eid + S * 5u],
            transform[eid + S * 6u]
        );
        body.inertialQuat = vec4f(0.0, 0.0, 0.0, 1.0);
        body.initialQuat = vec4f(0.0, 0.0, 0.0, 1.0);
        body.prevVel = vec3f(0.0);
        body.momentY = momentY;
        body.prevAngVel = vec3f(0.0);
        body.momentZ = momentZ;
        body.cumAng = vec3f(0.0);
        body.gravity = grav;
        body.halfExtents = halfExtents;
        body.colliderType = colliderType;
        body.collisionGroup = group;
        body.moved = 0.0;
        body._pad50 = 0.0;
        body._pad51 = 0.0;
        bodies[i] = body;
        return;
    }

    // Existing body — refresh shape-derived fields without disturbing dynamic state.
    bodies[i].mass = m;
    bodies[i].momentX = momentX;
    bodies[i].radius = radius;
    bodies[i].friction = fric;
    bodies[i].hullId = hullId;
    bodies[i].momentY = momentY;
    bodies[i].momentZ = momentZ;
    bodies[i].gravity = grav;
    bodies[i].halfExtents = halfExtents;
    bodies[i].colliderType = colliderType;
    bodies[i].collisionGroup = group;
}
`, qc = `

${wc}

struct RebuildParams {
    prevConstraintCount: u32,
    hashCapacity: u32,
    _pad0: u32,
    _pad1: u32,
}

const HASH_EMPTY: u32 = 0xFFFFFFFFu;
const MAX_PROBE: u32 = 128u;
const PENALTY_MIN: f32 = 1.0;
const PENALTY_MAX: f32 = 1e10;
const FEATURE_KEY_NONE: u32 = 0xFFFFFFFFu;

@group(0) @binding(0) var<storage, read_write> hashKeys: array<atomic<u32>>;
@group(0) @binding(1) var<storage, read_write> warmstarts: array<WarmstartEntry>;
@group(0) @binding(2) var<storage, read> prevConstraints: array<GPUConstraint>;
@group(0) @binding(3) var<uniform> rebuildParams: RebuildParams;

fn defaultWarmstart() -> WarmstartEntry {
    return WarmstartEntry(0.0, PENALTY_MIN, 0.0, PENALTY_MIN, 0.0, PENALTY_MIN, 0u, FEATURE_KEY_NONE, vec3f(0.0), 0.0, vec3f(0.0), 0.0);
}

fn hashKey(k: u32) -> u32 {
    var h = k;
    h ^= h >> 16u;
    h *= 0x85ebca6bu;
    h ^= h >> 13u;
    h *= 0xc2b2ae35u;
    h ^= h >> 16u;
    return h;
}

fn hashInsert(key: u32) -> u32 {
    let hCap = rebuildParams.hashCapacity;
    let mask = hCap - 1u;
    var slot = hashKey(key) & mask;
    for (var p = 0u; p < MAX_PROBE; p++) {
        let idx = (slot + p) & mask;
        let old = atomicCompareExchangeWeak(&hashKeys[idx], HASH_EMPTY, key);
        if (old.exchanged || old.old_value == key) { return idx; }
    }
    return hCap;
}

@compute @workgroup_size(64)
fn clearHash(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= rebuildParams.hashCapacity) { return; }
    atomicStore(&hashKeys[idx], HASH_EMPTY);
    warmstarts[idx] = defaultWarmstart();
}

@compute @workgroup_size(64)
fn rebuildWarm(@builtin(global_invocation_id) gid: vec3u) {
    let ci = gid.x;
    if (ci >= rebuildParams.prevConstraintCount) { return; }

    let c = prevConstraints[ci];
    let slot = hashInsert(c.warmstartIdx);
    if (slot >= rebuildParams.hashCapacity) { return; }

    let ws = WarmstartEntry(
        c.lambda_n, c.penalty_n,
        c.lambda_t1, c.penalty_t1,
        c.lambda_t2, c.penalty_t2,
        c.stick, c.featureKey,
        c.rA, 0.0,
        c.rB, 0.0,
    );
    warmstarts[slot] = ws;
}

`, Jc = `

${Cc}

struct SyncParams {
    bodyCount: u32,
    section: u32,
}

@group(0) @binding(0) var<storage, read_write> bodies: array<Body>;
@group(0) @binding(1) var<storage> eids: array<u32>;
@group(0) @binding(2) var<storage> transform: array<f32>;
@group(0) @binding(3) var<uniform> params: SyncParams;

@compute @workgroup_size(64)
fn syncTransforms(@builtin(global_invocation_id) gid: vec3u) {
    let i = gid.x;
    if (i >= params.bodyCount) { return; }
    if (bodies[i].mass > 0.0) { return; }

    let eid = eids[i];
    let S = params.section;
    let newPos = vec3f(
        transform[eid],
        transform[eid + S],
        transform[eid + S * 2u]
    );
    let moveFlag = transform[eid + S * 7u];
    if (moveFlag > 0.5) {
        let diff = newPos - bodies[i].pos;
        bodies[i].moved = select(0.0, 1.0, dot(diff, diff) > 1e-10);
        bodies[i].vel = diff;
    } else {
        bodies[i].moved = 0.0;
        bodies[i].vel = vec3f(0.0);
    }
    bodies[i].pos = newPos;
    bodies[i].quat = vec4f(
        transform[eid + S * 3u],
        transform[eid + S * 4u],
        transform[eid + S * 5u],
        transform[eid + S * 6u]
    );
}
`, Yc = "\nstruct InterpParams {\n    alpha: f32,\n    bodyCount: u32,\n}\n\n@group(0) @binding(0) var<storage, read> prevBodies: array<f32>;\n@group(0) @binding(1) var<storage, read> currentBodies: array<f32>;\n@group(0) @binding(2) var<storage, read> bodyEids: array<u32>;\n@group(0) @binding(3) var<uniform> params: InterpParams;\n@group(0) @binding(4) var<storage, read_write> matrices: array<f32>;\n\nconst BODY_STRIDE: u32 = 52u;\nconst QUAT_OFFSET: u32 = 20u;\n\nfn quatToMat(qx: f32, qy: f32, qz: f32, qw: f32) -> array<f32, 9> {\n    let x2 = qx + qx;\n    let y2 = qy + qy;\n    let z2 = qz + qz;\n    let xx = qx * x2;\n    let xy = qx * y2;\n    let xz = qx * z2;\n    let yy = qy * y2;\n    let yz = qy * z2;\n    let zz = qz * z2;\n    let wx = qw * x2;\n    let wy = qw * y2;\n    let wz = qw * z2;\n    return array<f32, 9>(\n        1.0 - yy - zz, xy + wz, xz - wy,\n        xy - wz, 1.0 - xx - zz, yz + wx,\n        xz + wy, yz - wx, 1.0 - xx - yy,\n    );\n}\n\n@compute @workgroup_size(64)\nfn interpolate(@builtin(global_invocation_id) gid: vec3u) {\n    let i = gid.x;\n    if (i >= params.bodyCount) { return; }\n\n    let alpha = params.alpha;\n    let off = i * BODY_STRIDE;\n\n    let px = mix(prevBodies[off], currentBodies[off], alpha);\n    let py = mix(prevBodies[off + 1u], currentBodies[off + 1u], alpha);\n    let pz = mix(prevBodies[off + 2u], currentBodies[off + 2u], alpha);\n\n    let qOff = off + QUAT_OFFSET;\n    let pqx = prevBodies[qOff];\n    let pqy = prevBodies[qOff + 1u];\n    let pqz = prevBodies[qOff + 2u];\n    let pqw = prevBodies[qOff + 3u];\n    let cqx = currentBodies[qOff];\n    let cqy = currentBodies[qOff + 1u];\n    let cqz = currentBodies[qOff + 2u];\n    let cqw = currentBodies[qOff + 3u];\n    let qdot = pqx * cqx + pqy * cqy + pqz * cqz + pqw * cqw;\n    let flip = select(1.0, -1.0, qdot < 0.0);\n    var qx = mix(pqx * flip, cqx, alpha);\n    var qy = mix(pqy * flip, cqy, alpha);\n    var qz = mix(pqz * flip, cqz, alpha);\n    var qw = mix(pqw * flip, cqw, alpha);\n\n    let qLen = sqrt(qx * qx + qy * qy + qz * qz + qw * qw);\n    if (qLen > 1e-12) {\n        let invLen = 1.0 / qLen;\n        qx *= invLen;\n        qy *= invLen;\n        qz *= invLen;\n        qw *= invLen;\n    } else {\n        qx = 0.0;\n        qy = 0.0;\n        qz = 0.0;\n        qw = 1.0;\n    }\n\n    let rot = quatToMat(qx, qy, qz, qw);\n\n    let eid = bodyEids[i];\n    let mOff = eid * 16u;\n    matrices[mOff]      = rot[0];\n    matrices[mOff + 1u] = rot[1];\n    matrices[mOff + 2u] = rot[2];\n    matrices[mOff + 3u] = 0.0;\n    matrices[mOff + 4u] = rot[3];\n    matrices[mOff + 5u] = rot[4];\n    matrices[mOff + 6u] = rot[5];\n    matrices[mOff + 7u] = 0.0;\n    matrices[mOff + 8u] = rot[6];\n    matrices[mOff + 9u] = rot[7];\n    matrices[mOff + 10u] = rot[8];\n    matrices[mOff + 11u] = 0.0;\n    matrices[mOff + 12u] = px;\n    matrices[mOff + 13u] = py;\n    matrices[mOff + 14u] = pz;\n    matrices[mOff + 15u] = 1.0;\n}\n", Xc = "\nstruct CharacterData {\n    maxSlope: f32,\n    grounded: u32,\n    moveX: f32,\n    moveY: f32,\n    moveZ: f32,\n    mass: f32,\n    _pad1: f32,\n    _pad2: f32,\n}\n\nstruct CharacterParams {\n    count: u32,\n}\n", Zc = `
${Cc}
${Xc}

struct TreeNode {
    minX: f32,
    minY: f32,
    minZ: f32,
    leftChild: u32,
    maxX: f32,
    maxY: f32,
    maxZ: f32,
    rightChild: u32,
}

struct LeafAABB {
    minX: f32, minY: f32, minZ: f32, _pad0: u32,
    maxX: f32, maxY: f32, maxZ: f32, _pad1: u32,
}

const LEAF_FLAG: u32 = 0x80000000u;
const SHAPE_BOX: f32 = 0.0;
const SHAPE_SPHERE: f32 = 1.0;
const SHAPE_CAPSULE: f32 = 2.0;
const COLLISION_MARGIN: f32 = 0.01;
const MAX_SWEEP_ITERS: u32 = 4u;
const MAX_NEARBY: u32 = 32u;
const GATHER_EXPAND: f32 = 0.1;

@group(0) @binding(0) var<storage, read_write> bodies: array<Body>;
@group(0) @binding(1) var<storage, read> treeNodes: array<TreeNode>;
@group(0) @binding(2) var<storage, read> sortedBodyIds: array<u32>;
@group(0) @binding(3) var<storage, read> leafAABBs: array<LeafAABB>;
@group(0) @binding(4) var<storage, read_write> charData: array<CharacterData>;
@group(0) @binding(5) var<storage, read> charIndices: array<u32>;
@group(0) @binding(6) var<uniform> charParams: CharacterParams;
@group(0) @binding(7) var<storage, read_write> charGroundIdx: array<u32>;

fn quatRotate(q: vec4f, v: vec3f) -> vec3f {
    let u = q.xyz;
    let t = 2.0 * cross(u, v);
    return v + q.w * t + cross(u, t);
}

fn quatConj(q: vec4f) -> vec4f {
    return vec4f(-q.x, -q.y, -q.z, q.w);
}

fn aabbOverlap(minA: vec3f, maxA: vec3f, minB: vec3f, maxB: vec3f) -> bool {
    return minA.x <= maxB.x && maxA.x >= minB.x
        && minA.y <= maxB.y && maxA.y >= minB.y
        && minA.z <= maxB.z && maxA.z >= minB.z;
}

struct Contact {
    normal: vec3f,
    depth: f32,
}

fn closestPointOnSegment(p: vec3f, a: vec3f, b: vec3f) -> vec3f {
    let ab = b - a;
    let ab2 = dot(ab, ab);
    if (ab2 < 1e-12) { return a; }
    let t = clamp(dot(p - a, ab) / ab2, 0.0, 1.0);
    return a + ab * t;
}

fn satAxis(charPos: vec3f, charH: vec3f, boxPos: vec3f, bx: vec3f, by: vec3f, bz: vec3f, boxH: vec3f, axis: vec3f) -> f32 {
    let projC = abs(axis.x) * charH.x + abs(axis.y) * charH.y + abs(axis.z) * charH.z;
    let projB = abs(dot(bx, axis)) * boxH.x + abs(dot(by, axis)) * boxH.y + abs(dot(bz, axis)) * boxH.z;
    let dist = abs(dot(boxPos - charPos, axis));
    return projC + projB - dist;
}

fn aabbVsOBB(charPos: vec3f, charH: vec3f, other: Body) -> Contact {
    let d = other.pos - charPos;
    let bx = quatRotate(other.quat, vec3f(1.0, 0.0, 0.0));
    let by = quatRotate(other.quat, vec3f(0.0, 1.0, 0.0));
    let bz = quatRotate(other.quat, vec3f(0.0, 0.0, 1.0));
    let bh = other.halfExtents;

    var bestDepth = 1e30;
    var bestNormal = vec3f(0.0);

    let axes = array<vec3f, 6>(
        vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0),
        bx, by, bz,
    );

    for (var i = 0u; i < 6u; i++) {
        let axis = axes[i];
        let overlap = satAxis(charPos, charH, other.pos, bx, by, bz, bh, axis);
        if (overlap <= 0.0) { return Contact(vec3f(0.0), 0.0); }
        if (overlap < bestDepth) {
            bestDepth = overlap;
            bestNormal = select(-axis, axis, dot(d, axis) < 0.0);
        }
    }

    return Contact(bestNormal, bestDepth);
}

fn aabbVsSphere(charPos: vec3f, charH: vec3f, other: Body) -> Contact {
    let sphR = other.halfExtents.x;
    let d = other.pos - charPos;
    let closest = clamp(d, -charH, charH);
    let diff = d - closest;
    let dist2 = dot(diff, diff);

    if (dist2 > (sphR + COLLISION_MARGIN) * (sphR + COLLISION_MARGIN) && dist2 > 1e-16) {
        return Contact(vec3f(0.0), 0.0);
    }

    let absD = abs(d);
    let inside = absD.x <= charH.x && absD.y <= charH.y && absD.z <= charH.z;

    if (!inside && dist2 > 1e-16) {
        let dist = sqrt(dist2);
        let gap = dist - sphR;
        if (gap > COLLISION_MARGIN) { return Contact(vec3f(0.0), 0.0); }
        let normal = -diff / dist;
        return Contact(normal, sphR - dist);
    }

    let face = charH - absD;
    var minAxis = 0u;
    var minVal = face.x;
    if (face.y < minVal) { minAxis = 1u; minVal = face.y; }
    if (face.z < minVal) { minAxis = 2u; minVal = face.z; }
    var normal = vec3f(0.0);
    if (minAxis == 0u) {
        normal.x = select(1.0, -1.0, d.x >= 0.0);
    } else if (minAxis == 1u) {
        normal.y = select(1.0, -1.0, d.y >= 0.0);
    } else {
        normal.z = select(1.0, -1.0, d.z >= 0.0);
    }
    return Contact(normal, minVal + sphR);
}

fn aabbVsCapsule(charPos: vec3f, charH: vec3f, other: Body) -> Contact {
    let capAxis = quatRotate(other.quat, vec3f(0.0, other.halfExtents.y, 0.0));
    let capR = other.halfExtents.x;
    let epA = other.pos + capAxis;
    let epB = other.pos - capAxis;

    let closest = closestPointOnSegment(charPos, epA, epB);
    let d = closest - charPos;
    let clamped = clamp(d, -charH, charH);
    let diff = d - clamped;
    let dist2 = dot(diff, diff);

    let absD = abs(d);
    let inside = absD.x <= charH.x && absD.y <= charH.y && absD.z <= charH.z;

    if (!inside && dist2 > 1e-16) {
        let dist = sqrt(dist2);
        if (dist - capR > COLLISION_MARGIN) { return Contact(vec3f(0.0), 0.0); }
        let normal = -diff / dist;
        return Contact(normal, capR - dist);
    }

    let face = charH - absD;
    var minAxis = 0u;
    var minVal = face.x;
    if (face.y < minVal) { minAxis = 1u; minVal = face.y; }
    if (face.z < minVal) { minAxis = 2u; minVal = face.z; }
    var normal = vec3f(0.0);
    if (minAxis == 0u) {
        normal.x = select(1.0, -1.0, d.x >= 0.0);
    } else if (minAxis == 1u) {
        normal.y = select(1.0, -1.0, d.y >= 0.0);
    } else {
        normal.z = select(1.0, -1.0, d.z >= 0.0);
    }
    return Contact(normal, minVal + capR);
}


fn testBody(charPos: vec3f, charH: vec3f, other: Body) -> Contact {
    if (other.colliderType == SHAPE_BOX) {
        return aabbVsOBB(charPos, charH, other);
    }
    if (other.colliderType == SHAPE_SPHERE) {
        return aabbVsSphere(charPos, charH, other);
    }
    if (other.colliderType == SHAPE_CAPSULE) {
        return aabbVsCapsule(charPos, charH, other);
    }
    return Contact(vec3f(0.0), 0.0);
}

@compute @workgroup_size(64)
fn characterSweep(@builtin(global_invocation_id) gid: vec3u) {
    let charIdx = gid.x;
    if (charIdx >= charParams.count) { return; }

    let bodyIdx = charIndices[charIdx];
    let body = bodies[bodyIdx];
    let cd = charData[charIdx];
    var pos = body.pos;
    let charH = body.halfExtents;
    let maxSlopeCos = cd.maxSlope;

    var nearby: array<u32, 32>;
    var nearbyCount: u32 = 0u;

    let gatherMargin = vec3f(COLLISION_MARGIN + GATHER_EXPAND);
    let gatherMin = pos - charH - gatherMargin;
    let gatherMax = pos + charH + gatherMargin;

    var stack: array<u32, 64>;
    var stackPtr: u32 = 0u;
    let root = treeNodes[0];

    for (var side = 0u; side < 2u; side++) {
        let child = select(root.rightChild, root.leftChild, side == 0u);
        if ((child & LEAF_FLAG) != 0u) {
            let oi = sortedBodyIds[child & ~LEAF_FLAG];
            if (oi != bodyIdx) {
                let la = leafAABBs[oi];
                if (aabbOverlap(gatherMin, gatherMax, vec3f(la.minX, la.minY, la.minZ), vec3f(la.maxX, la.maxY, la.maxZ))) {
                    if (nearbyCount < MAX_NEARBY) { nearby[nearbyCount] = oi; nearbyCount += 1u; }
                }
            }
        } else {
            let n = treeNodes[child];
            if (aabbOverlap(gatherMin, gatherMax, vec3f(n.minX, n.minY, n.minZ), vec3f(n.maxX, n.maxY, n.maxZ))) {
                stack[stackPtr] = child;
                stackPtr += 1u;
            }
        }
    }

    while (stackPtr > 0u) {
        stackPtr -= 1u;
        let node = treeNodes[stack[stackPtr]];

        for (var side = 0u; side < 2u; side++) {
            let child = select(node.rightChild, node.leftChild, side == 0u);
            if ((child & LEAF_FLAG) != 0u) {
                let oi = sortedBodyIds[child & ~LEAF_FLAG];
                if (oi != bodyIdx) {
                    let la = leafAABBs[oi];
                    if (aabbOverlap(gatherMin, gatherMax, vec3f(la.minX, la.minY, la.minZ), vec3f(la.maxX, la.maxY, la.maxZ))) {
                        if (nearbyCount < MAX_NEARBY) { nearby[nearbyCount] = oi; nearbyCount += 1u; }
                    }
                }
            } else {
                let n = treeNodes[child];
                if (aabbOverlap(gatherMin, gatherMax, vec3f(n.minX, n.minY, n.minZ), vec3f(n.maxX, n.maxY, n.maxZ))) {
                    if (stackPtr < 64u) { stack[stackPtr] = child; stackPtr += 1u; }
                }
            }
        }
    }

    var grounded = false;
    var groundBodyIdx = 0xFFFFFFFFu;

    for (var iter = 0u; iter < MAX_SWEEP_ITERS; iter++) {
        var bestNormal = vec3f(0.0);
        var bestDepth: f32 = 0.0;

        for (var ni = 0u; ni < nearbyCount; ni++) {
            let oi = nearby[ni];
            let c = testBody(pos, charH, bodies[oi]);
            if (c.depth > bestDepth) { bestDepth = c.depth; bestNormal = c.normal; }
            if (c.depth > 0.0 && c.normal.y > maxSlopeCos) { grounded = true; groundBodyIdx = oi; }
        }

        if (bestDepth <= 0.0) { break; }
        pos += bestNormal * bestDepth;
    }

    bodies[bodyIdx].pos = pos;
    charData[charIdx].grounded = select(0u, 1u, grounded);
    charGroundIdx[charIdx] = groundBodyIdx;
}
`, Qc = `
${Cc}
${Xc}

@group(0) @binding(0) var<storage, read_write> bodies: array<Body>;
@group(0) @binding(4) var<storage, read_write> charData: array<CharacterData>;
@group(0) @binding(5) var<storage, read> charIndices: array<u32>;
@group(0) @binding(6) var<uniform> charParams: CharacterParams;
@group(0) @binding(7) var<storage, read_write> charGroundIdx: array<u32>;

@compute @workgroup_size(64)
fn characterApply(@builtin(global_invocation_id) gid: vec3u) {
    let charIdx = gid.x;
    if (charIdx >= charParams.count) { return; }
    let bodyIdx = charIndices[charIdx];
    let cd = charData[charIdx];
    var charMove = vec3f(cd.moveX, cd.moveY, cd.moveZ);
    let groundIdx = charGroundIdx[charIdx];
    if (groundIdx != 0xFFFFFFFFu && bodies[groundIdx].mass <= 0.0) {
        charMove += bodies[groundIdx].vel;
    }
    bodies[bodyIdx].pos += charMove;
    bodies[bodyIdx].vel = charMove;
    if (dot(charMove, charMove) > 1e-10) {
        bodies[bodyIdx].moved = 1.0;
    }
}
`, $c = `
${Tc}
${kc}

@group(1) @binding(0) var<storage, read_write> pairs: array<u32>;

fn isJointed(a: u32, b: u32) -> bool {
    for (var ji = 0u; ji < params.jointCount; ji++) {
        let j = joints[ji];
        if ((j.bodyA == a && j.bodyB == b) || (j.bodyA == b && j.bodyB == a)) {
            return true;
        }
    }
    return false;
}

fn aabbOverlap(minA: vec3f, maxA: vec3f, minB: vec3f, maxB: vec3f) -> bool {
    return minA.x <= maxB.x && maxA.x >= minB.x
        && minA.y <= maxB.y && maxA.y >= minB.y
        && minA.z <= maxB.z && maxA.z >= minB.z;
}

const PAIR_TYPE_LUT = array<u32, 16>(
    0u, 1u, 2u, 6u,
    0u, 3u, 4u, 7u,
    0u, 0u, 5u, 8u,
    0u, 0u, 0u, 9u,
);

fn emitPair(a: u32, b: u32) {
    let itA = u32(bodies[a].colliderType);
    let itB = u32(bodies[b].colliderType);
    let lo = min(itA, itB);
    let hi = max(itA, itB);
    let pairType = PAIR_TYPE_LUT[lo * 4u + hi];

    var first: u32;
    var second: u32;
    if (lo == hi) {
        first = min(a, b);
        second = max(a, b);
    } else if (itA > itB) {
        first = a;
        second = b;
    } else {
        first = b;
        second = a;
    }

    let maxPerType = params.capacity * params.constraintMul;
    let pi = atomicAdd(&solverState[SS_PAIR_TYPE_BASE + pairType], 1u);
    if (pi >= maxPerType) { return; }
    let base = pairType * maxPerType;
    pairs[(base + pi) * 2u] = first;
    pairs[(base + pi) * 2u + 1u] = second;
}

fn testBinaryChild(
    child: u32,
    myMin: vec3f, myMax: vec3f,
    idx: u32,
    stack: ptr<function, array<u32, 64>>,
    stackPtr: ptr<function, u32>,
) {
    if ((child & LEAF_FLAG) != 0u) {
        let leafIdx = child & ~LEAF_FLAG;
        let otherIdx = sortedBodyIds[leafIdx];
        if (otherIdx == idx) { return; }
        if (bodies[otherIdx].mass > 0.0 && idx >= otherIdx) { return; }
        let la = leafAABBs[otherIdx];
        if (aabbOverlap(myMin, myMax, vec3f(la.minX, la.minY, la.minZ), vec3f(la.maxX, la.maxY, la.maxZ))) {
            if (isJointed(idx, otherIdx)) { return; }
            let groupA = bodies[idx].collisionGroup;
            let groupB = bodies[otherIdx].collisionGroup;
            if (groupA != 0u && groupA == groupB) { return; }
            emitPair(idx, otherIdx);
        }
    } else {
        let node = treeNodes[child];
        let nodeMin = vec3f(node.minX, node.minY, node.minZ);
        let nodeMax = vec3f(node.maxX, node.maxY, node.maxZ);
        if (aabbOverlap(myMin, myMax, nodeMin, nodeMax)) {
            if (*stackPtr < 64u) {
                (*stack)[*stackPtr] = child;
                *stackPtr += 1u;
            } else {
                atomicAdd(&solverState[SS_STACK_OVERFLOW], 1u);
            }
        }
    }
}

@compute @workgroup_size(64)
fn broadphase(@builtin(global_invocation_id) gid: vec3u) {
    if (gid.x >= params.bodyCount) { return; }

    let idx = sortedBodyIds[gid.x];
    if (bodies[idx].mass <= 0.0) { return; }

    let la = leafAABBs[idx];
    let myMin = vec3f(la.minX, la.minY, la.minZ);
    let myMax = vec3f(la.maxX, la.maxY, la.maxZ);

    if (idx == 0u) {
        let root = treeNodes[0];
        atomicStore(&solverState[DEBUG_BROADPHASE + 0u], 0xBEEFu);
        atomicStore(&solverState[DEBUG_BROADPHASE + 1u], params.bodyCount);
        atomicStore(&solverState[DEBUG_BROADPHASE + 2u], bitcast<u32>(root.minX));
        atomicStore(&solverState[DEBUG_BROADPHASE + 3u], bitcast<u32>(root.minY));
        atomicStore(&solverState[DEBUG_BROADPHASE + 4u], bitcast<u32>(root.minZ));
        atomicStore(&solverState[DEBUG_BROADPHASE + 5u], bitcast<u32>(root.maxX));
        atomicStore(&solverState[DEBUG_BROADPHASE + 6u], bitcast<u32>(root.maxY));
        atomicStore(&solverState[DEBUG_BROADPHASE + 7u], bitcast<u32>(root.maxZ));
        atomicStore(&solverState[DEBUG_BROADPHASE + 8u], root.leftChild);
        atomicStore(&solverState[DEBUG_BROADPHASE + 9u], root.rightChild);
    }

    var stack: array<u32, 64>;
    var stackPtr: u32 = 0u;

    let root = treeNodes[0];
    testBinaryChild(root.leftChild, myMin, myMax, idx, &stack, &stackPtr);
    testBinaryChild(root.rightChild, myMin, myMax, idx, &stack, &stackPtr);

    while (stackPtr > 0u) {
        stackPtr -= 1u;
        let nodeIdx = stack[stackPtr];
        let node = treeNodes[nodeIdx];
        testBinaryChild(node.leftChild, myMin, myMax, idx, &stack, &stackPtr);
        testBinaryChild(node.rightChild, myMin, myMax, idx, &stack, &stackPtr);
    }
}
`, el = `
${Tc}
${Oc}
${Lc}
${zc}

fn quatConj(q: vec4f) -> vec4f {
    return vec4f(-q.x, -q.y, -q.z, q.w);
}

fn contactCInit(posA: vec3f, rA: vec3f, posB: vec3f, rB: vec3f, n: vec3f, t1: vec3f, t2: vec3f) -> vec3f {
    let cpSep = (posA + rA) - (posB + rB);
    return vec3f(
        dot(n, cpSep) + COLLISION_MARGIN,
        dot(t1, cpSep),
        dot(t2, cpSep),
    );
}

@group(1) @binding(0) var<storage, read_write> pairs: array<u32>;

fn loadWarmstartSearchingHash(bodyA: u32, bodyB: u32, featureKey: u32) -> WarmstartEntry {
    let hCap = params.capacity * params.hashMul;
    for (var s = 0u; s < MAX_PAIR_CONTACTS; s++) {
        let key = packKey(bodyA, bodyB, s);
        let idx = hashLookup(key);
        if (idx < hCap) {
            let ws = warmstarts[idx];
            if (ws.featureKey == featureKey) {
                if (isNanOrInf(ws.lambda_n) || isNanOrInf(ws.penalty_n) ||
                    isNanOrInf(ws.lambda_t1) || isNanOrInf(ws.penalty_t1) ||
                    isNanOrInf(ws.lambda_t2) || isNanOrInf(ws.penalty_t2)) {
                    atomicAdd(&solverState[SS_WARMSTART_NAN], 1u);
                    return defaultWarmstart();
                }
                if (ws.penalty_n > PENALTY_MIN) {
                    atomicAdd(&solverState[SS_WARMSTART_LOADED], 1u);
                }
                return ws;
            }
        }
    }
    return defaultWarmstart();
}

fn resetWarmstartHash(key: u32) {
    let hCap = params.capacity * params.hashMul;
    let idx = hashLookup(key);
    if (idx < hCap) {
        atomicStore(&solverState[HASH_BASE + idx], HASH_EMPTY);
        warmstarts[idx] = defaultWarmstart();
    }
}

fn pushConstraintSearching(
    bodyA: u32, bodyB: i32, featureKey: u32,
    normal: vec3f, C_init_n: f32,
    tangent1: vec3f, C_init_t1: f32,
    tangent2: vec3f, C_init_t2: f32,
    rA: vec3f, rB: vec3f,
    friction: f32,
    wsKey: u32, wsBodyA: u32, wsBodyB: u32, bilateral: u32,
    fmin_n: f32, fmax_n: f32, cStiffness: f32,
) {
    var bi = bilateral;
    var ct1 = C_init_t1;
    var ct2 = C_init_t2;
    if (bi == CONSTRAINT_CONTACT) {
        let movedA = bodies[bodyA].mass <= 0.0 && bodies[bodyA].moved > 0.5;
        let movedB = bodies[u32(bodyB)].mass <= 0.0 && bodies[u32(bodyB)].moved > 0.5;
        if (movedA || movedB) {
            bi = CONSTRAINT_KINEMATIC;
            if (movedA) {
                ct1 += dot(tangent1, bodies[bodyA].vel);
                ct2 += dot(tangent2, bodies[bodyA].vel);
            }
            if (movedB) {
                ct1 -= dot(tangent1, bodies[u32(bodyB)].vel);
                ct2 -= dot(tangent2, bodies[u32(bodyB)].vel);
            }
        }
    }
    let ws = loadWarmstartSearchingHash(wsBodyA, wsBodyB, featureKey);
    pushConstraintWithWarmstart(bodyA, bodyB, featureKey, normal, C_init_n, tangent1, ct1, tangent2, ct2, rA, rB, friction, wsKey, bi, fmin_n, fmax_n, cStiffness, ws);
}

`, tl = "\nfn emitSingleContact(\n    ai: u32, bi: u32,\n    normal: vec3f, rA_w: vec3f, rB_w: vec3f,\n    posA: vec3f, quatA: vec4f, posB: vec3f, quatB: vec4f,\n    fricA: f32, fricB: f32, fkey: u32,\n) {\n    let lo = min(ai, bi);\n    let hi = max(ai, bi);\n    let aIsLo = ai < bi;\n\n    let n = select(-normal, normal, aIsLo);\n    let tb = tangentBasis(n);\n    let mu = sqrt(fricA * fricB);\n\n    let rAl = quatRotate(quatConj(quatA), rA_w);\n    let rBl = quatRotate(quatConj(quatB), rB_w);\n\n    let posLo = select(posB, posA, aIsLo);\n    let posHi = select(posA, posB, aIsLo);\n    let rLo_local = select(rBl, rAl, aIsLo);\n    let rHi_local = select(rAl, rBl, aIsLo);\n    let rLo_w = select(rB_w, rA_w, aIsLo);\n    let rHi_w = select(rA_w, rB_w, aIsLo);\n\n    let ci = contactCInit(posLo, rLo_w, posHi, rHi_w, n, tb[0], tb[1]);\n\n    let wsKey = packKey(lo, hi, 0u);\n    pushConstraintSearching(\n        lo, i32(hi), fkey,\n        n, ci.x,\n        tb[0], ci.y,\n        tb[1], ci.z,\n        rLo_local, rHi_local,\n        mu,\n        wsKey, lo, hi, 0u,\n        -1e30, 0.0, 1e30,\n    );\n    for (var s = 1u; s < MAX_PAIR_CONTACTS; s++) {\n        resetWarmstartHash(packKey(lo, hi, s));\n    }\n}\n", nl = "\nconst MAX_CANDIDATES: u32 = 32u;\n\nstruct ManifoldCandidate {\n    pointA: vec3f,\n    pointB: vec3f,\n    depth: f32,\n    clipTag: u32,\n}\n\nfn reduceManifold(\n    candidates: ptr<function, array<ManifoldCandidate, MAX_CANDIDATES>>,\n    count: u32,\n    normal: vec3f,\n    out: ptr<function, array<u32, 4>>,\n) -> u32 {\n    if (count <= 4u) {\n        for (var i = 0u; i < count; i++) { (*out)[i] = i; }\n        return count;\n    }\n\n    var cx = 0.0; var cy = 0.0; var cz = 0.0;\n    for (var i = 0u; i < MAX_CANDIDATES; i++) {\n        if (i >= count) { break; }\n        cx += (*candidates)[i].pointB.x;\n        cy += (*candidates)[i].pointB.y;\n        cz += (*candidates)[i].pointB.z;\n    }\n    let fc = 1.0 / f32(count);\n    let center = vec3f(cx * fc, cy * fc, cz * fc);\n\n    let p0rel = (*candidates)[0].pointB - center;\n    let p0len = length(p0rel);\n    var t0 = select(vec3f(1.0, 0.0, 0.0), p0rel / p0len, p0len > 1e-12);\n    let u = normalize(cross(normal, t0));\n    let v = cross(normal, u);\n\n    var sel: array<u32, 4> = array(0u, 0u, 0u, 0u);\n    var bestProj: array<f32, 4> = array(-1e30, -1e30, -1e30, -1e30);\n    for (var i = 0u; i < MAX_CANDIDATES; i++) {\n        if (i >= count) { break; }\n        let rel = (*candidates)[i].pointB - center;\n        let pu = dot(rel, u);\n        let pv = dot(rel, v);\n        if (pu > bestProj[0]) { bestProj[0] = pu; sel[0] = i; }\n        if (-pu > bestProj[1]) { bestProj[1] = -pu; sel[1] = i; }\n        if (pv > bestProj[2]) { bestProj[2] = pv; sel[2] = i; }\n        if (-pv > bestProj[3]) { bestProj[3] = -pv; sel[3] = i; }\n    }\n\n    var unique: array<u32, 4>;\n    var uCount = 0u;\n    for (var i = 0u; i < 4u; i++) {\n        var dup = false;\n        for (var j = 0u; j < uCount; j++) {\n            if (unique[j] == sel[i]) { dup = true; break; }\n        }\n        if (!dup) { unique[uCount] = sel[i]; uCount++; }\n    }\n\n    var deepIdx = 0u;\n    var deepVal = (*candidates)[0].depth;\n    for (var i = 1u; i < MAX_CANDIDATES; i++) {\n        if (i >= count) { break; }\n        if ((*candidates)[i].depth < deepVal) {\n            deepVal = (*candidates)[i].depth;\n            deepIdx = i;\n        }\n    }\n\n    var hasDeep = false;\n    for (var i = 0u; i < uCount; i++) {\n        if (unique[i] == deepIdx) { hasDeep = true; break; }\n    }\n    if (!hasDeep) {\n        if (uCount < 4u) {\n            unique[uCount] = deepIdx;\n            uCount++;\n        } else {\n            var shallowest = 0u;\n            var shallowestVal = (*candidates)[unique[0]].depth;\n            for (var i = 1u; i < uCount; i++) {\n                if ((*candidates)[unique[i]].depth > shallowestVal) {\n                    shallowestVal = (*candidates)[unique[i]].depth;\n                    shallowest = i;\n                }\n            }\n            unique[shallowest] = deepIdx;\n        }\n    }\n\n    for (var i = 0u; i < uCount; i++) { (*out)[i] = unique[i]; }\n    return uCount;\n}\n", rl = `
${nl}

fn supportPointBox(pos: vec3f, ax0: vec3f, ax1: vec3f, ax2: vec3f, half: vec3f, dir: vec3f) -> vec3f {
    return pos
        + ax0 * select(-half.x, half.x, dot(dir, ax0) >= 0.0)
        + ax1 * select(-half.y, half.y, dot(dir, ax1) >= 0.0)
        + ax2 * select(-half.z, half.z, dot(dir, ax2) >= 0.0);
}

fn detectBoxBox(ci: u32, cj: u32) {
    let bA = bodies[ci];
    let bB = bodies[cj];
    let hA = bA.halfExtents;
    let hB = bB.halfExtents;
    let posA = bA.pos;
    let posB = bB.pos;
    let qA = bA.quat;
    let qB = bB.quat;

    let axA0 = quatRotate(qA, vec3f(1, 0, 0));
    let axA1 = quatRotate(qA, vec3f(0, 1, 0));
    let axA2 = quatRotate(qA, vec3f(0, 0, 1));
    let axB0 = quatRotate(qB, vec3f(1, 0, 0));
    let axB1 = quatRotate(qB, vec3f(0, 1, 0));
    let axB2 = quatRotate(qB, vec3f(0, 0, 1));

    let d = posB - posA;

    var minFacePen = 1e30;
    var bestFaceAxis = vec3f(0.0, 1.0, 0.0);
    var minEdgePen = 1e30;
    var bestEdgeAxis = vec3f(0.0, 1.0, 0.0);
    var separated = false;
    var bestEdgeA = vec3f(0.0);
    var bestEdgeB = vec3f(0.0);
    var bestEdgeIdxA = 0u;
    var bestEdgeIdxB = 0u;

    let faceAxes = array<vec3f, 6>(axA0, axA1, axA2, axB0, axB1, axB2);

    for (var a = 0u; a < 6u; a++) {
        let axis = faceAxes[a];
        let projA = abs(dot(axA0, axis)) * hA.x + abs(dot(axA1, axis)) * hA.y + abs(dot(axA2, axis)) * hA.z;
        let projB = abs(dot(axB0, axis)) * hB.x + abs(dot(axB1, axis)) * hB.y + abs(dot(axB2, axis)) * hB.z;
        let dist_ax = abs(dot(d, axis));
        let pen = projA + projB - dist_ax;
        if (pen < 0.0) { separated = true; break; }
        if (pen < minFacePen) {
            minFacePen = pen;
            bestFaceAxis = axis;
            if (dot(d, axis) < 0.0) { bestFaceAxis = -axis; }
        }
    }

    if (!separated) {
        let edgesA = array<vec3f, 3>(axA0, axA1, axA2);
        let edgesB = array<vec3f, 3>(axB0, axB1, axB2);

        for (var ea = 0u; ea < 3u; ea++) {
            for (var eb = 0u; eb < 3u; eb++) {
                var axis = cross(edgesA[ea], edgesB[eb]);
                let axLen = length(axis);
                if (axLen < 1e-6) { continue; }
                axis /= axLen;

                let projA = abs(dot(axA0, axis)) * hA.x + abs(dot(axA1, axis)) * hA.y + abs(dot(axA2, axis)) * hA.z;
                let projB = abs(dot(axB0, axis)) * hB.x + abs(dot(axB1, axis)) * hB.y + abs(dot(axB2, axis)) * hB.z;
                let dist_ax = abs(dot(d, axis));
                let pen = projA + projB - dist_ax;
                if (pen < 0.0) { separated = true; break; }
                if (pen < minEdgePen) {
                    minEdgePen = pen;
                    bestEdgeAxis = axis;
                    if (dot(d, axis) < 0.0) { bestEdgeAxis = -axis; }
                    bestEdgeA = edgesA[ea];
                    bestEdgeB = edgesB[eb];
                    bestEdgeIdxA = ea;
                    bestEdgeIdxB = eb;
                }
            }
            if (separated) { break; }
        }
    }

    var bestIsFace = true;
    var bestAxis = bestFaceAxis;
    if (!separated && minFacePen < 1e30 && minEdgePen < minFacePen * 0.95 - 0.01) {
        bestIsFace = false;
        bestAxis = bestEdgeAxis;
    }

    if (separated) {
        return;
    }

    var candidates: array<ManifoldCandidate, MAX_CANDIDATES>;
    var candCount = 0u;
    let satNormal = bestAxis;
    let n = bestAxis;

    var faceRefIsA = false;
    var refFaceIdx = 0u;
    var incFaceIdx = 0u;

    if (bestIsFace) {
        let nDotA0 = abs(dot(n, axA0));
        let nDotA1 = abs(dot(n, axA1));
        let nDotA2 = abs(dot(n, axA2));
        let nDotB0 = abs(dot(n, axB0));
        let nDotB1 = abs(dot(n, axB1));
        let nDotB2 = abs(dot(n, axB2));

        var maxDotA = nDotA0;
        if (nDotA1 > maxDotA) { maxDotA = nDotA1; }
        if (nDotA2 > maxDotA) { maxDotA = nDotA2; }
        var maxDotB = nDotB0;
        if (nDotB1 > maxDotB) { maxDotB = nDotB1; }
        if (nDotB2 > maxDotB) { maxDotB = nDotB2; }
        let refIsA = maxDotA >= maxDotB;

        var incVerts: array<vec3f, 4>;
        var refCenter: vec3f;
        var refNormal: vec3f;
        var refTangent1: vec3f;
        var refTangent2: vec3f;
        var refHalf1: f32;
        var refHalf2: f32;

        if (refIsA) {
            faceRefIsA = true;
            refNormal = n;
            if (nDotA0 >= nDotA1 && nDotA0 >= nDotA2) {
                let s = sign(dot(n, axA0));
                refCenter = posA + axA0 * s * hA.x;
                refTangent1 = axA1; refHalf1 = hA.y;
                refTangent2 = axA2; refHalf2 = hA.z;
                refFaceIdx = select(0u, 1u, s > 0.0);
            } else if (nDotA1 >= nDotA2) {
                let s = sign(dot(n, axA1));
                refCenter = posA + axA1 * s * hA.y;
                refTangent1 = axA0; refHalf1 = hA.x;
                refTangent2 = axA2; refHalf2 = hA.z;
                refFaceIdx = 2u + select(0u, 1u, s > 0.0);
            } else {
                let s = sign(dot(n, axA2));
                refCenter = posA + axA2 * s * hA.z;
                refTangent1 = axA0; refHalf1 = hA.x;
                refTangent2 = axA1; refHalf2 = hA.y;
                refFaceIdx = 4u + select(0u, 1u, s > 0.0);
            }

            let negN = -n;
            let dB0 = dot(negN, axB0);
            let dB1 = dot(negN, axB1);
            let dB2 = dot(negN, axB2);
            let aB0 = abs(dB0); let aB1 = abs(dB1); let aB2 = abs(dB2);

            var incAxis: vec3f;
            var incT1: vec3f;
            var incT2: vec3f;
            var incH: f32;
            var incH1: f32;
            var incH2: f32;

            if (aB0 >= aB1 && aB0 >= aB2) {
                let s = sign(dB0);
                incAxis = axB0 * s; incH = hB.x;
                incT1 = axB1; incH1 = hB.y;
                incT2 = axB2; incH2 = hB.z;
                incFaceIdx = select(0u, 1u, s > 0.0);
            } else if (aB1 >= aB2) {
                let s = sign(dB1);
                incAxis = axB1 * s; incH = hB.y;
                incT1 = axB0; incH1 = hB.x;
                incT2 = axB2; incH2 = hB.z;
                incFaceIdx = 2u + select(0u, 1u, s > 0.0);
            } else {
                let s = sign(dB2);
                incAxis = axB2 * s; incH = hB.z;
                incT1 = axB0; incH1 = hB.x;
                incT2 = axB1; incH2 = hB.y;
                incFaceIdx = 4u + select(0u, 1u, s > 0.0);
            }

            let incCenter = posB + incAxis * incH;
            incVerts[0] = incCenter + incT1 * incH1 + incT2 * incH2;
            incVerts[1] = incCenter - incT1 * incH1 + incT2 * incH2;
            incVerts[2] = incCenter - incT1 * incH1 - incT2 * incH2;
            incVerts[3] = incCenter + incT1 * incH1 - incT2 * incH2;
        } else {
            refNormal = -n;
            if (nDotB0 >= nDotB1 && nDotB0 >= nDotB2) {
                let s = sign(dot(-n, axB0));
                refCenter = posB + axB0 * s * hB.x;
                refTangent1 = axB1; refHalf1 = hB.y;
                refTangent2 = axB2; refHalf2 = hB.z;
                refFaceIdx = select(0u, 1u, s > 0.0);
            } else if (nDotB1 >= nDotB2) {
                let s = sign(dot(-n, axB1));
                refCenter = posB + axB1 * s * hB.y;
                refTangent1 = axB0; refHalf1 = hB.x;
                refTangent2 = axB2; refHalf2 = hB.z;
                refFaceIdx = 2u + select(0u, 1u, s > 0.0);
            } else {
                let s = sign(dot(-n, axB2));
                refCenter = posB + axB2 * s * hB.z;
                refTangent1 = axB0; refHalf1 = hB.x;
                refTangent2 = axB1; refHalf2 = hB.y;
                refFaceIdx = 4u + select(0u, 1u, s > 0.0);
            }

            let posN = n;
            let dA0 = dot(posN, axA0);
            let dA1 = dot(posN, axA1);
            let dA2 = dot(posN, axA2);
            let aA0 = abs(dA0); let aA1 = abs(dA1); let aA2 = abs(dA2);

            var incAxis: vec3f;
            var incT1: vec3f;
            var incT2: vec3f;
            var incH: f32;
            var incH1: f32;
            var incH2: f32;

            if (aA0 >= aA1 && aA0 >= aA2) {
                let s = sign(dA0);
                incAxis = axA0 * s; incH = hA.x;
                incT1 = axA1; incH1 = hA.y;
                incT2 = axA2; incH2 = hA.z;
                incFaceIdx = select(0u, 1u, s > 0.0);
            } else if (aA1 >= aA2) {
                let s = sign(dA1);
                incAxis = axA1 * s; incH = hA.y;
                incT1 = axA0; incH1 = hA.x;
                incT2 = axA2; incH2 = hA.z;
                incFaceIdx = 2u + select(0u, 1u, s > 0.0);
            } else {
                let s = sign(dA2);
                incAxis = axA2 * s; incH = hA.z;
                incT1 = axA0; incH1 = hA.x;
                incT2 = axA1; incH2 = hA.y;
                incFaceIdx = 4u + select(0u, 1u, s > 0.0);
            }

            let incCenter = posA + incAxis * incH;
            incVerts[0] = incCenter + incT1 * incH1 + incT2 * incH2;
            incVerts[1] = incCenter - incT1 * incH1 + incT2 * incH2;
            incVerts[2] = incCenter - incT1 * incH1 - incT2 * incH2;
            incVerts[3] = incCenter + incT1 * incH1 - incT2 * incH2;
        }

        var clipIn: array<vec3f, 8>;
        var clipOut: array<vec3f, 8>;
        var clipTags: array<u32, 8>;
        var clipTagsOut: array<u32, 8>;
        var clipCount = 4u;
        for (var v = 0u; v < 4u; v++) { clipIn[v] = incVerts[v]; clipTags[v] = v; }

        let clipNormals = array<vec3f, 4>(refTangent1, -refTangent1, refTangent2, -refTangent2);
        let clipOffsets = array<f32, 4>(
            dot(refTangent1, refCenter) + refHalf1,
            -dot(refTangent1, refCenter) + refHalf1,
            dot(refTangent2, refCenter) + refHalf2,
            -dot(refTangent2, refCenter) + refHalf2,
        );

        for (var p = 0u; p < 4u; p++) {
            let planeN = clipNormals[p];
            let planeD = clipOffsets[p];
            var outCount = 0u;

            var a = clipIn[clipCount - 1u];
            var da = dot(planeN, a) - planeD;
            for (var v = 0u; v < clipCount; v++) {
                let b = clipIn[v];
                let db = dot(planeN, b) - planeD;
                let aInside = da <= 1e-5;
                let bInside = db <= 1e-5;
                if (aInside != bInside) {
                    var t = 0.0;
                    let denom = da - db;
                    if (abs(denom) > 1e-6) { t = clamp(da / denom, 0.0, 1.0); }
                    if (outCount < 8u) { clipTagsOut[outCount] = 4u + p; clipOut[outCount] = a + (b - a) * t; outCount++; }
                }
                if (bInside) {
                    if (outCount < 8u) { clipTagsOut[outCount] = clipTags[v]; clipOut[outCount] = b; outCount++; }
                }
                a = b;
                da = db;
            }

            clipCount = outCount;
            for (var v = 0u; v < clipCount; v++) { clipIn[v] = clipOut[v]; clipTags[v] = clipTagsOut[v]; }
        }

        let refD = dot(refNormal, refCenter);
        for (var v = 0u; v < clipCount; v++) {
            let sep = dot(refNormal, clipIn[v]) - refD;
            if (sep <= 1e-5 && candCount < MAX_CANDIDATES) {
                let pInc = clipIn[v];
                let pRef = pInc - refNormal * sep;
                let cA = select(pInc, pRef, faceRefIsA);
                let cB = select(pRef, pInc, faceRefIsA);
                candidates[candCount] = ManifoldCandidate(cA, cB, sep, clipTags[v]);
                candCount++;
            }
        }

        if (candCount == 0u) {
            let sA = supportPointBox(posA, axA0, axA1, axA2, hA, satNormal);
            let sB = supportPointBox(posB, axB0, axB1, axB2, hB, -satNormal);
            candidates[0] = ManifoldCandidate(sA, sB, dot(sA - sB, satNormal), 0u);
            candCount = 1u;
        }
    } else {
        let eA = bestEdgeA;
        let eB = bestEdgeB;

        let sA0 = dot(axA0, satNormal) > 0.0;
        let sA1 = dot(axA1, satNormal) > 0.0;
        let sA2 = dot(axA2, satNormal) > 0.0;

        var supA = vec3f(0.0);
        supA += axA0 * select(-hA.x, hA.x, sA0);
        supA += axA1 * select(-hA.y, hA.y, sA1);
        supA += axA2 * select(-hA.z, hA.z, sA2);
        let pA = posA + supA;

        let sB0 = dot(axB0, -satNormal) > 0.0;
        let sB1 = dot(axB1, -satNormal) > 0.0;
        let sB2 = dot(axB2, -satNormal) > 0.0;

        var supB = vec3f(0.0);
        supB += axB0 * select(-hB.x, hB.x, sB0);
        supB += axB1 * select(-hB.y, hB.y, sB1);
        supB += axB2 * select(-hB.z, hB.z, sB2);
        let pB = posB + supB;

        var halfLenA = hA.x;
        if (abs(dot(eA, axA1)) > 0.5) { halfLenA = hA.y; }
        if (abs(dot(eA, axA2)) > 0.5) { halfLenA = hA.z; }
        var halfLenB = hB.x;
        if (abs(dot(eB, axB1)) > 0.5) { halfLenB = hB.y; }
        if (abs(dot(eB, axB2)) > 0.5) { halfLenB = hB.z; }

        let dAB = pA - pB;
        let dAe = dot(eA, eA);
        let dBe = dot(eB, eB);
        let dAeB = dot(eA, eB);
        let dAeAB = dot(eA, dAB);
        let dBeAB = dot(eB, dAB);

        let denom = dAe * dBe - dAeB * dAeB;
        let sN = clamp((dAeB * dBeAB - dBe * dAeAB) / max(denom, 1e-12), -halfLenA, halfLenA);
        let tN = clamp((dAe * dBeAB - dAeB * dAeAB) / max(denom, 1e-12), -halfLenB, halfLenB);

        let closestA = pA + eA * sN;
        let closestB = pB + eB * tN;
        let depth = dot(closestA - closestB, satNormal);

        if (depth <= 0.0) {
            candidates[0] = ManifoldCandidate(closestA, closestB, depth, 0u);
            candCount = 1u;
        } else {
            let sA = supportPointBox(posA, axA0, axA1, axA2, hA, satNormal);
            let sB = supportPointBox(posB, axB0, axB1, axB2, hB, -satNormal);
            candidates[0] = ManifoldCandidate(sA, sB, dot(sA - sB, satNormal), 0u);
            candCount = 1u;
        }
    }

    var selected: array<u32, 4>;
    let satCount = reduceManifold(&candidates, candCount, satNormal, &selected);

    let bbBasisN = -satNormal;
    let tb = tangentBasis(bbBasisN);
    let mu = sqrt(bA.friction * bB.friction);

    for (var s = 0u; s < satCount; s++) {
        let ci_s = selected[s];
        let rA_w = candidates[ci_s].pointA - posA;
        let rB_w = candidates[ci_s].pointB - posB;
        let rA = quatRotate(quatConj(bA.quat), rA_w);
        let rB = quatRotate(quatConj(bB.quat), rB_w);
        let bbCI = contactCInit(posA, rA_w, posB, rB_w, bbBasisN, tb[0], tb[1]);

        var newKey = 0u;
        if (bestIsFace) {
            let typeVal = select(1u, 0u, faceRefIsA);
            newKey = (typeVal << 24u) | ((refFaceIdx >> 1u) << 16u) | ((incFaceIdx >> 1u) << 8u) | candidates[ci_s].clipTag;
        } else {
            newKey = (2u << 24u) | ((bestEdgeIdxA & 0xffu) << 8u) | (bestEdgeIdxB & 0xffu);
        }

        let wsKey = packKey(ci, cj, s);
        pushConstraintSearching(
            ci, i32(cj), newKey,
            bbBasisN, bbCI.x,
            tb[0], bbCI.y,
            tb[1], bbCI.z,
            rA, rB,
            mu,
            wsKey, ci, cj, 0u,
            -1e30, 0.0, 1e30,
        );
    }
    for (var s = satCount; s < MAX_PAIR_CONTACTS; s++) {
        resetWarmstartHash(packKey(ci, cj, s));
    }
}
`, il = `
${tl}
fn detectSphereBox(si: u32, bi: u32) {
    let sphere = bodies[si];
    let box = bodies[bi];
    let sPos = sphere.pos;
    let bPos = box.pos;
    let sRadius = sphere.halfExtents.x;
    let h = box.halfExtents;
    let bQ = box.quat;
    let bQc = quatConj(bQ);

    let d = sPos - bPos;
    let local = quatRotate(bQc, d);
    let clamped = clamp(local, -h, h);
    let diff = local - clamped;
    let dist2 = dot(diff, diff);

    let absLocal = abs(local);
    let inside = absLocal.x <= h.x && absLocal.y <= h.y && absLocal.z <= h.z;

    if (!inside && dist2 > 1e-16) {
        let dist = sqrt(dist2);
        let gap = dist - sRadius;
        if (gap > COLLISION_MARGIN) {
            let lo = min(si, bi);
            let hi = max(si, bi);
            for (var s = 0u; s < MAX_PAIR_CONTACTS; s++) {
                resetWarmstartHash(packKey(lo, hi, s));
            }
            return;
        }
        let localNormal = diff / dist;
        let normal = quatRotate(bQ, localNormal);

        let rBox_w = quatRotate(bQ, clamped);
        let rSphere_w = -normal * sRadius;

        emitSingleContact(si, bi, normal, rSphere_w, rBox_w,
            sPos, sphere.quat, bPos, bQ, sphere.friction, box.friction, 4u << 24u);
    } else {
        let face = h - absLocal;
        var minAxis = 0u;
        var minDepth = face.x;
        if (face.y < minDepth) { minAxis = 1u; minDepth = face.y; }
        if (face.z < minDepth) { minAxis = 2u; minDepth = face.z; }

        var localN = vec3f(0.0);
        var cpLocal = local;
        if (minAxis == 0u) {
            let s0 = select(-1.0, 1.0, local.x >= 0.0);
            localN.x = s0;
            cpLocal.x = s0 * h.x;
        } else if (minAxis == 1u) {
            let s0 = select(-1.0, 1.0, local.y >= 0.0);
            localN.y = s0;
            cpLocal.y = s0 * h.y;
        } else {
            let s0 = select(-1.0, 1.0, local.z >= 0.0);
            localN.z = s0;
            cpLocal.z = s0 * h.z;
        }
        let normal = quatRotate(bQ, localN);
        let rBox_w = quatRotate(bQ, cpLocal);
        let rSphere_w = -normal * sRadius;

        emitSingleContact(si, bi, normal, rSphere_w, rBox_w,
            sPos, sphere.quat, bPos, bQ, sphere.friction, box.friction, 4u << 24u);
    }
}
`, al = "\nfn detectCapsuleBox(ci: u32, bi: u32) {\n    let cap = bodies[ci];\n    let box = bodies[bi];\n    let capAxis = quatRotate(cap.quat, vec3f(0.0, cap.halfExtents.y, 0.0));\n    let capR = cap.halfExtents.x;\n    let h = box.halfExtents;\n    let bQ = box.quat;\n    let bQc = quatConj(bQ);\n\n    let lo = min(ci, bi);\n    let hi = max(ci, bi);\n    let aIsLo = ci < bi;\n    let mu = sqrt(cap.friction * box.friction);\n\n    var contactCount = 0u;\n    let epA = cap.pos + capAxis;\n    let epB = cap.pos - capAxis;\n\n    for (var ep = 0u; ep < 2u; ep++) {\n        let sPos = select(epB, epA, ep == 0u);\n        let d = sPos - box.pos;\n        let local = quatRotate(bQc, d);\n        let clamped = clamp(local, -h, h);\n        let diff = local - clamped;\n        let dist2 = dot(diff, diff);\n\n        let absLocal = abs(local);\n        let isInside = absLocal.x <= h.x && absLocal.y <= h.y && absLocal.z <= h.z;\n\n        var normal: vec3f;\n        var rBox_w: vec3f;\n        var emitThis = false;\n\n        if (!isInside && dist2 > 1e-16) {\n            let dist = sqrt(dist2);\n            let gap = dist - capR;\n            if (gap <= COLLISION_MARGIN) {\n                normal = quatRotate(bQ, diff / dist);\n                rBox_w = quatRotate(bQ, clamped);\n                emitThis = true;\n            }\n        } else {\n            let face = h - absLocal;\n            var minAxis = 0u;\n            var minVal = face.x;\n            if (face.y < minVal) { minAxis = 1u; minVal = face.y; }\n            if (face.z < minVal) { minAxis = 2u; minVal = face.z; }\n            var localN = vec3f(0.0);\n            var cpLocal = local;\n            if (minAxis == 0u) {\n                let s0 = select(-1.0, 1.0, local.x >= 0.0);\n                localN.x = s0; cpLocal.x = s0 * h.x;\n            } else if (minAxis == 1u) {\n                let s0 = select(-1.0, 1.0, local.y >= 0.0);\n                localN.y = s0; cpLocal.y = s0 * h.y;\n            } else {\n                let s0 = select(-1.0, 1.0, local.z >= 0.0);\n                localN.z = s0; cpLocal.z = s0 * h.z;\n            }\n            normal = quatRotate(bQ, localN);\n            rBox_w = quatRotate(bQ, cpLocal);\n            emitThis = true;\n        }\n\n        if (emitThis) {\n            let rCap_w = (sPos - cap.pos) + (-normal * capR);\n            let n = select(-normal, normal, aIsLo);\n            let tb = tangentBasis(n);\n\n            let rCapL = quatRotate(quatConj(cap.quat), rCap_w);\n            let rBoxL = quatRotate(bQc, rBox_w);\n\n            let posLo = select(box.pos, cap.pos, aIsLo);\n            let posHi = select(cap.pos, box.pos, aIsLo);\n            let rLo_l = select(rBoxL, rCapL, aIsLo);\n            let rHi_l = select(rCapL, rBoxL, aIsLo);\n            let rLo_w = select(rBox_w, rCap_w, aIsLo);\n            let rHi_w = select(rCap_w, rBox_w, aIsLo);\n\n            let cInit = contactCInit(posLo, rLo_w, posHi, rHi_w, n, tb[0], tb[1]);\n            let fkey = (7u << 24u) | ep;\n\n            pushConstraintSearching(\n                lo, i32(hi), fkey,\n                n, cInit.x,\n                tb[0], cInit.y,\n                tb[1], cInit.z,\n                rLo_l, rHi_l,\n                mu,\n                packKey(lo, hi, contactCount), lo, hi, 0u,\n                -1e30, 0.0, 1e30,\n            );\n            contactCount++;\n        }\n    }\n\n    for (var s = contactCount; s < MAX_PAIR_CONTACTS; s++) {\n        resetWarmstartHash(packKey(lo, hi, s));\n    }\n}\n", ol = "\nfn detectSphereSphere(ci: u32, cj: u32) {\n    let bA = bodies[ci];\n    let bB = bodies[cj];\n    let posA = bA.pos;\n    let posB = bB.pos;\n    let rA = bA.halfExtents.x;\n    let rB = bB.halfExtents.x;\n\n    let d = posA - posB;\n    let dist = length(d);\n    let gap = dist - rA - rB;\n    if (gap > COLLISION_MARGIN) {\n        for (var s = 0u; s < MAX_PAIR_CONTACTS; s++) {\n            resetWarmstartHash(packKey(ci, cj, s));\n        }\n        return;\n    }\n\n    var normal: vec3f;\n    if (dist < 1e-8) {\n        normal = vec3f(0.0, 1.0, 0.0);\n    } else {\n        normal = d / dist;\n    }\n\n    let tb = tangentBasis(normal);\n    let mu = sqrt(bA.friction * bB.friction);\n\n    let rA_w = -normal * rA;\n    let rB_w = normal * rB;\n    let rA_local = quatRotate(quatConj(bA.quat), rA_w);\n    let rB_local = quatRotate(quatConj(bB.quat), rB_w);\n    let ssCI = contactCInit(posA, rA_w, posB, rB_w, normal, tb[0], tb[1]);\n\n    let featureKey = 3u << 24u;\n    let wsKey = packKey(ci, cj, 0u);\n    pushConstraintSearching(\n        ci, i32(cj), featureKey,\n        normal, ssCI.x,\n        tb[0], ssCI.y,\n        tb[1], ssCI.z,\n        rA_local, rB_local,\n        mu,\n        wsKey, ci, cj, 0u,\n        -1e30, 0.0, 1e30,\n    );\n    for (var s = 1u; s < MAX_PAIR_CONTACTS; s++) {\n        resetWarmstartHash(packKey(ci, cj, s));\n    }\n}\n", sl = "\nfn closestPointOnSegment(p: vec3f, a: vec3f, b: vec3f) -> vec3f {\n    let ab = b - a;\n    let ab2 = dot(ab, ab);\n    if (ab2 < 1e-12) { return a; }\n    let t = clamp(dot(p - a, ab) / ab2, 0.0, 1.0);\n    return a + ab * t;\n}\n", cl = "\nfn closestPointsOnSegments(p0: vec3f, p1: vec3f, q0: vec3f, q1: vec3f) -> array<vec3f, 2> {\n    let d1 = p1 - p0;\n    let d2 = q1 - q0;\n    let r = p0 - q0;\n    let a = dot(d1, d1);\n    let e = dot(d2, d2);\n    let f = dot(d2, r);\n\n    var s = 0.0;\n    var t = 0.0;\n\n    if (a <= 1e-12 && e <= 1e-12) {\n        return array(p0, q0);\n    }\n\n    if (a <= 1e-12) {\n        t = clamp(f / e, 0.0, 1.0);\n    } else {\n        let c = dot(d1, r);\n        if (e <= 1e-12) {\n            s = clamp(-c / a, 0.0, 1.0);\n        } else {\n            let b = dot(d1, d2);\n            let denom = a * e - b * b;\n\n            if (abs(denom) > 1e-12) {\n                s = clamp((b * f - c * e) / denom, 0.0, 1.0);\n            }\n\n            t = (b * s + f) / e;\n\n            if (t < 0.0) {\n                t = 0.0;\n                s = clamp(-c / a, 0.0, 1.0);\n            } else if (t > 1.0) {\n                t = 1.0;\n                s = clamp((b - c) / a, 0.0, 1.0);\n            }\n        }\n    }\n\n    return array(p0 + d1 * s, q0 + d2 * t);\n}\n", ll = `
${sl}
${tl}

fn detectCapsuleSphere(ci: u32, si: u32) {
    let cap = bodies[ci];
    let sph = bodies[si];
    let capAxis = quatRotate(cap.quat, vec3f(0.0, cap.halfExtents.y, 0.0));
    let segA = cap.pos + capAxis;
    let segB = cap.pos - capAxis;
    let capR = cap.halfExtents.x;
    let sphR = sph.halfExtents.x;

    let closest = closestPointOnSegment(sph.pos, segA, segB);
    let d = closest - sph.pos;
    let dist = length(d);
    let gap = dist - capR - sphR;

    let lo = min(ci, si);
    let hi = max(ci, si);
    if (gap > COLLISION_MARGIN) {
        for (var s = 0u; s < MAX_PAIR_CONTACTS; s++) {
            resetWarmstartHash(packKey(lo, hi, s));
        }
        return;
    }

    var normal: vec3f;
    if (dist < 1e-8) {
        normal = vec3f(0.0, 1.0, 0.0);
    } else {
        normal = d / dist;
    }

    let rCap_w = (closest - cap.pos) + (-normal * capR);
    let rSph_w = normal * sphR;

    emitSingleContact(ci, si, normal, rCap_w, rSph_w,
        cap.pos, cap.quat, sph.pos, sph.quat,
        cap.friction, sph.friction, 5u << 24u);
}
`, ul = `
${cl}
${tl}

fn detectCapsuleCapsule(ci: u32, cj: u32) {
    let bA = bodies[ci];
    let bB = bodies[cj];
    let axisA = quatRotate(bA.quat, vec3f(0.0, bA.halfExtents.y, 0.0));
    let axisB = quatRotate(bB.quat, vec3f(0.0, bB.halfExtents.y, 0.0));
    let rA = bA.halfExtents.x;
    let rB = bB.halfExtents.x;

    let cp = closestPointsOnSegments(
        bA.pos + axisA, bA.pos - axisA,
        bB.pos + axisB, bB.pos - axisB);
    let d = cp[0] - cp[1];
    let dist = length(d);
    let gap = dist - rA - rB;

    if (gap > COLLISION_MARGIN) {
        for (var s = 0u; s < MAX_PAIR_CONTACTS; s++) {
            resetWarmstartHash(packKey(ci, cj, s));
        }
        return;
    }

    var normal: vec3f;
    if (dist < 1e-8) {
        normal = vec3f(0.0, 1.0, 0.0);
    } else {
        normal = d / dist;
    }

    let rA_w = (cp[0] - bA.pos) + (-normal * rA);
    let rB_w = (cp[1] - bB.pos) + (normal * rB);

    emitSingleContact(ci, cj, normal, rA_w, rB_w,
        bA.pos, bA.quat, bB.pos, bB.quat,
        bA.friction, bB.friction, 6u << 24u);
}
`, dl = `
${nl}
@group(1) @binding(1) var<storage, read> hullData: array<u32>;

const MAX_HULL_VERTS: u32 = 64u;
const MAX_HULL_FACES: u32 = 32u;
const MAX_HULL_EDGES: u32 = 48u;
const MAX_FACE_VERTS: u32 = 16u;
const MAX_CLIP_VERTS: u32 = 32u;

struct HullMeta {
    vertexBase: u32,
    vertexCount: u32,
    faceBase: u32,
    faceCount: u32,
    edgeBase: u32,
    edgeCount: u32,
    invExtent: vec3f,
}

fn loadHullMeta(hullId: u32) -> HullMeta {
    let b = hullId * 12u;
    return HullMeta(
        hullData[b], hullData[b+1u], hullData[b+2u], hullData[b+3u],
        hullData[b+4u], hullData[b+5u],
        vec3f(bitcast<f32>(hullData[b+6u]), bitcast<f32>(hullData[b+7u]), bitcast<f32>(hullData[b+8u])),
    );
}

fn hullScale(hm: HullMeta, halfExt: vec3f) -> vec3f {
    return halfExt * hm.invExtent;
}

fn hullVertex(hm: HullMeta, idx: u32) -> vec3f {
    let b = hm.vertexBase + idx * 4u;
    return vec3f(bitcast<f32>(hullData[b]), bitcast<f32>(hullData[b+1u]), bitcast<f32>(hullData[b+2u]));
}

fn hullFacePlane(hm: HullMeta, faceIdx: u32, scale: vec3f) -> vec4f {
    let b = hm.faceBase + faceIdx * 8u;
    let rawN = vec3f(bitcast<f32>(hullData[b]), bitcast<f32>(hullData[b+1u]), bitcast<f32>(hullData[b+2u]));
    let rawD = bitcast<f32>(hullData[b+3u]);
    let sn = rawN / scale;
    let snLen = length(sn);
    return vec4f(sn / snLen, rawD / snLen);
}

fn hullFaceIdxBase(hm: HullMeta, faceIdx: u32) -> u32 {
    return hullData[hm.faceBase + faceIdx * 8u + 4u];
}

fn hullFaceIdxCount(hm: HullMeta, faceIdx: u32) -> u32 {
    return hullData[hm.faceBase + faceIdx * 8u + 5u];
}

fn hullFaceVertIdx(base: u32, i: u32) -> u32 {
    return hullData[base + i];
}

fn hullEdge(hm: HullMeta, idx: u32, scale: vec3f) -> vec3f {
    let b = hm.edgeBase + idx * 4u;
    let raw = vec3f(bitcast<f32>(hullData[b]), bitcast<f32>(hullData[b+1u]), bitcast<f32>(hullData[b+2u]));
    return raw * scale;
}

fn projectHullOnAxis(hm: HullMeta, pos: vec3f, quat: vec4f, axis: vec3f, scale: vec3f) -> vec2f {
    var mn = 1e30;
    var mx = -1e30;
    for (var i = 0u; i < MAX_HULL_VERTS; i++) {
        if (i >= hm.vertexCount) { break; }
        let wv = pos + quatRotate(quat, hullVertex(hm, i) * scale);
        let d = dot(wv, axis);
        mn = min(mn, d);
        mx = max(mx, d);
    }
    return vec2f(mn, mx);
}

fn closestPointOnHull(hm: HullMeta, hQc: vec4f, worldOffset: vec3f, sRadius: f32, scale: vec3f) -> vec4f {
    let localCenter = quatRotate(hQc, worldOffset);
    let scaledCenter = localCenter / scale;
    var closestDist = 1e30;
    var closestPoint = vec3f(0.0);

    for (var fi = 0u; fi < MAX_HULL_FACES; fi++) {
        if (fi >= hm.faceCount) { break; }
        let b = hm.faceBase + fi * 8u;
        let fn0 = vec3f(bitcast<f32>(hullData[b]), bitcast<f32>(hullData[b+1u]), bitcast<f32>(hullData[b+2u]));
        let fd = bitcast<f32>(hullData[b+3u]);
        let dist = dot(fn0, scaledCenter) + fd;
        let scaledRadius = sRadius / min(scale.x, min(scale.y, scale.z));
        if (dist < -scaledRadius) { continue; }
        let projected = scaledCenter - fn0 * dist;
        let idxBase = hullFaceIdxBase(hm, fi);
        let idxCount = hullFaceIdxCount(hm, fi);
        var inside = true;
        for (var ei = 0u; ei < MAX_FACE_VERTS; ei++) {
            if (ei >= idxCount) { break; }
            let va = hullVertex(hm, hullFaceVertIdx(idxBase, ei));
            let vb = hullVertex(hm, hullFaceVertIdx(idxBase, (ei + 1u) % idxCount));
            if (dot(cross(vb - va, projected - va), fn0) < -1e-5) { inside = false; break; }
        }
        if (inside) {
            let absDist = abs(dist);
            if (absDist < closestDist) { closestDist = absDist; closestPoint = projected; }
        }
    }

    for (var fi = 0u; fi < MAX_HULL_FACES; fi++) {
        if (fi >= hm.faceCount) { break; }
        let idxBase = hullFaceIdxBase(hm, fi);
        let idxCount = hullFaceIdxCount(hm, fi);
        for (var ei = 0u; ei < MAX_FACE_VERTS; ei++) {
            if (ei >= idxCount) { break; }
            let va = hullVertex(hm, hullFaceVertIdx(idxBase, ei));
            let vb = hullVertex(hm, hullFaceVertIdx(idxBase, (ei + 1u) % idxCount));
            let ab = vb - va;
            let ab2 = dot(ab, ab);
            var cp = va;
            if (ab2 > 1e-12) { cp = va + ab * clamp(dot(scaledCenter - va, ab) / ab2, 0.0, 1.0); }
            let dist = length(scaledCenter - cp);
            if (dist < closestDist) { closestDist = dist; closestPoint = cp; }
        }
    }

    for (var vi = 0u; vi < MAX_HULL_VERTS; vi++) {
        if (vi >= hm.vertexCount) { break; }
        let v = hullVertex(hm, vi);
        let dist = length(scaledCenter - v);
        if (dist < closestDist) { closestDist = dist; closestPoint = v; }
    }

    let worldPoint = closestPoint * scale;
    let worldDist = length(localCenter - worldPoint);
    return vec4f(worldPoint, worldDist - sRadius);
}
`, fl = `
${dl}
${tl}

fn detectHullBox(hui: u32, bi: u32) {
    let hBody = bodies[hui];
    let bBody = bodies[bi];
    let hm = loadHullMeta(hBody.hullId);
    let hPos = hBody.pos;
    let hQ = hBody.quat;
    let bPos = bBody.pos;
    let bQ = bBody.quat;
    let hB = bBody.halfExtents;
    let S = hullScale(hm, hBody.halfExtents);

    let axB0 = quatRotate(bQ, vec3f(1, 0, 0));
    let axB1 = quatRotate(bQ, vec3f(0, 1, 0));
    let axB2 = quatRotate(bQ, vec3f(0, 0, 1));
    let d = bPos - hPos;

    var minPen = 1e30;
    var bestAxis = vec3f(0.0, 1.0, 0.0);
    var separated = false;

    // Hull face normals
    for (var fi = 0u; fi < MAX_HULL_FACES; fi++) {
        if (fi >= hm.faceCount) { break; }
        let plane = hullFacePlane(hm, fi, S);
        let axis = quatRotate(hQ, plane.xyz);
        let hProj = projectHullOnAxis(hm, hPos, hQ, axis, S);
        let bProj = abs(dot(axB0, axis)) * hB.x + abs(dot(axB1, axis)) * hB.y + abs(dot(axB2, axis)) * hB.z;
        let bCenter = dot(bPos, axis);
        let pen = min(hProj.y - (bCenter - bProj), (bCenter + bProj) - hProj.x);
        if (pen < 0.0) { separated = true; break; }
        if (pen < minPen * 0.95 - 0.01) {
            minPen = pen;
            bestAxis = axis;
            if (dot(d, axis) < 0.0) { bestAxis = -axis; }
        }
    }

    // Box face normals
    if (!separated) {
        let boxAxes = array<vec3f, 3>(axB0, axB1, axB2);
        for (var a = 0u; a < 3u; a++) {
            let axis = boxAxes[a];
            let hProj = projectHullOnAxis(hm, hPos, hQ, axis, S);
            let bProj = abs(dot(axB0, axis)) * hB.x + abs(dot(axB1, axis)) * hB.y + abs(dot(axB2, axis)) * hB.z;
            let bCenter = dot(bPos, axis);
            let pen = min(hProj.y - (bCenter - bProj), (bCenter + bProj) - hProj.x);
            if (pen < 0.0) { separated = true; break; }
            if (pen < minPen * 0.95 - 0.01) {
                minPen = pen;
                bestAxis = axis;
                if (dot(d, axis) < 0.0) { bestAxis = -axis; }
            }
        }
    }

    // Edge-edge cross products
    if (!separated) {
        let boxEdges = array<vec3f, 3>(axB0, axB1, axB2);
        for (var ea = 0u; ea < MAX_HULL_EDGES; ea++) {
            if (ea >= hm.edgeCount) { break; }
            let edgeA = quatRotate(hQ, hullEdge(hm, ea, S));
            for (var eb = 0u; eb < 3u; eb++) {
                var axis = cross(edgeA, boxEdges[eb]);
                let axLen = length(axis);
                if (axLen < 1e-6) { continue; }
                axis /= axLen;
                let hProj = projectHullOnAxis(hm, hPos, hQ, axis, S);
                let bProj = abs(dot(axB0, axis)) * hB.x + abs(dot(axB1, axis)) * hB.y + abs(dot(axB2, axis)) * hB.z;
                let bCenter = dot(bPos, axis);
                let pen = min(hProj.y - (bCenter - bProj), (bCenter + bProj) - hProj.x);
                if (pen < 0.0) { separated = true; break; }
                if (pen < minPen * 0.95 - 0.01) {
                    minPen = pen;
                    bestAxis = axis;
                    if (dot(d, axis) < 0.0) { bestAxis = -axis; }
                }
            }
            if (separated) { break; }
        }
    }

    if (separated) { return; }

    let n = bestAxis;

    // Reference face: on hull, most aligned with n
    var refFaceIdx = 0u;
    var refDmax = -1e30;
    for (var fi = 0u; fi < MAX_HULL_FACES; fi++) {
        if (fi >= hm.faceCount) { break; }
        let fn0 = quatRotate(hQ, hullFacePlane(hm, fi, S).xyz);
        let dd = dot(fn0, n);
        if (dd > refDmax) { refDmax = dd; refFaceIdx = fi; }
    }

    let refPlane = hullFacePlane(hm, refFaceIdx, S);
    let refNormal = quatRotate(hQ, refPlane.xyz);
    let refIdxBase = hullFaceIdxBase(hm, refFaceIdx);
    let refIdxCount = hullFaceIdxCount(hm, refFaceIdx);

    // Incident face: box face most anti-aligned with n
    let negN = -n;
    let dB0 = dot(negN, axB0); let dB1 = dot(negN, axB1); let dB2 = dot(negN, axB2);
    let aB0 = abs(dB0); let aB1 = abs(dB1); let aB2 = abs(dB2);
    var incVerts: array<vec3f, 4>;
    var incFaceIdx = 0u;
    if (aB0 >= aB1 && aB0 >= aB2) {
        let s = sign(dB0);
        let c0 = bPos + axB0 * s * hB.x;
        incVerts[0] = c0 + axB1 * hB.y + axB2 * hB.z;
        incVerts[1] = c0 - axB1 * hB.y + axB2 * hB.z;
        incVerts[2] = c0 - axB1 * hB.y - axB2 * hB.z;
        incVerts[3] = c0 + axB1 * hB.y - axB2 * hB.z;
        incFaceIdx = select(0u, 1u, s > 0.0);
    } else if (aB1 >= aB2) {
        let s = sign(dB1);
        let c0 = bPos + axB1 * s * hB.y;
        incVerts[0] = c0 + axB0 * hB.x + axB2 * hB.z;
        incVerts[1] = c0 - axB0 * hB.x + axB2 * hB.z;
        incVerts[2] = c0 - axB0 * hB.x - axB2 * hB.z;
        incVerts[3] = c0 + axB0 * hB.x - axB2 * hB.z;
        incFaceIdx = 2u + select(0u, 1u, s > 0.0);
    } else {
        let s = sign(dB2);
        let c0 = bPos + axB2 * s * hB.z;
        incVerts[0] = c0 + axB0 * hB.x + axB1 * hB.y;
        incVerts[1] = c0 - axB0 * hB.x + axB1 * hB.y;
        incVerts[2] = c0 - axB0 * hB.x - axB1 * hB.y;
        incVerts[3] = c0 + axB0 * hB.x - axB1 * hB.y;
        incFaceIdx = 4u + select(0u, 1u, s > 0.0);
    }

    // Clip incident face against reference face edge planes
    var clipIn: array<vec3f, MAX_CLIP_VERTS>;
    var clipOut: array<vec3f, MAX_CLIP_VERTS>;
    var clipCount = 4u;
    for (var v = 0u; v < 4u; v++) { clipIn[v] = incVerts[v]; }

    for (var ei = 0u; ei < MAX_FACE_VERTS; ei++) {
        if (ei >= refIdxCount) { break; }
        let vi = hullFaceVertIdx(refIdxBase, ei);
        let vj = hullFaceVertIdx(refIdxBase, (ei + 1u) % refIdxCount);
        let va = hPos + quatRotate(hQ, hullVertex(hm, vi) * S);
        let vb = hPos + quatRotate(hQ, hullVertex(hm, vj) * S);
        let edge0 = va - vb;
        let planeN = -cross(edge0, refNormal);
        let planeD = dot(va, planeN);
        var outCount = 0u;
        var a = clipIn[clipCount - 1u];
        var da = dot(planeN, a) - planeD;
        for (var v = 0u; v < MAX_CLIP_VERTS; v++) {
            if (v >= clipCount) { break; }
            let b = clipIn[v];
            let db = dot(planeN, b) - planeD;
            if ((da <= 1e-5) != (db <= 1e-5)) {
                var t = 0.0;
                let denom = da - db;
                if (abs(denom) > 1e-6) { t = clamp(da / denom, 0.0, 1.0); }
                if (outCount < MAX_CLIP_VERTS) { clipOut[outCount] = a + (b - a) * t; outCount++; }
            }
            if (db <= 1e-5) {
                if (outCount < MAX_CLIP_VERTS) { clipOut[outCount] = b; outCount++; }
            }
            a = b;
            da = db;
        }
        clipCount = outCount;
        for (var v = 0u; v < MAX_CLIP_VERTS; v++) {
            if (v >= clipCount) { break; }
            clipIn[v] = clipOut[v];
        }
    }

    // Collect all candidates behind reference face
    let localPlaneEq = refPlane.w;
    let worldPlaneEq = localPlaneEq - dot(refNormal, hPos);
    var candidates: array<ManifoldCandidate, MAX_CANDIDATES>;
    var candCount = 0u;

    for (var v = 0u; v < MAX_CLIP_VERTS; v++) {
        if (v >= clipCount) { break; }
        let depth = dot(refNormal, clipIn[v]) + worldPlaneEq;
        if (depth <= 0.0 && candCount < MAX_CANDIDATES) {
            let pB = clipIn[v];
            let pA = pB - refNormal * depth;
            candidates[candCount] = ManifoldCandidate(pA, pB, depth, v);
            candCount++;
        }
    }

    // Reduce to 4 well-distributed contacts
    var selected: array<u32, 4>;
    let satCount = reduceManifold(&candidates, candCount, n, &selected);

    let bbBasisN = -n;
    let tb = tangentBasis(bbBasisN);
    let mu = sqrt(hBody.friction * bBody.friction);

    for (var s = 0u; s < satCount; s++) {
        let c = candidates[selected[s]];
        let rH_w = c.pointA - hPos;
        let rB_w = c.pointB - bPos;
        let rH = quatRotate(quatConj(hQ), rH_w);
        let rB = quatRotate(quatConj(bQ), rB_w);
        let bbCI = contactCInit(hPos, rH_w, bPos, rB_w, bbBasisN, tb[0], tb[1]);
        let fkey = (10u << 24u) | s;

        let wsKey = packKey(hui, bi, s);
        pushConstraintSearching(
            hui, i32(bi), fkey,
            bbBasisN, bbCI.x,
            tb[0], bbCI.y,
            tb[1], bbCI.z,
            rH, rB,
            mu,
            wsKey, hui, bi, 0u,
            -1e30, 0.0, 1e30,
        );
    }
    for (var s = satCount; s < MAX_PAIR_CONTACTS; s++) {
        resetWarmstartHash(packKey(hui, bi, s));
    }
}
`, pl = `
${dl}
${tl}

fn detectHullSphere(hui: u32, si: u32) {
    let hBody = bodies[hui];
    let sBody = bodies[si];
    let hm = loadHullMeta(hBody.hullId);
    let hPos = hBody.pos;
    let hQ = hBody.quat;
    let hQc = quatConj(hQ);
    let sPos = sBody.pos;
    let sRadius = sBody.halfExtents.x;
    let S = hullScale(hm, hBody.halfExtents);

    let result = closestPointOnHull(hm, hQc, sPos - hPos, sRadius, S);
    let penetration = result.w;
    if (penetration > COLLISION_MARGIN) {
        for (var s = 0u; s < MAX_PAIR_CONTACTS; s++) {
            resetWarmstartHash(packKey(min(hui, si), max(hui, si), s));
        }
        return;
    }

    let closestWorld = hPos + quatRotate(hQ, result.xyz);
    let diff = sPos - closestWorld;
    let diffLen = length(diff);
    var normal: vec3f;
    if (diffLen < 1e-8) {
        normal = vec3f(0.0, 1.0, 0.0);
    } else {
        normal = diff / diffLen;
    }

    let rH_w = closestWorld - hPos;
    let rS_w = -normal * sRadius;

    emitSingleContact(si, hui, normal, rS_w, rH_w,
        sPos, sBody.quat, hPos, hQ,
        sBody.friction, hBody.friction, 8u << 24u);
}
`, ml = `
${dl}

fn detectHullCapsule(hui: u32, ci: u32) {
    let hBody = bodies[hui];
    let cBody = bodies[ci];
    let hm = loadHullMeta(hBody.hullId);
    let hPos = hBody.pos;
    let hQ = hBody.quat;
    let hQc = quatConj(hQ);
    let capAxis = quatRotate(cBody.quat, vec3f(0.0, cBody.halfExtents.y, 0.0));
    let capR = cBody.halfExtents.x;
    let S = hullScale(hm, hBody.halfExtents);

    let lo = min(hui, ci);
    let hi = max(hui, ci);
    let aIsLo = hui < ci;
    let mu = sqrt(hBody.friction * cBody.friction);

    var contactCount = 0u;
    let epA = cBody.pos + capAxis;
    let epB = cBody.pos - capAxis;

    for (var ep = 0u; ep < 2u; ep++) {
        let sPos = select(epB, epA, ep == 0u);
        let result = closestPointOnHull(hm, hQc, sPos - hPos, capR, S);
        let penetration = result.w;
        if (penetration > COLLISION_MARGIN) { continue; }

        let closestWorld = hPos + quatRotate(hQ, result.xyz);
        let diff = sPos - closestWorld;
        let diffLen = length(diff);
        var normal: vec3f;
        if (diffLen < 1e-8) { normal = vec3f(0.0, 1.0, 0.0); }
        else { normal = diff / diffLen; }

        let rH_w = closestWorld - hPos;
        let rC_w = (sPos - cBody.pos) + (-normal * capR);
        let n = select(normal, -normal, aIsLo);
        let tb = tangentBasis(n);
        let rHL = quatRotate(hQc, rH_w);
        let rCL = quatRotate(quatConj(cBody.quat), rC_w);
        let posLo = select(cBody.pos, hPos, aIsLo);
        let posHi = select(hPos, cBody.pos, aIsLo);
        let rLo_l = select(rCL, rHL, aIsLo);
        let rHi_l = select(rHL, rCL, aIsLo);
        let rLo_w = select(rC_w, rH_w, aIsLo);
        let rHi_w = select(rH_w, rC_w, aIsLo);
        let cInit = contactCInit(posLo, rLo_w, posHi, rHi_w, n, tb[0], tb[1]);
        let fkey = (9u << 24u) | ep;

        pushConstraintSearching(
            lo, i32(hi), fkey,
            n, cInit.x,
            tb[0], cInit.y,
            tb[1], cInit.z,
            rLo_l, rHi_l,
            mu,
            packKey(lo, hi, contactCount), lo, hi, 0u,
            -1e30, 0.0, 1e30,
        );
        contactCount++;
    }
    for (var s = contactCount; s < MAX_PAIR_CONTACTS; s++) {
        resetWarmstartHash(packKey(lo, hi, s));
    }
}
`, hl = `
${dl}

fn detectHullHull(ai: u32, bi: u32) {
    let bA = bodies[ai];
    let bB = bodies[bi];
    let metaA = loadHullMeta(bA.hullId);
    let metaB = loadHullMeta(bB.hullId);
    let posA = bA.pos;
    let posB = bB.pos;
    let qA = bA.quat;
    let qB = bB.quat;
    let d = posB - posA;
    let sA = hullScale(metaA, bA.halfExtents);
    let sB = hullScale(metaB, bB.halfExtents);

    var minPen = 1e30;
    var bestAxis = vec3f(0.0, 1.0, 0.0);
    var separated = false;

    // Face normals from A
    for (var fi = 0u; fi < MAX_HULL_FACES; fi++) {
        if (fi >= metaA.faceCount) { break; }
        let axis = quatRotate(qA, hullFacePlane(metaA, fi, sA).xyz);
        let pA = projectHullOnAxis(metaA, posA, qA, axis, sA);
        let pB = projectHullOnAxis(metaB, posB, qB, axis, sB);
        let pen = min(pA.y - pB.x, pB.y - pA.x);
        if (pen < 0.0) { separated = true; break; }
        if (pen < minPen * 0.95 - 0.01) {
            minPen = pen;
            bestAxis = axis;
            if (dot(d, axis) < 0.0) { bestAxis = -axis; }
        }
    }

    // Face normals from B
    if (!separated) {
        for (var fi = 0u; fi < MAX_HULL_FACES; fi++) {
            if (fi >= metaB.faceCount) { break; }
            let axis = quatRotate(qB, hullFacePlane(metaB, fi, sB).xyz);
            let pA = projectHullOnAxis(metaA, posA, qA, axis, sA);
            let pB = projectHullOnAxis(metaB, posB, qB, axis, sB);
            let pen = min(pA.y - pB.x, pB.y - pA.x);
            if (pen < 0.0) { separated = true; break; }
            if (pen < minPen * 0.95 - 0.01) {
                minPen = pen;
                bestAxis = axis;
                if (dot(d, axis) < 0.0) { bestAxis = -axis; }
            }
        }
    }

    // Edge-edge cross products
    if (!separated) {
        for (var ea = 0u; ea < MAX_HULL_EDGES; ea++) {
            if (ea >= metaA.edgeCount) { break; }
            let edgeA = quatRotate(qA, hullEdge(metaA, ea, sA));
            for (var eb = 0u; eb < MAX_HULL_EDGES; eb++) {
                if (eb >= metaB.edgeCount) { break; }
                let edgeB = quatRotate(qB, hullEdge(metaB, eb, sB));
                var axis = cross(edgeA, edgeB);
                let axLen = length(axis);
                if (axLen < 1e-6) { continue; }
                axis /= axLen;
                let pA = projectHullOnAxis(metaA, posA, qA, axis, sA);
                let pB = projectHullOnAxis(metaB, posB, qB, axis, sB);
                let pen = min(pA.y - pB.x, pB.y - pA.x);
                if (pen < 0.0) { separated = true; break; }
                if (pen < minPen * 0.95 - 0.01) {
                    minPen = pen;
                    bestAxis = axis;
                    if (dot(d, axis) < 0.0) { bestAxis = -axis; }
                }
            }
            if (separated) { break; }
        }
    }

    if (separated) { return; }

    let n = bestAxis;

    // Reference face on A: most aligned with n
    var refFaceIdx = 0u;
    var refDmax = -1e30;
    for (var fi = 0u; fi < MAX_HULL_FACES; fi++) {
        if (fi >= metaA.faceCount) { break; }
        let fn0 = quatRotate(qA, hullFacePlane(metaA, fi, sA).xyz);
        let dd = dot(fn0, n);
        if (dd > refDmax) { refDmax = dd; refFaceIdx = fi; }
    }

    let refPlane = hullFacePlane(metaA, refFaceIdx, sA);
    let refNormal = quatRotate(qA, refPlane.xyz);
    let refIdxBase = hullFaceIdxBase(metaA, refFaceIdx);
    let refIdxCount = hullFaceIdxCount(metaA, refFaceIdx);

    // Incident face on B: most anti-aligned with n
    var incFaceIdx = 0u;
    var incDmin = 1e30;
    for (var fi = 0u; fi < MAX_HULL_FACES; fi++) {
        if (fi >= metaB.faceCount) { break; }
        let fn0 = quatRotate(qB, hullFacePlane(metaB, fi, sB).xyz);
        let dd = dot(fn0, n);
        if (dd < incDmin) { incDmin = dd; incFaceIdx = fi; }
    }

    let incIdxBase = hullFaceIdxBase(metaB, incFaceIdx);
    let incIdxCount = hullFaceIdxCount(metaB, incFaceIdx);

    // Load incident face vertices
    var clipIn: array<vec3f, MAX_CLIP_VERTS>;
    var clipOut: array<vec3f, MAX_CLIP_VERTS>;
    var clipCount = min(incIdxCount, MAX_CLIP_VERTS);
    for (var v = 0u; v < MAX_CLIP_VERTS; v++) {
        if (v >= clipCount) { break; }
        let vi = hullFaceVertIdx(incIdxBase, v);
        clipIn[v] = posB + quatRotate(qB, hullVertex(metaB, vi) * sB);
    }

    // Clip against reference face edge planes
    for (var ei = 0u; ei < MAX_FACE_VERTS; ei++) {
        if (ei >= refIdxCount) { break; }
        let vi = hullFaceVertIdx(refIdxBase, ei);
        let vj = hullFaceVertIdx(refIdxBase, (ei + 1u) % refIdxCount);
        let va = posA + quatRotate(qA, hullVertex(metaA, vi) * sA);
        let vb = posA + quatRotate(qA, hullVertex(metaA, vj) * sA);
        let edge0 = va - vb;
        let planeN = -cross(edge0, refNormal);
        let planeD = dot(va, planeN);
        var outCount = 0u;
        var a = clipIn[clipCount - 1u];
        var da = dot(planeN, a) - planeD;
        for (var v = 0u; v < MAX_CLIP_VERTS; v++) {
            if (v >= clipCount) { break; }
            let b = clipIn[v];
            let db = dot(planeN, b) - planeD;
            if ((da <= 1e-5) != (db <= 1e-5)) {
                var t = 0.0;
                let denom = da - db;
                if (abs(denom) > 1e-6) { t = clamp(da / denom, 0.0, 1.0); }
                if (outCount < MAX_CLIP_VERTS) { clipOut[outCount] = a + (b - a) * t; outCount++; }
            }
            if (db <= 1e-5) {
                if (outCount < MAX_CLIP_VERTS) { clipOut[outCount] = b; outCount++; }
            }
            a = b;
            da = db;
        }
        clipCount = outCount;
        for (var v = 0u; v < MAX_CLIP_VERTS; v++) {
            if (v >= clipCount) { break; }
            clipIn[v] = clipOut[v];
        }
    }

    // Collect all candidates behind reference face
    let localPlaneEq = refPlane.w;
    let worldPlaneEq = localPlaneEq - dot(refNormal, posA);
    var candidates: array<ManifoldCandidate, MAX_CANDIDATES>;
    var candCount = 0u;

    for (var v = 0u; v < MAX_CLIP_VERTS; v++) {
        if (v >= clipCount) { break; }
        let depth = dot(refNormal, clipIn[v]) + worldPlaneEq;
        if (depth <= 0.0 && candCount < MAX_CANDIDATES) {
            let pB0 = clipIn[v];
            let pA0 = pB0 - refNormal * depth;
            candidates[candCount] = ManifoldCandidate(pA0, pB0, depth, v);
            candCount++;
        }
    }

    // Reduce to 4 well-distributed contacts
    var selected: array<u32, 4>;
    let satCount = reduceManifold(&candidates, candCount, n, &selected);

    let bbBasisN = -n;
    let tb = tangentBasis(bbBasisN);
    let mu = sqrt(bA.friction * bB.friction);

    for (var s = 0u; s < satCount; s++) {
        let c = candidates[selected[s]];
        let rA_w = c.pointA - posA;
        let rB_w = c.pointB - posB;
        let rA = quatRotate(quatConj(qA), rA_w);
        let rB = quatRotate(quatConj(qB), rB_w);
        let bbCI = contactCInit(posA, rA_w, posB, rB_w, bbBasisN, tb[0], tb[1]);

        let fkey = (11u << 24u) | s;
        let wsKey = packKey(ai, bi, s);
        pushConstraintSearching(
            ai, i32(bi), fkey,
            bbBasisN, bbCI.x,
            tb[0], bbCI.y,
            tb[1], bbCI.z,
            rA, rB,
            mu,
            wsKey, ai, bi, 0u,
            -1e30, 0.0, 1e30,
        );
    }
    for (var s = satCount; s < MAX_PAIR_CONTACTS; s++) {
        resetWarmstartHash(packKey(ai, bi, s));
    }
}
`, gl = [
	"box-box",
	"sphere-box",
	"capsule-box",
	"sphere-sphere",
	"capsule-sphere",
	"capsule-capsule",
	"hull-box",
	"hull-sphere",
	"hull-capsule",
	"hull-hull"
], _l = [
	rl,
	il,
	al,
	ol,
	ll,
	ul,
	fl,
	pl,
	ml,
	hl
], vl = [
	"detectBoxBox",
	"detectSphereBox",
	"detectCapsuleBox",
	"detectSphereSphere",
	"detectCapsuleSphere",
	"detectCapsuleCapsule",
	"detectHullBox",
	"detectHullSphere",
	"detectHullCapsule",
	"detectHullHull"
];
function yl(e) {
	return `
${el}
${_l[e]}

const PAIR_TYPE: u32 = ${e}u;

@compute @workgroup_size(64)
fn narrowphase(@builtin(global_invocation_id) gid: vec3u) {
    let typeCount = atomicLoad(&solverState[${fc}u + PAIR_TYPE]);
    if (gid.x >= typeCount) { return; }
    let maxPerType = params.capacity * params.constraintMul;
    let base = PAIR_TYPE * maxPerType;
    let pairA = pairs[(base + gid.x) * 2u];
    let pairB = pairs[(base + gid.x) * 2u + 1u];
    ${vl[e]}(pairA, pairB);
}
`;
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/physics/lbvh.ts
var bl = "struct Body {\n    pos: vec3f,\n    mass: f32,\n    vel: vec3f,\n    momentX: f32,\n    angVel: vec3f,\n    radius: f32,\n    inertial: vec3f,\n    friction: f32,\n    initial: vec3f,\n    hullId: u32,\n    quat: vec4f,\n    inertialQuat: vec4f,\n    initialQuat: vec4f,\n    prevVel: vec3f,\n    momentY: f32,\n    prevAngVel: vec3f,\n    momentZ: f32,\n    cumAng: vec3f,\n    gravity: f32,\n    halfExtents: vec3f,\n    colliderType: f32,\n    collisionGroup: u32,\n}", xl = "\nstruct Params {\n    dt: f32,\n    gravity: f32,\n    iterations: u32,\n    alpha: f32,\n    beta: f32,\n    gamma: f32,\n    bodyCount: u32,\n    jointCount: u32,\n    capacity: u32,\n    constraintMul: u32,\n    hashMul: u32,\n    _pad2: u32,\n}", Sl = "\nfn quatMul(a: vec4f, b: vec4f) -> vec4f {\n    return vec4f(\n        a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,\n        a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,\n        a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,\n        a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,\n    );\n}\n\nfn quatConj(q: vec4f) -> vec4f {\n    return vec4f(-q.x, -q.y, -q.z, q.w);\n}\n\nfn quatRotate(q: vec4f, v: vec3f) -> vec3f {\n    let u = q.xyz;\n    let t = 2.0 * cross(u, v);\n    return v + q.w * t + cross(u, t);\n}", Cl = "\nconst SHAPE_BOX: f32 = 0.0;\nconst SHAPE_SPHERE: f32 = 1.0;\nconst SHAPE_CAPSULE: f32 = 2.0;\nconst SHAPE_HULL: f32 = 3.0;\n", wl = `
${bl}
${Ln}
${xl}
${Gn}
${Cl}

@group(0) @binding(0) var<storage, read> bodies: array<Body>;
@group(0) @binding(1) var<storage, read_write> bodyAABBs: array<InstanceAABB>;
@group(0) @binding(2) var<uniform> params: Params;
${Sl}

fn hasNaN(v: vec3f) -> bool {
    return v.x != v.x || v.y != v.y || v.z != v.z;
}

const BROADPHASE_MARGIN: f32 = 0.04;

fn primitiveAABB(body: Body) -> array<vec3f, 2> {
    let margin = vec3f(BROADPHASE_MARGIN);
    if (body.colliderType == SHAPE_SPHERE) {
        let r = vec3f(body.radius);
        return array(body.pos - r - margin, body.pos + r + margin);
    }
    if (body.colliderType == SHAPE_CAPSULE) {
        let axis = quatRotate(body.quat, vec3f(0, body.halfExtents.y, 0));
        let tipA = body.pos + axis;
        let tipB = body.pos - axis;
        let lo = min(tipA, tipB);
        let hi = max(tipA, tipB);
        let r = vec3f(body.radius);
        return array(lo - r - margin, hi + r + margin);
    }
    let h = body.halfExtents;
    let ax = abs(quatRotate(body.quat, vec3f(h.x, 0, 0)));
    let ay = abs(quatRotate(body.quat, vec3f(0, h.y, 0)));
    let az = abs(quatRotate(body.quat, vec3f(0, 0, h.z)));
    let ext = ax + ay + az;
    return array(body.pos - ext - margin, body.pos + ext + margin);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let idx = gid.x;
    if (idx >= params.bodyCount) { return; }

    let body = bodies[idx];
    let aabb = primitiveAABB(body);

    var out: InstanceAABB;
    out._pad0 = 0u;
    out._pad1 = 0u;
    if (hasNaN(aabb[0]) || hasNaN(aabb[1])) {
        out.minX = AABB_SENTINEL;
        out.minY = AABB_SENTINEL;
        out.minZ = AABB_SENTINEL;
        out.maxX = -AABB_SENTINEL;
        out.maxY = -AABB_SENTINEL;
        out.maxZ = -AABB_SENTINEL;
    } else {
        out.minX = aabb[0].x;
        out.minY = aabb[0].y;
        out.minZ = aabb[0].z;
        out.maxX = aabb[1].x;
        out.maxY = aabb[1].y;
        out.maxZ = aabb[1].z;
    }
    bodyAABBs[idx] = out;
}
`;
async function Tl(e, t, n) {
	let r = z(e, "physics-lbvh-bodyAABBs", GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, (e) => e * 32), i = e.createBuffer({
		label: "physics-lbvh-count",
		size: 4,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	}), a = e.createShaderModule({ code: wl }), [o, s] = await Promise.all([e.createComputePipelineAsync({
		label: "physics-aabb",
		layout: "auto",
		compute: {
			module: a,
			entryPoint: "main"
		}
	}), tr(e, {
		leafAABBs: r.buffer,
		countBuffer: i,
		maxLeaves: M(),
		label: "physics-lbvh"
	})]);
	return {
		bodyAABBs: r,
		countBuffer: i,
		lbvh: s,
		computeAABBsPipeline: o,
		computeAABBsBindGroup: cn(e, o.getBindGroupLayout(0), () => [
			{
				binding: 0,
				resource: { buffer: t.buffer }
			},
			{
				binding: 1,
				resource: { buffer: r.buffer }
			},
			{
				binding: 2,
				resource: { buffer: n }
			}
		]),
		cachedCapacity: M()
	};
}
var El = new Uint32Array(1);
function Dl(e, t, n, r, i) {
	let a = M();
	a !== e.cachedCapacity && (e.cachedCapacity = a, nr(e.lbvh, n, e.bodyAABBs.buffer, a)), El[0] = r, n.queue.writeBuffer(e.countBuffer, 0, El);
	let o = Math.ceil(r / 64), s = L(t, i?.("phys:aabb"));
	s.setPipeline(e.computeAABBsPipeline), s.setBindGroup(0, e.computeAABBsBindGroup.group), s.dispatchWorkgroups(o), s.end(), rr(e.lbvh, t, n, r, i);
}
function Ol(e) {
	e.bodyAABBs.buffer.destroy(), e.countBuffer.destroy(), ir(e.lbvh);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/physics/body.ts
var kl = /* @__PURE__ */ new Map(), Al = [];
function jl(e, t, n, r) {
	let i = kl;
	i.clear();
	for (let n = 0; n < t; n++) {
		let t = e[n];
		t > 0 ? i.set(t - 1, !0) : i.set(-t - 1, !1);
	}
	let a = Al;
	a.length = 0;
	for (let [e, t] of i) if (!t || n.indexOf(e) >= 0) {
		let t = n.indexOf(e);
		t >= 0 && a.push(t);
	}
	let o = [];
	if (a.length > 0) {
		a.sort((e, t) => t - e);
		for (let e = 0; e < a.length; e++) {
			let t = a[e], r = n.length - 1;
			t !== r && (n[t] = n[r], o.push({
				removedIdx: t,
				lastIdx: r
			})), n.length--;
		}
	}
	let s = [];
	for (let [e, t] of i) if (t && !(n.indexOf(e) >= 0)) {
		if (n.length >= r) break;
		n.push(e), s.push(e);
	}
	return {
		removeOps: o,
		addEids: s
	};
}
function Ml(e, t, n) {
	let r = e.length + t.length, i = new Float32Array(r * 20), a = new Uint32Array(i.buffer), o = 0;
	for (let t of e) {
		let e = o * 20;
		i[e + 0] = t.anchorAX, i[e + 1] = t.anchorAY, i[e + 2] = t.anchorAZ, a[e + 3] = n.get(t.bodyA) ?? 0, i[e + 4] = t.anchorBX, i[e + 5] = t.anchorBY, i[e + 6] = t.anchorBZ, a[e + 7] = n.get(t.bodyB) ?? 0, a[e + 8] = 0, i[e + 10] = t.stiffness, i[e + 16] = t.fracture, o++;
	}
	for (let e of t) {
		let t = o * 20;
		i[t + 0] = e.anchorAX, i[t + 1] = e.anchorAY, i[t + 2] = e.anchorAZ, a[t + 3] = n.get(e.bodyA) ?? 0, i[t + 4] = e.anchorBX, i[t + 5] = e.anchorBY, i[t + 6] = e.anchorBZ, a[t + 7] = n.get(e.bodyB) ?? 0, a[t + 8] = 1, i[t + 9] = e.restLength, i[t + 10] = e.stiffness, i[t + 16] = e.fracture, o++;
	}
	return i;
}
function Nl(e, t, n) {
	let r = e[4];
	r > 0 && console.warn(`[phys] tick=${t} CONSTRAINT OVERFLOW: ${r}, count=${e[0]}, max=${ec()}, bodies=${n}`);
	let i = e[7];
	i > 12 && console.warn(`[phys] tick=${t} COLOR OVERFLOW: scene needs ${i} colors, max=12`);
	let a = e[6];
	a > 0 && console.warn(`[phys] tick=${t} HASH OVERFLOW: ${a} inserts failed, capacity=${tc()}`);
	let o = e[5];
	o > 0 && console.warn(`[phys] tick=${t} STACK OVERFLOW: ${o} BVH traversals hit limit`);
	let s = e[sc];
	s > 0 && console.warn(`[phys] tick=${t} ADJACENCY OVERFLOW: ${s} edges dropped (MAX_DEGREE=32)`);
	let c = e[lc], l = tc();
	c > l * .75 && console.warn(`[phys] tick=${t} HASH OCCUPANCY: ${c}/${l} (${(c / l * 100).toFixed(1)}%)`);
}
var Pl = We(256), Fl = 12, Il = 4, Ll = 8, Rl = 4;
function zl() {
	let e = Pl.all(), t = e.length;
	if (t === 0) return {
		data: new Uint32Array(Fl),
		metaCount: 0
	};
	let n = 0, r = 0, i = 0, a = 0;
	for (let t of e) {
		n += t.numVertices, r += t.numFaces;
		for (let e of t.faces) i += e.vertexIndices.length;
		a += t.numUniqueEdges;
	}
	let o = t * Fl, s = n * Il, c = r * Ll, l = i, u = a * Rl, d = o + s + c + l + u, f = /* @__PURE__ */ new ArrayBuffer(d * 4), p = new Uint32Array(f), m = new Float32Array(f), h = o, g = h + s, _ = g + c, v = _ + l, y = 0, b = 0, x = 0, S = 0;
	for (let t = 0; t < e.length; t++) {
		let n = e[t], r = t * Fl;
		p[r + 0] = h + y * Il, p[r + 1] = n.numVertices, p[r + 2] = g + b * Ll, p[r + 3] = n.numFaces, p[r + 4] = v + S * Rl, p[r + 5] = n.numUniqueEdges, m[r + 6] = n.extents[0] > 1e-12 ? 1 / n.extents[0] : 0, m[r + 7] = n.extents[1] > 1e-12 ? 1 / n.extents[1] : 0, m[r + 8] = n.extents[2] > 1e-12 ? 1 / n.extents[2] : 0, p[r + 9] = 0, p[r + 10] = 0, p[r + 11] = 0;
		for (let e = 0; e < n.numVertices; e++) {
			let t = h + (y + e) * Il;
			m[t + 0] = n.vertices[e * 3 + 0], m[t + 1] = n.vertices[e * 3 + 1], m[t + 2] = n.vertices[e * 3 + 2], m[t + 3] = 0;
		}
		let i = 0;
		for (let e = 0; e < n.numFaces; e++) {
			let t = n.faces[e], r = g + (b + e) * Ll;
			m[r + 0] = t.plane[0], m[r + 1] = t.plane[1], m[r + 2] = t.plane[2], m[r + 3] = t.plane[3], p[r + 4] = _ + x + i, p[r + 5] = t.vertexIndices.length, p[r + 6] = 0, p[r + 7] = 0;
			for (let e = 0; e < t.vertexIndices.length; e++) p[_ + x + i + e] = t.vertexIndices[e];
			i += t.vertexIndices.length;
		}
		for (let e = 0; e < n.numUniqueEdges; e++) {
			let t = v + (S + e) * Rl;
			m[t + 0] = n.uniqueEdges[e * 3 + 0], m[t + 1] = n.uniqueEdges[e * 3 + 1], m[t + 2] = n.uniqueEdges[e * 3 + 2], m[t + 3] = 0;
		}
		y += n.numVertices, b += n.numFaces, x += i, S += n.numUniqueEdges;
	}
	return {
		data: p,
		metaCount: t
	};
}
Math.PI / 180;
//#endregion
//#region ../../shallot/packages/shallot/src/standard/physics/index.ts
var Bl = N(Float32Array, 4, 0), Vl = {
	mass: F(Bl, 4, 0),
	friction: F(Bl, 4, 1),
	gravity: F(Bl, 4, 2),
	group: F(Bl, 4, 3)
};
P(Vl, {
	requires: [K],
	defaults: () => ({
		mass: 1,
		friction: .5,
		gravity: 1,
		group: 0
	})
});
var Hl = N(Float32Array, 6, 0), Ul = {
	forceX: F(Hl, 6, 0),
	forceY: F(Hl, 6, 1),
	forceZ: F(Hl, 6, 2),
	torqueX: F(Hl, 6, 3),
	torqueY: F(Hl, 6, 4),
	torqueZ: F(Hl, 6, 5)
};
P(Ul, {
	requires: [Vl],
	defaults: () => ({
		forceX: 0,
		forceY: 0,
		forceZ: 0,
		torqueX: 0,
		torqueY: 0,
		torqueZ: 0
	})
});
var Wl = N(Float32Array, 6, 0), Gl = {
	impulseX: F(Wl, 6, 0),
	impulseY: F(Wl, 6, 1),
	impulseZ: F(Wl, 6, 2),
	angularImpulseX: F(Wl, 6, 3),
	angularImpulseY: F(Wl, 6, 4),
	angularImpulseZ: F(Wl, 6, 5)
};
P(Gl, {
	requires: [Vl],
	defaults: () => ({
		impulseX: 0,
		impulseY: 0,
		impulseZ: 0,
		angularImpulseX: 0,
		angularImpulseY: 0,
		angularImpulseZ: 0
	})
});
var Kl = N(Float32Array, 6, 0), ql = {
	linearX: F(Kl, 6, 0),
	linearY: F(Kl, 6, 1),
	linearZ: F(Kl, 6, 2),
	angularX: F(Kl, 6, 3),
	angularY: F(Kl, 6, 4),
	angularZ: F(Kl, 6, 5)
};
P(ql, {
	requires: [Vl],
	defaults: () => ({
		linearX: 0,
		linearY: 0,
		linearZ: 0,
		angularX: 0,
		angularY: 0,
		angularZ: 0
	})
});
var Jl = {
	bodyA: [],
	bodyB: [],
	anchorAX: [],
	anchorAY: [],
	anchorAZ: [],
	anchorBX: [],
	anchorBY: [],
	anchorBZ: [],
	stiffness: [],
	fracture: []
};
P(Jl, { defaults: () => ({
	anchorAX: 0,
	anchorAY: 0,
	anchorAZ: 0,
	anchorBX: 0,
	anchorBY: 0,
	anchorBZ: 0,
	stiffness: 0,
	fracture: 0
}) });
var Yl = {
	bodyA: [],
	bodyB: [],
	anchorAX: [],
	anchorAY: [],
	anchorAZ: [],
	anchorBX: [],
	anchorBY: [],
	anchorBZ: [],
	restLength: [],
	stiffness: [],
	fracture: []
};
P(Yl, { defaults: () => ({
	anchorAX: 0,
	anchorAY: 0,
	anchorAZ: 0,
	anchorBX: 0,
	anchorBY: 0,
	anchorBZ: 0,
	restLength: 0,
	stiffness: 0,
	fracture: 0
}) });
var Xl = N(Float32Array, 4, 0), q = {
	speed: F(Xl, 4, 0),
	maxSlope: F(Xl, 4, 1),
	jumpHeight: F(Xl, 4, 2),
	grounded: F(Xl, 4, 3),
	mass: [],
	gravity: [],
	coyoteTime: [],
	moveX: [],
	moveZ: [],
	jump: []
};
P(q, {
	requires: [Vl],
	defaults: () => ({
		speed: 6,
		maxSlope: .7,
		jumpHeight: 2.5,
		grounded: 0,
		mass: 70,
		gravity: 50,
		coyoteTime: .1,
		moveX: 0,
		moveZ: 0,
		jump: 0
	})
});
var Zl = 64, Ql = {
	dt: 1 / 60,
	gravity: -10,
	iterations: 4,
	alpha: .99,
	betaLin: 1e5,
	betaAng: 100,
	gamma: .999
}, $l = {};
P($l, { requires: [Vl] });
var eu = /* @__PURE__ */ new ArrayBuffer(4);
new Uint32Array(eu), new Int32Array(eu), new Float32Array(eu);
var tu = I("physics"), nu = I("contacts");
function ru(e, t) {
	if (e.pendingChangeCount >= e.pendingChanges.length) {
		let t = new Int32Array(e.pendingChanges.length * 2);
		t.set(e.pendingChanges), e.pendingChanges = t;
	}
	e.pendingChanges[e.pendingChangeCount++] = t;
}
async function iu(e) {
	let t = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, n = t | GPUBufferUsage.COPY_SRC, r = t, i = z(e, "physics-bodies", n, (e) => e * 208), a = z(e, "physics-bodies-prev", t, (e) => e * 208), o = z(e, "physics-bodyCols", t, (e) => e * 5 * 16), s = z(e, "physics-constraints", n, () => ec() * 176), c = z(e, "physics-prevConstraints", n, () => ec() * 176), l = z(e, "physics-warmstarts", t, () => tc() * 64), u = z(e, "physics-solverState", n, () => xc() + Sc()), d = new Uint32Array(tc()).fill(4294967295);
	e.queue.writeBuffer(u.buffer, bc, d);
	let f = {
		buffer: e.createBuffer({
			label: "physics-joints",
			size: 1280,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		}),
		capacity: 16
	}, p = z(e, "physics-csrCounts", GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST, (e) => (e + 1) * 4), m = e.createBuffer({
		label: "physics-indirect",
		size: 276,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT
	}), h = e.createBuffer({
		label: "physics-params",
		size: Zl,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	}), g = z(e, "physics-unpackTransform", n, (e) => e * 8 * 4), _ = z(e, "physics-sizes", r, (e) => e * 16), v = z(e, "physics-shapes", r, (e) => Math.ceil(e / 4) * 4), y = z(e, "physics-bodyProps", r, (e) => e * 16), b = z(e, "physics-eids", r, (e) => e * 4), x = z(e, "physics-forces", t, (e) => e * 32), S = e.createBuffer({
		label: "physics-packParams",
		size: 16,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	}), C = e.createBuffer({
		label: "physics-rebuildParams",
		size: 16,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	}), w = z(e, "physics-pairs", GPUBufferUsage.STORAGE, () => 10 * ec() * 8), T = { buffer: e.createBuffer({
		label: "physics-hullData",
		size: 32,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	}) }, ee = z(e, "physics-hullIds", r, (e) => e * 4), E = e.createShaderModule({ code: Vc }), te = e.createShaderModule({ code: Hc }), D = e.createShaderModule({ code: $c }), O = Array.from({ length: 10 }, (t, n) => e.createShaderModule({ code: yl(n) })), ne = e.createShaderModule({ code: Kc }), re = e.createShaderModule({ code: qc }), ie = e.createShaderModule({ code: Uc }), ae = e.createShaderModule({ code: Jc }), oe = e.createShaderModule({ code: Wc }), se = e.createShaderModule({ code: Gc }), ce = e.createShaderModule({ code: Zc }), le = e.createShaderModule({ code: Qc }), k = GPUShaderStage.COMPUTE, ue = [
		{
			binding: 0,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 1,
			visibility: k,
			buffer: { type: "uniform" }
		},
		{
			binding: 2,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 3,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 4,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 5,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 6,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 7,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 8,
			visibility: k,
			buffer: { type: "read-only-storage" }
		}
	], de = e.createBindGroupLayout({ entries: ue }), fe = e.createBindGroupLayout({ entries: [
		...ue,
		{
			binding: 9,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 10,
			visibility: k,
			buffer: { type: "storage" }
		}
	] }), pe = e.createPipelineLayout({ bindGroupLayouts: [fe] }), me = e.createBindGroupLayout({ entries: [{
		binding: 0,
		visibility: k,
		buffer: { type: "storage" }
	}, {
		binding: 1,
		visibility: k,
		buffer: { type: "read-only-storage" }
	}] }), he = e.createPipelineLayout({ bindGroupLayouts: [de, me] }), ge = e.createBindGroupLayout({ entries: [
		{
			binding: 0,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 1,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 2,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 3,
			visibility: k,
			buffer: { type: "uniform" }
		}
	] }), _e = e.createPipelineLayout({ bindGroupLayouts: [ge] }), ve = e.createBindGroupLayout({ entries: [
		{
			binding: 0,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 1,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 2,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 3,
			visibility: k,
			buffer: { type: "storage" }
		}
	] }), ye = e.createPipelineLayout({ bindGroupLayouts: [ve] }), be = e.createBindGroupLayout({ entries: [
		{
			binding: 0,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 1,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 2,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 3,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 4,
			visibility: k,
			buffer: { type: "storage" }
		},
		{
			binding: 5,
			visibility: k,
			buffer: { type: "read-only-storage" }
		},
		{
			binding: 6,
			visibility: k,
			buffer: { type: "uniform" }
		},
		{
			binding: 7,
			visibility: k,
			buffer: { type: "storage" }
		}
	] }), xe = e.createPipelineLayout({ bindGroupLayouts: [be] }), [Se, Ce, we, Te, Ee, De, Oe, ke, Ae, je, Me, Ne, Pe, Fe, Ie] = await Promise.all([
		Promise.all([
			"warmstartBodies",
			"detectJoints",
			"initBodyCache",
			"cacheContactC",
			"solveDual",
			"advanceIteration",
			"computeVelocities",
			"writebackWarmstarts",
			"solvePrimal",
			"advanceColor",
			"resetColor",
			"syncBodyCols"
		].map(async (t) => [t, await e.createComputePipelineAsync({
			label: t,
			layout: pe,
			compute: {
				module: E,
				entryPoint: t
			}
		})])),
		Promise.all([
			"clearColorBuffers",
			"countBodyConstraints",
			"scatterBodyConstraints",
			"buildAdjacencyList",
			"graphColor",
			"countColors",
			"prefixSumColors",
			"sortBodiesByColor"
		].map(async (t) => [t, await e.createComputePipelineAsync({
			label: t,
			layout: pe,
			compute: {
				module: te,
				entryPoint: t
			}
		})])),
		e.createComputePipelineAsync({
			label: "broadphase",
			layout: he,
			compute: {
				module: D,
				entryPoint: "broadphase"
			}
		}),
		Promise.all(O.map((t, n) => e.createComputePipelineAsync({
			label: `narrowphase-${gl[n]}`,
			layout: he,
			compute: {
				module: t,
				entryPoint: "narrowphase"
			}
		}))),
		e.createComputePipelineAsync({
			label: "packBodies",
			layout: "auto",
			compute: {
				module: ne,
				entryPoint: "packBodies"
			}
		}),
		e.createComputePipelineAsync({
			label: "clearHash",
			layout: _e,
			compute: {
				module: re,
				entryPoint: "clearHash"
			}
		}),
		e.createComputePipelineAsync({
			label: "rebuildWarm",
			layout: _e,
			compute: {
				module: re,
				entryPoint: "rebuildWarm"
			}
		}),
		e.createComputePipelineAsync({
			label: "prepareIndirect",
			layout: "auto",
			compute: {
				module: ie,
				entryPoint: "main"
			}
		}),
		e.createComputePipelineAsync({
			label: "syncTransforms",
			layout: "auto",
			compute: {
				module: ae,
				entryPoint: "syncTransforms"
			}
		}),
		e.createComputePipelineAsync({
			label: "readback",
			layout: "auto",
			compute: {
				module: oe,
				entryPoint: "readback"
			}
		}),
		e.createComputePipelineAsync({
			label: "emitContacts",
			layout: ye,
			compute: {
				module: se,
				entryPoint: "emitContacts"
			}
		}),
		Tl(e, i, h),
		En(e, p.buffer, M() + 1),
		e.createComputePipelineAsync({
			label: "characterSweep",
			layout: xe,
			compute: {
				module: ce,
				entryPoint: "characterSweep"
			}
		}),
		e.createComputePipelineAsync({
			label: "characterApply",
			layout: xe,
			compute: {
				module: le,
				entryPoint: "characterApply"
			}
		})
	]), A = Object.fromEntries([...Se, ...Ce]), Le = cn(e, ge, () => [
		{
			binding: 0,
			resource: {
				buffer: u.buffer,
				offset: bc,
				size: tc() * 4
			}
		},
		{
			binding: 1,
			resource: { buffer: l.buffer }
		},
		{
			binding: 2,
			resource: { buffer: c.buffer }
		},
		{
			binding: 3,
			resource: { buffer: C }
		}
	]), Re = cn(e, ke.getBindGroupLayout(0), () => [{
		binding: 0,
		resource: { buffer: u.buffer }
	}, {
		binding: 1,
		resource: { buffer: m }
	}]), ze = () => [
		{
			binding: 0,
			resource: { buffer: i.buffer }
		},
		{
			binding: 1,
			resource: { buffer: h }
		},
		{
			binding: 2,
			resource: { buffer: s.buffer }
		},
		{
			binding: 3,
			resource: { buffer: l.buffer }
		},
		{
			binding: 4,
			resource: { buffer: f.buffer }
		},
		{
			binding: 5,
			resource: { buffer: u.buffer }
		},
		{
			binding: 6,
			resource: { buffer: Ne.lbvh.treeNodes }
		},
		{
			binding: 7,
			resource: { buffer: Ne.lbvh.sortedIds }
		},
		{
			binding: 8,
			resource: { buffer: Ne.bodyAABBs.buffer }
		}
	], Be = cn(e, de, ze), Ve = cn(e, fe, () => [
		...ze(),
		{
			binding: 9,
			resource: { buffer: x.buffer }
		},
		{
			binding: 10,
			resource: { buffer: o.buffer }
		}
	]), He = cn(e, me, () => [{
		binding: 0,
		resource: { buffer: w.buffer }
	}, {
		binding: 1,
		resource: { buffer: T.buffer }
	}]), Ue = cn(e, Ee.getBindGroupLayout(0), () => [
		{
			binding: 0,
			resource: { buffer: _.buffer }
		},
		{
			binding: 1,
			resource: { buffer: v.buffer }
		},
		{
			binding: 2,
			resource: { buffer: y.buffer }
		},
		{
			binding: 3,
			resource: { buffer: b.buffer }
		},
		{
			binding: 4,
			resource: { buffer: i.buffer }
		},
		{
			binding: 5,
			resource: { buffer: S }
		},
		{
			binding: 6,
			resource: { buffer: g.buffer }
		},
		{
			binding: 7,
			resource: { buffer: ee.buffer }
		}
	]), j = cn(e, Ae.getBindGroupLayout(0), () => [
		{
			binding: 0,
			resource: { buffer: i.buffer }
		},
		{
			binding: 1,
			resource: { buffer: b.buffer }
		},
		{
			binding: 2,
			resource: { buffer: g.buffer }
		},
		{
			binding: 3,
			resource: { buffer: S }
		}
	]), We = z(e, "physics-compact", GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, () => M() * 28), Ge = e.createBuffer({
		label: "physics-compact-params",
		size: 4,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	}), Ke = cn(e, je.getBindGroupLayout(0), () => [
		{
			binding: 0,
			resource: { buffer: i.buffer }
		},
		{
			binding: 1,
			resource: { buffer: We.buffer }
		},
		{
			binding: 2,
			resource: { buffer: Ge }
		}
	]), qe = e.createBuffer({
		label: "physics-contacts",
		size: mc,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
	}), Je = cn(e, ve, () => [
		{
			binding: 0,
			resource: { buffer: i.buffer }
		},
		{
			binding: 1,
			resource: { buffer: s.buffer }
		},
		{
			binding: 2,
			resource: { buffer: u.buffer }
		},
		{
			binding: 3,
			resource: { buffer: qe }
		}
	]), Ye = e.createBuffer({
		label: "physics-character-data",
		size: 64,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	}), Xe = e.createBuffer({
		label: "physics-character-indices",
		size: 16,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	}), Ze = e.createBuffer({
		label: "physics-character-params",
		size: 4,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	}), Qe = e.createBuffer({
		label: "physics-character-ground",
		size: 16,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	}), $e = cn(e, be, () => [
		{
			binding: 0,
			resource: { buffer: i.buffer }
		},
		{
			binding: 1,
			resource: { buffer: Ne.lbvh.treeNodes }
		},
		{
			binding: 2,
			resource: { buffer: Ne.lbvh.sortedIds }
		},
		{
			binding: 3,
			resource: { buffer: Ne.bodyAABBs.buffer }
		},
		{
			binding: 4,
			resource: { buffer: Ye }
		},
		{
			binding: 5,
			resource: { buffer: Xe }
		},
		{
			binding: 6,
			resource: { buffer: Ze }
		},
		{
			binding: 7,
			resource: { buffer: Qe }
		}
	]), N = e.createBuffer({
		label: "physics-character-readback",
		size: 64,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
	}), et = new ArrayBuffer(Zl), tt = e.features.has("timestamp-query") ? cr(e, 1024) : null;
	return {
		device: e,
		lbvh: Ne,
		warmstartPipeline: A.warmstartBodies,
		clearHashPipeline: De,
		rebuildPipeline: Oe,
		bvhTraversalPipeline: we,
		narrowphasePipelines: Te,
		pairBuffer: w,
		pairBindGroup: He,
		detectJointsPipeline: A.detectJoints,
		initBodyCachePipeline: A.initBodyCache,
		cacheContactCPipeline: A.cacheContactC,
		dualPipeline: A.solveDual,
		advancePipeline: A.advanceIteration,
		velocityPipeline: A.computeVelocities,
		writebackPipeline: A.writebackWarmstarts,
		clearColorPipeline: A.clearColorBuffers,
		countBodyConstraintsPipeline: A.countBodyConstraints,
		scatterBodyConstraintsPipeline: A.scatterBodyConstraints,
		buildAdjacencyPipeline: A.buildAdjacencyList,
		graphColorPipeline: A.graphColor,
		countColorsPipeline: A.countColors,
		prefixSumColorsPipeline: A.prefixSumColors,
		sortBodiesPipeline: A.sortBodiesByColor,
		primalPipeline: A.solvePrimal,
		advanceColorPipeline: A.advanceColor,
		resetColorPipeline: A.resetColor,
		syncBodyColsPipeline: A.syncBodyCols,
		prepareIndirectPipeline: ke,
		prepareIndirectBindGroup: Re,
		packPipeline: Ee,
		syncTransformsPipeline: Ae,
		syncTransformsBindGroup: j,
		compactPipeline: je,
		compactBindGroup: Ke,
		compactBuffer: We,
		compactParamsBuffer: Ge,
		emitContactsPipeline: Me,
		emitContactsBindGroup: Je,
		contactsBuffer: qe,
		bodyBuffer: i,
		bodyBufferPrev: a,
		bodyColsBuffer: o,
		constraintsBuffer: s,
		prevConstraintsBuffer: c,
		rebuildParamsBuffer: C,
		warmstartBuffer: l,
		solverStateBuffer: u,
		jointsBuffer: f.buffer,
		jointSlot: f,
		paramsBuffer: h,
		indirectBuffer: m,
		csrCountsBuffer: p,
		csrPrefixSum: Pe,
		unpackTransformBuffer: g,
		sizesBuffer: _,
		shapesBuffer: v,
		bodyPropsBuffer: y,
		eidsBuffer: b,
		packParamsBuffer: S,
		solverBindGroup: Ve,
		narrowBindGroup: Be,
		rebuildBindGroup: Le,
		packBindGroup: Ue,
		hullDataBuffer: T,
		hullIdsBuffer: ee,
		forceBuffer: x,
		paramsData: et,
		paramsView: new DataView(et),
		physicsActive: !1,
		params: { ...Ql },
		bodyEids: [],
		jointCount: 0,
		jointsNeedUpload: !1,
		pendingChanges: new Int32Array(1024),
		pendingChangeCount: 0,
		cachedCapacity: M(),
		profile: tt,
		debugReadbackData: new Uint32Array(pc / 4),
		transformReadbackData: new Float32Array(),
		contactScratch: new Uint32Array(1152),
		contactScratchCount: 0,
		contactScratchOverflow: 0,
		readbackStaging: e.createBuffer({
			label: "physics-readback-staging",
			size: pc + M() * 28 + mc,
			usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
		}),
		readbackPending: !1,
		readbackReady: !1,
		readbackTick: 0,
		readbackGeneration: 0,
		readbackBodyCount: 0,
		lastSyncTick: -1,
		bodyGeneration: 0,
		characterSweepPipeline: Fe,
		characterApplyPipeline: Ie,
		characterSweepBindGroup: $e,
		characterBuffer: Ye,
		characterIndicesBuffer: Xe,
		characterParamsBuffer: Ze,
		characterGroundBuffer: Qe,
		characterCount: 0,
		characters: [],
		characterVerticalVelocity: /* @__PURE__ */ new Map(),
		characterCoyoteTimers: /* @__PURE__ */ new Map(),
		characterReadbackStaging: N,
		characterReadbackPending: !1
	};
}
var au = new Uint32Array(4), ou = new Uint32Array(M()), su = new Uint32Array(4), cu = M();
function lu() {
	let e = M();
	e !== cu && (cu = e, ou = new Uint32Array(e));
}
var uu = new Uint32Array();
function du(e) {
	let t = zl(), n = t.data.byteLength;
	n !== 0 && (n > e.hullDataBuffer.buffer.size && (e.hullDataBuffer.buffer.destroy(), e.hullDataBuffer.buffer = e.device.createBuffer({
		label: "physics-hullData",
		size: n,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	}), e.pairBindGroup.invalidate()), e.device.queue.writeBuffer(e.hullDataBuffer.buffer, 0, t.data));
}
function fu(e) {
	let t = e.bodyEids.length;
	if (t !== 0) {
		uu.length < t && (uu = new Uint32Array(t));
		for (let n = 0; n < t; n++) {
			let t = e.bodyEids[n];
			if (K.shape[t] === j.Mesh) {
				let e = qo.geometry[t];
				uu[n] = Pl.getByName(String(e)) ?? 0;
			} else uu[n] = 0;
		}
		e.device.queue.writeBuffer(e.hullIdsBuffer.buffer, 0, uu, 0, t);
	}
}
function pu(e, t) {
	let n = t.bodyEids, r = /* @__PURE__ */ new Map();
	for (let e = 0; e < n.length; e++) r.set(n[e], e);
	let i = [];
	for (let t of e.query([Jl])) i.push({
		anchorAX: Jl.anchorAX[t] ?? 0,
		anchorAY: Jl.anchorAY[t] ?? 0,
		anchorAZ: Jl.anchorAZ[t] ?? 0,
		bodyA: Jl.bodyA[t],
		anchorBX: Jl.anchorBX[t] ?? 0,
		anchorBY: Jl.anchorBY[t] ?? 0,
		anchorBZ: Jl.anchorBZ[t] ?? 0,
		bodyB: Jl.bodyB[t],
		stiffness: Jl.stiffness[t] ?? 0,
		fracture: Jl.fracture[t] ?? 0
	});
	let a = [];
	for (let t of e.query([Yl])) a.push({
		anchorAX: Yl.anchorAX[t] ?? 0,
		anchorAY: Yl.anchorAY[t] ?? 0,
		anchorAZ: Yl.anchorAZ[t] ?? 0,
		bodyA: Yl.bodyA[t],
		anchorBX: Yl.anchorBX[t] ?? 0,
		anchorBY: Yl.anchorBY[t] ?? 0,
		anchorBZ: Yl.anchorBZ[t] ?? 0,
		bodyB: Yl.bodyB[t],
		stiffness: Yl.stiffness[t] ?? 0,
		fracture: Yl.fracture[t] ?? 0,
		restLength: Yl.restLength[t] ?? 0
	});
	let o = i.length + a.length;
	if (t.jointCount = o, o === 0) return;
	let s = t.jointSlot;
	o > s.capacity && (s.buffer.destroy(), s.capacity = o, s.buffer = t.device.createBuffer({
		label: "physics-joints",
		size: o * 80,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	}), t.jointsBuffer = s.buffer, t.solverBindGroup.invalidate(), t.narrowBindGroup.invalidate());
	let c = Ml(i, a, r);
	t.device.queue.writeBuffer(s.buffer, 0, c);
}
function mu(e, t, n) {
	if (e.pendingChangeCount === 0 && !e.jointsNeedUpload) return;
	let { removeOps: r, addEids: i } = jl(e.pendingChanges, e.pendingChangeCount, e.bodyEids, M());
	e.pendingChangeCount = 0;
	let a = i.length, o = e.bodyEids.length - a, s = e.bodyEids.length, c = e.device.queue;
	if (a > 0) {
		let n = t.max + 1;
		lu(), nt(c, e.sizesBuffer.buffer, 0, Io, n), nt(c, e.shapesBuffer.buffer, 0, Po, n), nt(c, e.bodyPropsBuffer.buffer, 0, Bl, n), du(e), fu(e);
	}
	if (a > 0 || r.length > 0) {
		lu();
		for (let t = 0; t < s; t++) ou[t] = e.bodyEids[t];
		c.writeBuffer(e.eidsBuffer.buffer, 0, ou, 0, s), e.bodyGeneration++;
	}
	su[0] = s, su[1] = M(), su[2] = o, c.writeBuffer(e.packParamsBuffer, 0, su);
	for (let t = 0; t < r.length; t++) {
		let { removedIdx: i, lastIdx: a } = r[t];
		n.copyBufferToBuffer(e.bodyBuffer.buffer, a * 208, e.bodyBuffer.buffer, i * 208, 208), n.copyBufferToBuffer(e.bodyBufferPrev.buffer, a * 208, e.bodyBufferPrev.buffer, i * 208, 208);
	}
	if (a > 0) {
		let t = L(n);
		t.setPipeline(e.packPipeline), t.setBindGroup(0, e.packBindGroup.group), t.dispatchWorkgroups(Math.ceil(s / 64)), t.end();
	}
	(r.length > 0 || e.jointsNeedUpload) && (pu(t, e), e.jointsNeedUpload = !1);
}
function hu(e, t) {
	let n = e.paramsView;
	n.setFloat32(0, e.params.dt, !0), n.setFloat32(4, e.params.gravity, !0), n.setUint32(8, e.params.iterations, !0), n.setFloat32(12, e.params.alpha, !0), n.setFloat32(16, e.params.betaLin, !0), n.setFloat32(20, e.params.gamma, !0), n.setUint32(24, t, !0), n.setUint32(28, e.jointCount, !0), n.setUint32(32, M(), !0), n.setUint32(36, ec() / M(), !0), n.setUint32(40, tc() / M(), !0), n.setFloat32(44, e.params.betaAng, !0), n.setUint32(48, 0, !0), n.setUint32(52, 0, !0), n.setUint32(56, 0, !0), n.setUint32(60, 0, !0), e.device.queue.writeBuffer(e.paramsBuffer, 0, e.paramsData);
}
var J = new Float32Array(), gu = /* @__PURE__ */ new Map(), _u = [];
function vu(e, t) {
	let n = e.bodyEids.length;
	if (n === 0) return;
	let r = e.bodyEids, i = gu;
	i.clear();
	for (let e = 0; e < r.length; e++) i.set(r[e], e);
	let a = n * 8;
	J.length < a ? J = new Float32Array(a) : J.fill(0, 0, a);
	let o = !1;
	for (let e of t.query([Ul])) {
		let t = i.get(e);
		if (t === void 0) continue;
		o = !0;
		let n = t * 8;
		J[n] = Ul.forceX[e], J[n + 1] = Ul.forceY[e], J[n + 2] = Ul.forceZ[e], J[n + 3] = Ul.torqueX[e], J[n + 4] = Ul.torqueY[e], J[n + 5] = Ul.torqueZ[e];
	}
	_u.length = 0;
	let s = 1 / e.params.dt;
	for (let e of t.query([Gl])) {
		let t = i.get(e);
		if (t === void 0) continue;
		o = !0;
		let n = t * 8;
		J[n] += Gl.impulseX[e] * s, J[n + 1] += Gl.impulseY[e] * s, J[n + 2] += Gl.impulseZ[e] * s, J[n + 3] += Gl.angularImpulseX[e] * s, J[n + 4] += Gl.angularImpulseY[e] * s, J[n + 5] += Gl.angularImpulseZ[e] * s, _u.push(e);
	}
	for (let e of _u) t.removeComponent(e, Gl);
	_u.length = 0;
	for (let e of t.query([ql])) {
		let t = i.get(e);
		if (t === void 0) continue;
		o = !0;
		let n = t * 8;
		J[n] = ql.linearX[e], J[n + 1] = ql.linearY[e], J[n + 2] = ql.linearZ[e], J[n + 3] = ql.angularX[e], J[n + 4] = ql.angularY[e], J[n + 5] = ql.angularZ[e], J[n + 6] = 1, _u.push(e);
	}
	for (let e of _u) t.removeComponent(e, ql);
	o && e.device.queue.writeBuffer(e.forceBuffer.buffer, 0, J, 0, a);
}
var yu = new Float32Array();
function bu(e, t) {
	if (e.bodyEids.length === 0) return;
	let n = M(), r = e.device.queue, i = e.unpackTransformBuffer.buffer;
	r.writeBuffer(i, 0, V.posX, 0, n), r.writeBuffer(i, n * 4, V.posY, 0, n), r.writeBuffer(i, 2 * n * 4, V.posZ, 0, n), r.writeBuffer(i, 3 * n * 4, V.quatX, 0, n), r.writeBuffer(i, 4 * n * 4, V.quatY, 0, n), r.writeBuffer(i, 5 * n * 4, V.quatZ, 0, n), r.writeBuffer(i, 6 * n * 4, V.quatW, 0, n), yu.length < n ? yu = new Float32Array(n) : yu.fill(0);
	for (let n of e.bodyEids) t.hasComponent(n, $l) && (yu[n] = 1);
	r.writeBuffer(i, 7 * n * 4, yu, 0, n);
}
var xu = 8, Su = xu * 4, Cu = new Float32Array(), wu = new Uint32Array(), Tu = new Uint32Array(1), Eu = /* @__PURE__ */ new Map();
function Du(e) {
	let t = e.characters, n = t.length;
	if (e.characterCount = n, n === 0) return;
	let r = e.bodyEids;
	Eu.clear();
	for (let e = 0; e < r.length; e++) Eu.set(r[e], e);
	wu.length < n && (wu = new Uint32Array(n)), Cu.length < n * xu && (Cu = new Float32Array(n * xu)), Cu.fill(0, 0, n * xu);
	for (let e = 0; e < n; e++) {
		let n = t[e];
		wu[e] = Eu.get(n) ?? 0, Cu[e * xu] = q.maxSlope[n], Cu[e * xu + 5] = q.mass[n];
	}
	let i = n * 4;
	e.characterIndicesBuffer.size < i && (e.characterIndicesBuffer.destroy(), e.characterIndicesBuffer = e.device.createBuffer({
		label: "physics-character-indices",
		size: i,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	}), e.characterSweepBindGroup.invalidate()), e.device.queue.writeBuffer(e.characterIndicesBuffer, 0, wu, 0, n);
	let a = n * Su;
	e.characterBuffer.size < a && (e.characterBuffer.destroy(), e.characterBuffer = e.device.createBuffer({
		label: "physics-character-data",
		size: a,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	}), e.characterSweepBindGroup.invalidate());
	let o = n * 4;
	if (e.characterGroundBuffer.size < o) {
		e.characterGroundBuffer.destroy(), e.characterGroundBuffer = e.device.createBuffer({
			label: "physics-character-ground",
			size: o,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		}), e.characterSweepBindGroup.invalidate();
		let t = new Uint32Array(n);
		t.fill(4294967295), e.device.queue.writeBuffer(e.characterGroundBuffer, 0, t);
	}
	Tu[0] = n, e.device.queue.writeBuffer(e.characterParamsBuffer, 0, Tu);
}
function Ou(e) {
	e.characterCount !== 0 && e.device.queue.writeBuffer(e.characterBuffer, 0, Cu, 0, e.characterCount * xu);
}
function ku(e) {
	let t = e.params.dt, n = e.characterVerticalVelocity, r = e.characterCoyoteTimers;
	for (let i = 0; i < e.characters.length; i++) {
		let a = e.characters[i], o = q.grounded[a] > .5, s = q.coyoteTime[a] ?? .1, c = r.get(a) ?? 0, l = q.gravity[a] ?? 50, u = Math.sqrt(2 * l * q.jumpHeight[a]), d = q.jump[a] > .5, f = n.get(a) ?? 0;
		o ? (c = s, f = 0, d && (f = u, c = 0)) : (c -= t, f -= l * t, c > 0 && d && (f = u, c = 0)), n.set(a, f), r.set(a, c);
		let p = i * xu;
		Cu[p + 2] = q.moveX[a] * t, Cu[p + 3] = f * t, Cu[p + 4] = q.moveZ[a] * t;
	}
}
function Au(e) {
	if (e.characterCount === 0 || e.characterReadbackPending) return;
	let t = e.characterCount * Su;
	e.characterReadbackStaging.size < t && (e.characterReadbackStaging.destroy(), e.characterReadbackStaging = e.device.createBuffer({
		label: "physics-character-readback",
		size: t,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
	})), e.characterReadbackPending = !0;
	let n = e.bodyGeneration, r = e.characterCount, i = e.characters.slice(), a = e.device.createCommandEncoder();
	a.copyBufferToBuffer(e.characterBuffer, 0, e.characterReadbackStaging, 0, t), e.device.queue.submit([a.finish()]), e.characterReadbackStaging.mapAsync(GPUMapMode.READ, 0, t).then(() => {
		if (e.bodyGeneration !== n) {
			e.characterReadbackStaging.unmap(), e.characterReadbackPending = !1;
			return;
		}
		let a = e.characterReadbackStaging.getMappedRange(0, t), o = new Uint32Array(a);
		for (let e = 0; e < r && e < i.length; e++) q.grounded[i[e]] = +(o[e * xu + 1] > 0);
		e.characterReadbackStaging.unmap(), e.characterReadbackPending = !1;
	}, () => {
		e.characterReadbackPending = !1;
	});
}
function Y(e, t, n, r, i) {
	let a = L(e, i);
	a.setPipeline(t), a.setBindGroup(0, n), a.dispatchWorkgroups(r), a.end();
}
function ju(e, t, n, r, i, a) {
	let o = L(e, a);
	o.setPipeline(t), o.setBindGroup(0, n), o.dispatchWorkgroupsIndirect(r, i), o.end();
}
function Mu(e, t, n) {
	let r = Math.ceil(t / 64), i = e.profile;
	i && (mr(i), dr(i));
	let a = Math.ceil(tc() / 64), o = e.rebuildBindGroup.group, s = (e) => i ? ur(i, e) : void 0;
	au[0] = 0, au[1] = tc(), au[2] = 0, au[3] = 0, e.device.queue.writeBuffer(e.rebuildParamsBuffer, 0, au);
	let c = e.debugReadbackData[0], l = c > 0 ? c * 176 : ec() * 176;
	n.copyBufferToBuffer(e.solverStateBuffer.buffer, 0, e.rebuildParamsBuffer, 0, 4), Y(n, e.prepareIndirectPipeline, e.prepareIndirectBindGroup.group, 1), Y(n, e.syncTransformsPipeline, e.syncTransformsBindGroup.group, r), e.characterCount > 0 && Y(n, e.characterApplyPipeline, e.characterSweepBindGroup.group, Math.ceil(e.characterCount / 64), s("phys:characterApply")), n.copyBufferToBuffer(e.bodyBuffer.buffer, 0, e.bodyBufferPrev.buffer, 0, t * 208), n.copyBufferToBuffer(e.constraintsBuffer.buffer, 0, e.prevConstraintsBuffer.buffer, 0, l), Y(n, e.clearHashPipeline, o, a, s("phys:rebuild")), ju(n, e.rebuildPipeline, o, e.indirectBuffer, 144, s("phys:rebuild")), Dl(e.lbvh, n, e.device, t, s), n.clearBuffer(e.solverStateBuffer.buffer, 0, pc);
	let u = e.solverBindGroup.group, d = e.narrowBindGroup.group, f = e.pairBindGroup.group, p = L(n, s("phys:broadphase"));
	p.setPipeline(e.bvhTraversalPipeline), p.setBindGroup(0, d), p.setBindGroup(1, f), p.dispatchWorkgroups(r), p.end(), Y(n, e.prepareIndirectPipeline, e.prepareIndirectBindGroup.group, 1);
	let m = L(n, s("phys:narrowphase"));
	for (let t = 0; t < 10; t++) m.setPipeline(e.narrowphasePipelines[t]), m.setBindGroup(0, d), m.setBindGroup(1, f), m.dispatchWorkgroupsIndirect(e.indirectBuffer, (13 + t) * 12);
	m.end(), Y(n, e.detectJointsPipeline, u, Math.ceil(e.jointSlot.capacity / 64), s("phys:broadphase")), Y(n, e.warmstartPipeline, u, r, s("phys:warmstart")), n.clearBuffer(e.forceBuffer.buffer, 0, t * 32), Y(n, e.prepareIndirectPipeline, e.prepareIndirectBindGroup.group, 1), Y(n, e.initBodyCachePipeline, u, r, s("phys:warmstart")), ju(n, e.cacheContactCPipeline, u, e.indirectBuffer, 144, s("phys:warmstart")), Y(n, e.clearColorPipeline, u, r, s("phys:coloring")), ju(n, e.countBodyConstraintsPipeline, u, e.indirectBuffer, 144, s("phys:coloring")), n.copyBufferToBuffer(e.solverStateBuffer.buffer, xc() + gc() * 4, e.csrCountsBuffer.buffer, 0, (M() + 1) * 4);
	{
		let t = L(n, s("phys:coloring"));
		kn(e.csrPrefixSum, t), t.end();
	}
	n.copyBufferToBuffer(e.csrCountsBuffer.buffer, 0, e.solverStateBuffer.buffer, xc() + hc() * 4, (M() + 1) * 4), n.copyBufferToBuffer(e.csrCountsBuffer.buffer, 0, e.solverStateBuffer.buffer, xc() + gc() * 4, (M() + 1) * 4), ju(n, e.scatterBodyConstraintsPipeline, u, e.indirectBuffer, 144, s("phys:coloring"));
	let h = e.params.iterations;
	Y(n, e.buildAdjacencyPipeline, u, r, s("phys:coloring"));
	for (let t = 0; t < 16; t++) Y(n, e.graphColorPipeline, u, r, s("phys:coloring"));
	Y(n, e.countColorsPipeline, u, r, s("phys:coloring")), Y(n, e.prefixSumColorsPipeline, u, 1, s("phys:coloring")), Y(n, e.prepareIndirectPipeline, e.prepareIndirectBindGroup.group, 1, s("phys:coloring")), Y(n, e.sortBodiesPipeline, u, r, s("phys:coloring")), Y(n, e.syncBodyColsPipeline, u, r, s("phys:solve"));
	let g = e.debugReadbackData[7] | 0, _ = g > 0 ? Math.min(12, g + 2) : 12;
	for (let t = 0; t < h; t++) {
		for (let t = 0; t < _; t++) ju(n, e.primalPipeline, u, e.indirectBuffer, t * 12, s("phys:solve")), t < _ - 1 && Y(n, e.advanceColorPipeline, u, 1);
		Y(n, e.resetColorPipeline, u, 1), ju(n, e.dualPipeline, u, e.indirectBuffer, 144, s("phys:dual")), Y(n, e.advancePipeline, u, 1, s("phys:dual"));
	}
	if (Y(n, e.velocityPipeline, u, r, s("phys:dual")), ju(n, e.writebackPipeline, u, e.indirectBuffer, 144, s("phys:writeback")), ju(n, e.emitContactsPipeline, e.emitContactsBindGroup.group, e.indirectBuffer, 144, s("phys:contacts")), e.characterCount > 0) {
		Y(n, e.characterSweepPipeline, e.characterSweepBindGroup.group, Math.ceil(e.characterCount / 64), s("phys:characterSweep"));
		for (let t = 0; t < e.characterCount; t++) {
			let r = wu[t];
			n.copyBufferToBuffer(e.bodyBuffer.buffer, r * 208, e.bodyBufferPrev.buffer, r * 208, 208);
		}
	}
	i && fr(n, i), e.physicsActive = !0, e.device.pushErrorScope("validation"), e.device.queue.submit([n.finish()]), e.device.popErrorScope().then((e) => {
		e && console.error("PHYSICS VALIDATION ERROR:", e.message);
	});
}
var Nu = new Uint32Array(1);
function Pu(e, t) {
	if (e.readbackPending) return;
	let n = e.bodyEids.length;
	if (n === 0) return;
	e.readbackPending = !0, e.readbackGeneration = e.bodyGeneration, e.readbackBodyCount = n, e.readbackTick = t;
	let r = n * 28, i = pc + r, a = i + mc;
	e.readbackStaging.size < a && (e.readbackStaging.destroy(), e.readbackStaging = e.device.createBuffer({
		label: "physics-readback-staging",
		size: a,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
	})), e.transformReadbackData.length < n * 7 && (e.transformReadbackData = new Float32Array(n * 7)), Nu[0] = n, e.device.queue.writeBuffer(e.compactParamsBuffer, 0, Nu);
	let o = e.device.createCommandEncoder(), s = Math.ceil(n / 64);
	Y(o, e.compactPipeline, e.compactBindGroup.group, s), o.copyBufferToBuffer(e.solverStateBuffer.buffer, 0, e.readbackStaging, 0, pc), o.copyBufferToBuffer(e.compactBuffer.buffer, 0, e.readbackStaging, pc, r), o.copyBufferToBuffer(e.contactsBuffer, 0, e.readbackStaging, i, mc), e.device.queue.submit([o.finish()]), e.readbackStaging.mapAsync(GPUMapMode.READ, 0, a).then(() => {
		if (e.readbackGeneration !== e.bodyGeneration) {
			e.readbackStaging.unmap(), e.readbackPending = !1;
			return;
		}
		let t = e.readbackStaging.getMappedRange(0, a), r = new ArrayBuffer(a);
		new Uint8Array(r).set(new Uint8Array(t)), e.readbackStaging.unmap(), e.debugReadbackData.set(new Uint32Array(r, 0, pc / 4)), e.transformReadbackData.set(new Float32Array(r, pc, n * 7)), e.contactScratch.set(new Uint32Array(r, i, 1152)), e.readbackReady = !0, e.readbackPending = !1;
	}, () => {
		e.readbackPending = !1;
	});
}
function Fu(e, t) {
	if (t.readbackGeneration !== t.bodyGeneration) return;
	let n = t.readbackTick, r = t.readbackBodyCount;
	Nl(t.debugReadbackData, n, r);
	let i = t.debugReadbackData[uc], a = t.debugReadbackData[dc];
	t.contactScratchCount = Math.min(i, 128), t.contactScratchOverflow = a, a > 0 && console.warn(`[phys] tick=${n} CONTACT OVERFLOW: ${a} dropped (cap=128)`);
	let o = nu.from(e);
	if (o) {
		let e = o.prevData;
		o.prevData = o.currentData, o.prevCount = o.currentCount, o.prevOverflow = o.currentOverflow, o.prevTick = o.currentTick, o.currentData = e, o.currentData.set(t.contactScratch), o.currentCount = t.contactScratchCount, o.currentOverflow = a, o.currentTick = n;
	}
	let s = t.transformReadbackData, { posX: c, posY: l, posZ: u, quatX: d, quatY: f, quatZ: p, quatW: m } = pi, h = t.bodyEids, g = t.characters;
	for (let e = 0; e < r; e++) {
		let t = h[e];
		if (Vl.mass[t] <= 0 && !g.includes(t)) continue;
		let n = e * 7;
		c[t] = s[n], l[t] = s[n + 1], u[t] = s[n + 2], d[t] = s[n + 3], f[t] = s[n + 4], p[t] = s[n + 5], m[t] = s[n + 6];
	}
	t.lastSyncTick = n;
}
var Iu = {
	group: "fixed",
	dispose(e) {
		let t = tu.from(e);
		t && (t.bodyBuffer.buffer.destroy(), t.bodyBufferPrev.buffer.destroy(), t.bodyColsBuffer.buffer.destroy(), t.constraintsBuffer.buffer.destroy(), t.prevConstraintsBuffer.buffer.destroy(), t.rebuildParamsBuffer.destroy(), t.warmstartBuffer.buffer.destroy(), t.solverStateBuffer.buffer.destroy(), t.jointsBuffer.destroy(), t.paramsBuffer.destroy(), t.indirectBuffer.destroy(), t.csrCountsBuffer.buffer.destroy(), t.unpackTransformBuffer.buffer.destroy(), t.sizesBuffer.buffer.destroy(), t.shapesBuffer.buffer.destroy(), t.bodyPropsBuffer.buffer.destroy(), t.eidsBuffer.buffer.destroy(), t.packParamsBuffer.destroy(), t.readbackStaging.destroy(), t.compactBuffer.buffer.destroy(), t.compactParamsBuffer.destroy(), t.pairBuffer.buffer.destroy(), t.hullDataBuffer.buffer.destroy(), t.hullIdsBuffer.buffer.destroy(), t.characterBuffer.destroy(), t.characterIndicesBuffer.destroy(), t.characterParamsBuffer.destroy(), t.characterGroundBuffer.destroy(), t.characterReadbackStaging.destroy(), On(t.csrPrefixSum), Ol(t.lbvh), t.profile && (t.profile.querySet.destroy(), t.profile.resolveBuffer.destroy(), t.profile.readBuffer.destroy()));
	},
	update(e) {
		let t = tu.from(e);
		if (!t) return;
		if (M() !== t.cachedCapacity) {
			t.cachedCapacity = M(), Dn(t.csrPrefixSum, t.csrCountsBuffer.buffer, M() + 1);
			for (let e of t.bodyEids) ru(t, e + 1);
			t.bodyEids.length = 0;
		}
		t.readbackReady &&= (Fu(e, t), !1);
		let n = t.device.createCommandEncoder();
		mu(t, e, n), Du(t), ku(t), Ou(t), bu(t, e), vu(t, e);
		let r = t.bodyEids.length;
		if (r === 0) {
			t.device.queue.submit([n.finish()]);
			return;
		}
		hu(t, r), Mu(t, r, n), t.profile && pr(t.profile), Pu(t, e.time.fixedTick), Au(t);
	}
};
function Lu(e, t, n, r, i, a) {
	let o = null, s = null, c = null, l = null, u = null;
	return {
		name: "physics-interpolation",
		scope: "frame",
		inputs: ["matrices"],
		outputs: ["matrices"],
		async prepare(n) {
			let r = n.createShaderModule({ code: Yc });
			o = await n.createComputePipelineAsync({
				label: "interpolate",
				layout: "auto",
				compute: {
					module: r,
					entryPoint: "interpolate"
				}
			}), c = n.createBuffer({
				label: "interp-params",
				size: 8,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
			});
			let i = c;
			s = cn(n, o.getBindGroupLayout(0), () => [
				{
					binding: 0,
					resource: { buffer: e.bodyBufferPrev.buffer }
				},
				{
					binding: 1,
					resource: { buffer: e.bodyBuffer.buffer }
				},
				{
					binding: 2,
					resource: { buffer: e.eidsBuffer.buffer }
				},
				{
					binding: 3,
					resource: { buffer: i }
				},
				{
					binding: 4,
					resource: { buffer: t.buffer }
				}
			]), l = new Float32Array(2), u = new Uint32Array(l.buffer);
		},
		execute(e) {
			if (!o || !s || !c || !l || !u || !i() || a()) return;
			let t = r();
			if (t === 0) return;
			l[0] = n(), u[1] = t, e.queue.writeBuffer(c, 0, l);
			let d = L(e.encoder, e.timestampWrites?.("physics-interpolation"));
			d.setPipeline(o), d.setBindGroup(0, s.group), d.dispatchWorkgroups(Math.ceil(t / 64)), d.end();
		}
	};
}
var Ru = {
	name: "Physics",
	dependencies: [fn, Zs],
	systems: [Iu],
	components: {
		Body: Vl,
		Force: Ul,
		Impulse: Gl,
		Velocity: ql,
		BallJoint: Jl,
		SpringJoint: Yl,
		Character: q,
		Move: $l
	},
	async initialize(e) {
		let t = un.from(e);
		if (!t) {
			console.error("PhysicsPlugin: Compute resource not available");
			return;
		}
		let n = await iu(t.device);
		e.setResource(tu, n), e.setResource(nu, {
			prevData: new Uint32Array(1152),
			prevCount: 0,
			prevOverflow: 0,
			prevTick: -1,
			currentData: new Uint32Array(1152),
			currentCount: 0,
			currentOverflow: 0,
			currentTick: -1
		}), e.observe(c(Vl), (e) => ru(n, e + 1)), e.observe(l(Vl), (e) => ru(n, -(e + 1)));
		let r = () => {
			n.jointsNeedUpload = !0;
		};
		e.observe(c(Jl), r), e.observe(l(Jl), r), e.observe(c(Yl), r), e.observe(l(Yl), r), e.observe(c(q), (e) => {
			n.characters.push(e);
		}), e.observe(l(q), (e) => {
			let t = n.characters.indexOf(e);
			t >= 0 && n.characters.splice(t, 1), n.characterVerticalVelocity.delete(e), n.characterCoyoteTimers.delete(e);
		});
		let i = Xs.from(e);
		if (i) {
			let r = Lu(n, i.matrices, () => e.scheduler.accumulator / _e.FIXED_DT, () => n.bodyEids.length, () => n.physicsActive, () => n.pendingChangeCount > 0);
			t.graph.add(r);
		}
		n.profile && sr.from(e)?.push(n.profile.durations);
	}
}, X = {
	yaw: [],
	pitch: [],
	speed: [],
	sprint: [],
	sensitivity: [],
	eyeHeight: [],
	jumpBuffer: []
};
P(X, {
	requires: [V],
	defaults: () => ({
		yaw: 0,
		pitch: 0,
		speed: 6,
		sprint: 1,
		sensitivity: 1.5,
		eyeHeight: .7,
		jumpBuffer: .1
	})
});
var zu = I("pointerLock"), Bu = Math.PI / 2 - .01, Vu = /* @__PURE__ */ new Map(), Hu = /* @__PURE__ */ new Map(), Uu = /* @__PURE__ */ new Map();
function Wu(e, t) {
	let n = Vu.get(t);
	if (n !== void 0) return n;
	for (let r of e.query([re(fe.relation, t), U])) {
		n = r;
		break;
	}
	if (n === void 0) return console.warn(`Player entity ${t} has Character but no Camera child. Add a camera entity as a child.`), -1;
	Vu.set(t, n);
	let r = new Float64Array(3), i = new Float64Array(3);
	return r[0] = i[0] = V.posX[t], r[1] = i[1] = V.posY[t], r[2] = i[2] = V.posZ[t], Hu.set(t, r), Uu.set(t, i), n;
}
var Gu = {
	name: "Player",
	systems: [{
		group: "fixed",
		last: !0,
		update(e) {
			for (let t of e.query([
				X,
				q,
				V
			])) {
				let e = Hu.get(t), n = Uu.get(t);
				!e || !n || (e[0] = n[0], e[1] = n[1], e[2] = n[2], n[0] = V.posX[t], n[1] = V.posY[t], n[2] = V.posZ[t]);
			}
		}
	}, {
		group: "simulation",
		setup(e) {
			let t = gr.from(e);
			if (!t || t.size === 0) return;
			let n = t.values().next().value.element;
			if (!n) return;
			let r = {
				canvas: n,
				locked: !1,
				deltaX: 0,
				deltaY: 0,
				onClick: () => {
					let t = !1;
					for (let n of e.query([X])) {
						t = !0;
						break;
					}
					t && n.requestPointerLock().catch(() => {});
				},
				onChange: () => {
					r.locked = document.pointerLockElement === n, r.locked && document.activeElement instanceof HTMLElement && document.activeElement.blur();
				},
				onMove: (e) => {
					r.locked && (r.deltaX += e.movementX, r.deltaY += e.movementY);
				}
			};
			n.addEventListener("click", r.onClick), document.addEventListener("pointerlockchange", r.onChange), document.addEventListener("mousemove", r.onMove), e.setResource(zu, r), e.observe(l(X), (e) => {
				Vu.delete(e), Hu.delete(e), Uu.delete(e);
			});
		},
		update(e) {
			let t = Nr.from(e), n = zu.from(e);
			if (!t || !n) return;
			let r = e.time.deltaTime;
			for (let i of e.query([X, V])) {
				let a = e.hasComponent(i, q);
				if (n.locked) {
					let e = X.sensitivity[i] / n.canvas.clientHeight;
					X.yaw[i] -= n.deltaX * e, X.pitch[i] = Me(X.pitch[i] - n.deltaY * e, -Bu, Bu);
				}
				if (a) {
					let n = 0, r = 0;
					t.isKeyDown("KeyW") && --r, t.isKeyDown("KeyS") && (r += 1), t.isKeyDown("KeyA") && --n, t.isKeyDown("KeyD") && (n += 1);
					let a = Math.sqrt(n * n + r * r);
					if (a > 0) {
						let e = t.isKeyDown("ShiftLeft") || t.isKeyDown("ShiftRight"), o = q.speed[i] * (e ? X.sprint[i] : 1) / a, s = X.yaw[i], c = Math.cos(s), l = Math.sin(s);
						q.moveX[i] = (r * l + n * c) * o, q.moveZ[i] = (r * c - n * l) * o;
					} else q.moveX[i] = 0, q.moveZ[i] = 0;
					q.jump[i] = t.isKeyDown("Space") || t.isKeyPressedWithin("Space", X.jumpBuffer[i]) ? 1 : 0;
					let o = Wu(e, i);
					if (o < 0) continue;
					let s = Hu.get(i), c = Uu.get(i);
					if (s && c) {
						let t = Math.min(e.scheduler.accumulator / _e.FIXED_DT, 1), n = V.posX[i], r = V.posY[i], a = V.posZ[i];
						V.posX[o] = s[0] + (c[0] - s[0]) * t - n, V.posY[o] = s[1] + (c[1] - s[1]) * t - r + X.eyeHeight[i], V.posZ[o] = s[2] + (c[2] - s[2]) * t - a;
					}
					let l = X.yaw[i] * .5, u = X.pitch[i] * .5, d = Math.sin(l), f = Math.cos(l), p = Math.sin(u), m = Math.cos(u);
					V.quatX[o] = f * p, V.quatY[o] = d * m, V.quatZ[o] = -d * p, V.quatW[o] = f * m;
				} else {
					if (n.locked) {
						let e = 0, n = 0;
						t.isKeyDown("KeyW") && --n, t.isKeyDown("KeyS") && (n += 1), t.isKeyDown("KeyA") && --e, t.isKeyDown("KeyD") && (e += 1);
						let a = t.isKeyDown("ShiftLeft") || t.isKeyDown("ShiftRight"), o = X.speed[i] * .5 * (a ? X.sprint[i] : 1), s = Math.sqrt(e * e + n * n);
						if (s > 0) {
							let t = o * r / s, a = X.yaw[i], c = Math.cos(a), l = Math.sin(a);
							V.posX[i] += (n * l + e * c) * t, V.posZ[i] += (n * c - e * l) * t;
						}
					}
					let e = X.yaw[i] * .5, a = X.pitch[i] * .5, o = Math.sin(e), s = Math.cos(e), c = Math.sin(a), l = Math.cos(a);
					V.quatX[i] = s * c, V.quatY[i] = o * l, V.quatZ[i] = -o * c, V.quatW[i] = s * l;
				}
			}
			n.deltaX = 0, n.deltaY = 0;
		},
		dispose(e) {
			Vu.clear(), Hu.clear(), Uu.clear();
			let t = zu.from(e);
			t && (t.locked && document.exitPointerLock(), t.canvas.removeEventListener("click", t.onClick), document.removeEventListener("pointerlockchange", t.onChange), document.removeEventListener("mousemove", t.onMove), e.deleteResource(zu));
		}
	}],
	components: { Player: X },
	dependencies: [Wr]
}, Ku = So * 2, qu = `
@group(0) @binding(0) var<storage, read_write> indirect: array<u32>;

const TOTAL_SLOTS: u32 = ${Ku}u;
const INDIRECT_STRIDE: u32 = 5u;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    if (gid.x >= TOTAL_SLOTS) { return; }
    indirect[gid.x * INDIRECT_STRIDE + 1u] = 0u;
}
`;
function Ju() {
	return `
${Qs}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    if (gid.x >= params.entityCount) { return; }

    let sphere = computeWorldSphere(gid.x);

    if (!frustumTest(sphere.center, sphere.radius)) { return; }

    emitVisible(sphere);
}
`;
}
function Yu(e) {
	let t = null, n = null, r = null, i = null, a = null, o = null, s = null, c = M(), l = /* @__PURE__ */ new ArrayBuffer(112), u = new Float32Array(l), d = new Uint32Array(l), f = new Float32Array(24), p = new Float32Array(256 * 8);
	return { nodes: [{
		name: "frustum-cull",
		inputs: ["shadow-atlas", "point-shadow-atlas"],
		outputs: ["culled"],
		async prepare(c) {
			let l = Ju(), u = c.createShaderModule({ code: l }), d = c.createBindGroupLayout({ entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: "uniform" }
				},
				{
					binding: 1,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: "read-only-storage" }
				},
				{
					binding: 2,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: "read-only-storage" }
				},
				{
					binding: 3,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: "read-only-storage" }
				},
				{
					binding: 4,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: "read-only-storage" }
				}
			] }), f = c.createBindGroupLayout({ entries: [{
				binding: 0,
				visibility: GPUShaderStage.COMPUTE,
				buffer: { type: "storage" }
			}, {
				binding: 1,
				visibility: GPUShaderStage.COMPUTE,
				buffer: { type: "storage" }
			}] });
			t = await c.createComputePipelineAsync({
				label: "frustum-cull",
				layout: c.createPipelineLayout({ bindGroupLayouts: [d, f] }),
				compute: {
					module: u,
					entryPoint: "main"
				}
			}), i = c.createBuffer({
				label: "frustum-cull-params",
				size: 112,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
			}), a = c.createBuffer({
				label: "frustum-shape-aabbs",
				size: 256 * 8 * 4,
				usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
			});
			let p = c.createShaderModule({ code: qu });
			n = await c.createComputePipelineAsync({
				label: "zero-instance",
				layout: "auto",
				compute: {
					module: p,
					entryPoint: "main"
				}
			}), r = c.createBindGroup({
				layout: n.getBindGroupLayout(0),
				entries: [{
					binding: 0,
					resource: { buffer: e.batching.indirect }
				}]
			}), o = c.createBindGroup({
				layout: d,
				entries: [
					{
						binding: 0,
						resource: { buffer: i }
					},
					{
						binding: 1,
						resource: { buffer: e.matrices.buffer }
					},
					R(2, e.sizes),
					{
						binding: 3,
						resource: { buffer: a }
					},
					{
						binding: 4,
						resource: { buffer: e.batching.cullEntities.buffer }
					}
				]
			}), s = c.createBindGroup({
				layout: f,
				entries: [{
					binding: 0,
					resource: { buffer: e.batching.indirect }
				}, {
					binding: 1,
					resource: { buffer: e.batching.entityIds.buffer }
				}]
			});
		},
		execute(m) {
			if (!t || !i || !a || !n || !r) return;
			M() !== c && (c = M(), o = null, s = null), (!o || !s) && (o = m.device.createBindGroup({
				layout: t.getBindGroupLayout(0),
				entries: [
					{
						binding: 0,
						resource: { buffer: i }
					},
					{
						binding: 1,
						resource: { buffer: e.matrices.buffer }
					},
					R(2, e.sizes),
					{
						binding: 3,
						resource: { buffer: a }
					},
					{
						binding: 4,
						resource: { buffer: e.batching.cullEntities.buffer }
					}
				]
			}), s = m.device.createBindGroup({
				layout: t.getBindGroupLayout(1),
				entries: [{
					binding: 0,
					resource: { buffer: e.batching.indirect }
				}, {
					binding: 1,
					resource: { buffer: e.batching.entityIds.buffer }
				}]
			}));
			let h = e.batching, g = h.cullEntityCount;
			if (g === 0) return;
			$s(h.shapeAABBs, p), m.device.queue.writeBuffer(a, 0, p), Re(e.viewProj, f), u.set(f), d[24] = g, m.device.queue.writeBuffer(i, 0, l);
			let _ = L(m.encoder);
			_.setPipeline(n), _.setBindGroup(0, r), _.dispatchWorkgroups(Math.ceil(Ku / 64)), _.end();
			let v = L(m.encoder, m.timestampWrites?.("frustum-cull"));
			v.setPipeline(t), v.setBindGroup(0, o), v.setBindGroup(1, s), v.dispatchWorkgroups(Math.ceil(g / 64)), v.end();
		}
	}] };
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/raster/shadow.ts
var Xu = new Float32Array(16), Zu = new Float32Array(16), Qu = new Float32Array(16), $u = new Float32Array(16), ed = new Float32Array(24), td = new Float32Array(16), nd = new Float32Array(16), rd = new Float32Array(16), id = 4, ad = 2048, od = ad / 2;
function sd(e, t, n, r = .75) {
	let i = new Float32Array(n), a = t / e;
	for (let o = 0; o < n; o++) {
		let s = (o + 1) / n, c = e * a ** +s, l = e + (t - e) * s;
		i[o] = r * c + (1 - r) * l;
	}
	return i;
}
function cd(e, t, n, r, i, a, o) {
	let s = Ve(He(A(Fe(t, n, r, i, Xu), Le(e, Zu), Qu), $u), 0, 1, ed), c = 0, l = 0, u = 0;
	for (let e = 0; e < 8; e++) c += s[e * 3], l += s[e * 3 + 1], u += s[e * 3 + 2];
	c /= 8, l /= 8, u /= 8;
	let [d, f, p] = a, m = Math.sqrt(d * d + f * f + p * p), h = d / m, g = f / m, _ = p / m, v = 0;
	for (let e = 0; e < 8; e++) {
		let t = s[e * 3] - c, n = s[e * 3 + 1] - l, r = s[e * 3 + 2] - u, i = Math.sqrt(t * t + n * n + r * r);
		v = Math.max(v, i);
	}
	let y = v * 2, b = ze(c - h * y, l - g * y, u - _ * y, c, l, u, 0, 1, 0, td), x = Infinity, S = -Infinity, C = Infinity, w = -Infinity, T = Infinity, ee = -Infinity;
	for (let e = 0; e < 8; e++) {
		let t = s[e * 3], n = s[e * 3 + 1], r = s[e * 3 + 2], i = b[0] * t + b[4] * n + b[8] * r + b[12], a = b[1] * t + b[5] * n + b[9] * r + b[13], o = b[2] * t + b[6] * n + b[10] * r + b[14];
		x = Math.min(x, i), S = Math.max(S, i), C = Math.min(C, a), w = Math.max(w, a), T = Math.min(T, o), ee = Math.max(ee, o);
	}
	T -= y, ee += y;
	let E = (S - x) / o, te = (w - C) / o, D = Math.max(E, te);
	x = Math.floor(x / D) * D, S = Math.ceil(S / D) * D, C = Math.floor(C / D) * D, w = Math.ceil(w / D) * D;
	let O = A(Be(x, S, C, w, -ee, -T, nd), b, rd), ne = 2 / o;
	return O[12] = Math.floor(O[12] / ne) * ne, O[13] = Math.floor(O[13] / ne) * ne, {
		viewProj: O,
		texelSize: D
	};
}
var ld = /* @__PURE__ */ new ArrayBuffer(288), ud = new Float32Array(ld);
function dd(e) {
	return e.createBuffer({
		label: "shadow",
		size: 288,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
}
function fd(e) {
	return e.createTexture({
		label: "shadow-atlas",
		size: [
			ad,
			ad,
			1
		],
		format: "depth32float",
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
	});
}
function pd(e, t, n, r, i) {
	return {
		name: "shadow-cascade-upload",
		inputs: ["data"],
		outputs: ["shadow-cascades"],
		execute(a) {
			if (!r()) return;
			let o = t();
			if (!o) return;
			let { world: s, fov: c, near: l, far: u, width: d, height: f } = o, p = d / f, m = n(), h = i(), g = sd(l, Math.min(u, h), id), _ = id * 16, v = _ + id, y = l;
			for (let e = 0; e < id; e++) {
				let { viewProj: t, texelSize: n } = cd(s, c, p, y, g[e], m, od);
				ud.set(t, e * 16), ud[_ + e] = g[e], ud[v + e] = n, y = g[e];
			}
			a.device.queue.writeBuffer(e, 0, ld);
		}
	};
}
function md(e) {
	return e.some((e) => e.properties?.length && _o() && e.vertex?.includes("inst."));
}
function hd(e) {
	let t = e.map((e, t) => eo(t, e)).join("\n"), n = no(e.length), r = md(e);
	return `
struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instance: u32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
}

${Fa}
${Aa}
${Oa}

@group(0) @binding(0) var<uniform> shadow: Shadow;
@group(0) @binding(1) var<storage, read> entityIds: array<u32>;
@group(0) @binding(2) var<storage, read> matrices: array<mat4x4<f32>>;
@group(0) @binding(3) var<storage, read> sizes: array<vec4<f32>>;
@group(0) @binding(4) var<uniform> cascadeIndex: u32;
@group(0) @binding(5) var<storage, read> data: array<Data>;
@group(0) @binding(6) var<uniform> scene: Scene;

${r ? yo() : ""}
${r ? bo(7) : ""}

@group(0) @binding(8) var<storage, read> shapes: array<u32>;
@group(0) @binding(9) var<storage, read> meshVertexData: array<f32>;
@group(0) @binding(10) var<storage, read> meshMeta: array<vec4<u32>>;

${Ia}

const SURFACE_ID_MASK: u32 = 0xFFu;

fn getCascadeViewProj(cascade: u32) -> mat4x4<f32> {
    switch cascade {
        case 0u: { return shadow.cascade0ViewProj; }
        case 1u: { return shadow.cascade1ViewProj; }
        case 2u: { return shadow.cascade2ViewProj; }
        default: { return shadow.cascade3ViewProj; }
    }
}

${t}
${n}

@vertex
fn vs(input: VertexInput) -> VertexOutput {
    let eid = entityIds[input.instance];
    var output: VertexOutput;
    if (sizes[eid].w == 0.0) {
        output.position = vec4<f32>(0.0, 0.0, 0.0, 1.0);
        return output;
    }
    let d = data[eid];
    let surfaceId = d.flags & SURFACE_ID_MASK;
    let vtx = pullVertex(input.vertexIndex, eid);
    let result = dispatchVertexTransform(surfaceId, vtx.position, vtx.normal, vtx.uv, eid);
    let world = matrices[eid];
    let scaledPos = result.position * sizes[eid].xyz;
    let worldPos = (world * vec4<f32>(scaledPos, 1.0)).xyz;
    let viewProj = getCascadeViewProj(cascadeIndex);
    _ = scene.time;

    output.position = viewProj * vec4<f32>(worldPos, 1.0);
    return output;
}

@fragment
fn fs() {}
`;
}
async function gd(e, t) {
	let n = hd(t), r = e.createShaderModule({ code: n }), i = await e.createRenderPipelineAsync({
		label: "shadow-dir",
		layout: "auto",
		vertex: {
			module: r,
			entryPoint: "vs"
		},
		fragment: {
			module: r,
			entryPoint: "fs",
			targets: []
		},
		depthStencil: {
			format: "depth32float",
			depthWriteEnabled: !0,
			depthCompare: "less"
		},
		primitive: {
			topology: "triangle-list",
			cullMode: "front"
		}
	}), a = [];
	for (let t = 0; t < id; t++) {
		let n = e.createBuffer({
			label: `cascade-index-${t}`,
			size: 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		e.queue.writeBuffer(n, 0, new Uint32Array([t])), a.push(n);
	}
	return {
		pipeline: i,
		cascadeIndexBuffers: a,
		needsProps: md(t)
	};
}
function _d(e, t, n, r, i) {
	let a = t.pipeline.getBindGroupLayout(0), o = t.cascadeIndexBuffers.map((i) => {
		let o = [
			{
				binding: 0,
				resource: { buffer: r }
			},
			{
				binding: 1,
				resource: { buffer: n.batching.entityIds.buffer }
			},
			{
				binding: 2,
				resource: { buffer: n.matrices.buffer }
			},
			R(3, n.sizes),
			{
				binding: 4,
				resource: { buffer: i }
			},
			{
				binding: 5,
				resource: { buffer: n.data.buffer }
			},
			{
				binding: 6,
				resource: { buffer: n.scene }
			}
		];
		if (t.needsProps) {
			let e = n.instanceDataBuffer;
			e && o.push({
				binding: 7,
				resource: { buffer: e.buffer }
			});
		}
		return o.push(R(8, n.shapes), {
			binding: 9,
			resource: { buffer: n.meshAtlas.vertices }
		}, {
			binding: 10,
			resource: { buffer: n.meshAtlas.meta }
		}), e.createBindGroup({
			layout: a,
			entries: o
		});
	});
	return {
		pipeline: t.pipeline,
		cascadeIndexBuffers: t.cascadeIndexBuffers,
		cascadeBindGroups: o,
		depthView: i.createView()
	};
}
var vd = {
	view: null,
	depthClearValue: 1,
	depthLoadOp: "clear",
	depthStoreOp: "store"
}, yd = {
	colorAttachments: [],
	depthStencilAttachment: vd
};
function bd(e, t, n, r, i) {
	let a = null, o = !1, s = null, c = M(), l = e.meshVersion;
	return [{
		name: "shadow-render",
		inputs: ["shadow-cascades"],
		outputs: ["shadow-atlas"],
		execute(u) {
			if (!r() || (!a && !o && (o = !0, gd(u.device, i()).then((e) => {
				a = e;
			}).catch(() => {}).finally(() => {
				o = !1;
			})), !a)) return;
			let d = !s;
			M() !== c && (c = M(), d = !0), e.meshVersion !== l && (l = e.meshVersion, d = !0), d && (s = _d(u.device, a, e, t, n()));
			let f = s;
			vd.view = f.depthView, yd.timestampWrites = u.timestampWrites?.("raster-shadow");
			let p = u.encoder.beginRenderPass(yd);
			p.setPipeline(f.pipeline), p.setIndexBuffer(e.meshAtlas.indices, "uint32");
			for (let t = 0; t < id; t++) {
				let n = t % 2 * od, r = Math.floor(t / 2) * od;
				p.setViewport(n, r, od, od, 0, 1), p.setScissorRect(n, r, od, od), p.setBindGroup(0, f.cascadeBindGroups[t]), Bs(p, e.batching.indirect, 0, e.batching.activeSlots, e.batching.activeSlotCount);
			}
			p.end();
		}
	}];
}
function xd(e, t) {
	return t.current ||= {
		atlas: Ed(e),
		buffer: Dd(e)
	}, t.current;
}
var Sd = 512 * 6, Cd = 512 * 4, wd = 1600, Td = [
	{
		dx: 1,
		dy: 0,
		dz: 0,
		ux: 0,
		uy: -1,
		uz: 0
	},
	{
		dx: -1,
		dy: 0,
		dz: 0,
		ux: 0,
		uy: -1,
		uz: 0
	},
	{
		dx: 0,
		dy: 1,
		dz: 0,
		ux: 0,
		uy: 0,
		uz: 1
	},
	{
		dx: 0,
		dy: -1,
		dz: 0,
		ux: 0,
		uy: 0,
		uz: -1
	},
	{
		dx: 0,
		dy: 0,
		dz: 1,
		ux: 0,
		uy: -1,
		uz: 0
	},
	{
		dx: 0,
		dy: 0,
		dz: -1,
		ux: 0,
		uy: -1,
		uz: 0
	}
];
function Ed(e) {
	return e.createTexture({
		label: "point-shadow-atlas",
		size: [
			Sd,
			Cd,
			1
		],
		format: "depth32float",
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
	});
}
function Dd(e) {
	return e.createBuffer({
		label: "point-shadow",
		size: wd,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
}
var Od = new Float32Array(16), kd = new Float32Array(16), Ad = new Float32Array(16);
function jd(e, t, n, r, i) {
	let a = Td[r], o = ze(e, t, n, e + a.dx, t + a.dy, n + a.dz, a.ux, a.uy, a.uz, kd);
	return A(Fe(90, 1, .1, i, Od), o, Ad);
}
var Md = new ArrayBuffer(wd), Nd = new Float32Array(Md);
function Pd(e, t) {
	return {
		name: "point-shadow-upload",
		inputs: ["point-light-raster"],
		outputs: ["point-shadow-data"],
		execute(n) {
			let r = t();
			if (!r) return;
			let [i, a] = e();
			Nd.fill(0);
			let o = 0;
			for (let e = 0; e < a && o < 4; e++) {
				let t = e * 8;
				if (i[t + 7] < 0) continue;
				let n = i[t], r = i[t + 1], a = i[t + 2], s = i[t + 3];
				for (let e = 0; e < 6; e++) {
					let t = jd(n, r, a, e, s), i = (o * 6 + e) * 16;
					Nd.set(t, i);
				}
				let c = 384 + o * 4;
				Nd[c] = n, Nd[c + 1] = r, Nd[c + 2] = a, Nd[c + 3] = s, o++;
			}
			n.device.queue.writeBuffer(r, 0, Md);
		}
	};
}
function Fd(e) {
	let t = e.map((e, t) => eo(t, e)).join("\n"), n = no(e.length), r = md(e);
	return `
struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instance: u32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
}

${Pa}
${Aa}
${Oa}

@group(0) @binding(0) var<uniform> pointShadow: PointShadow;
@group(0) @binding(1) var<storage, read> entityIds: array<u32>;
@group(0) @binding(2) var<storage, read> matrices: array<mat4x4<f32>>;
@group(0) @binding(3) var<storage, read> sizes: array<vec4<f32>>;
@group(0) @binding(4) var<uniform> vpIndex: u32;
@group(0) @binding(5) var<storage, read> data: array<Data>;
@group(0) @binding(6) var<uniform> scene: Scene;

${r ? yo() : ""}
${r ? bo(7) : ""}

@group(0) @binding(8) var<storage, read> shapes: array<u32>;
@group(0) @binding(9) var<storage, read> meshVertexData: array<f32>;
@group(0) @binding(10) var<storage, read> meshMeta: array<vec4<u32>>;

${Ia}

const SURFACE_ID_MASK: u32 = 0xFFu;

${t}
${n}

@vertex
fn vs(input: VertexInput) -> VertexOutput {
    let eid = entityIds[input.instance];
    var output: VertexOutput;
    if (sizes[eid].w == 0.0) {
        output.position = vec4<f32>(0.0, 0.0, 0.0, 1.0);
        return output;
    }
    let d = data[eid];
    let surfaceId = d.flags & SURFACE_ID_MASK;
    let vtx = pullVertex(input.vertexIndex, eid);
    let result = dispatchVertexTransform(surfaceId, vtx.position, vtx.normal, vtx.uv, eid);
    let world = matrices[eid];
    let scaledPos = result.position * sizes[eid].xyz;
    let worldPos = (world * vec4<f32>(scaledPos, 1.0)).xyz;
    _ = scene.time;
    output.position = pointShadow.viewProj[vpIndex] * vec4<f32>(worldPos, 1.0);
    return output;
}

@fragment
fn fs() {}
`;
}
async function Id(e, t) {
	let n = Fd(t), r = e.createShaderModule({ code: n }), i = await e.createRenderPipelineAsync({
		label: "shadow-point",
		layout: "auto",
		vertex: {
			module: r,
			entryPoint: "vs"
		},
		fragment: {
			module: r,
			entryPoint: "fs",
			targets: []
		},
		depthStencil: {
			format: "depth32float",
			depthWriteEnabled: !0,
			depthCompare: "less"
		},
		primitive: {
			topology: "triangle-list",
			cullMode: "front"
		}
	}), a = [];
	for (let t = 0; t < 24; t++) {
		let n = e.createBuffer({
			label: `point-shadow-vp-${t}`,
			size: 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		e.queue.writeBuffer(n, 0, new Uint32Array([t])), a.push(n);
	}
	return {
		pipeline: i,
		vpIndexBuffers: a,
		needsProps: md(t)
	};
}
function Ld(e, t, n, r, i) {
	let a = t.pipeline.getBindGroupLayout(0), o = t.vpIndexBuffers.map((i) => {
		let o = [
			{
				binding: 0,
				resource: { buffer: r }
			},
			{
				binding: 1,
				resource: { buffer: n.batching.entityIds.buffer }
			},
			{
				binding: 2,
				resource: { buffer: n.matrices.buffer }
			},
			R(3, n.sizes),
			{
				binding: 4,
				resource: { buffer: i }
			},
			{
				binding: 5,
				resource: { buffer: n.data.buffer }
			},
			{
				binding: 6,
				resource: { buffer: n.scene }
			}
		];
		if (t.needsProps) {
			let e = n.instanceDataBuffer;
			e && o.push({
				binding: 7,
				resource: { buffer: e.buffer }
			});
		}
		return o.push(R(8, n.shapes), {
			binding: 9,
			resource: { buffer: n.meshAtlas.vertices }
		}, {
			binding: 10,
			resource: { buffer: n.meshAtlas.meta }
		}), e.createBindGroup({
			layout: a,
			entries: o
		});
	});
	return {
		pipeline: t.pipeline,
		vpIndexBuffers: t.vpIndexBuffers,
		vpBindGroups: o,
		atlasView: i.createView()
	};
}
var Rd = {
	view: null,
	depthClearValue: 1,
	depthLoadOp: "clear",
	depthStoreOp: "store"
}, zd = {
	colorAttachments: [],
	depthStencilAttachment: Rd
};
function Bd(e, t, n, r) {
	let i = null, a = !1, o = null, s = M(), c = e.meshVersion;
	return {
		name: "point-shadow-render",
		inputs: ["point-shadow-data", "batched"],
		outputs: ["point-shadow-atlas"],
		execute(l) {
			let u = t();
			if (!u || (!i && !a && (a = !0, Id(l.device, r()).then((e) => {
				i = e;
			}).catch(() => {}).finally(() => {
				a = !1;
			})), !i)) return;
			let d = !o;
			M() !== s && (s = M(), d = !0), e.meshVersion !== c && (c = e.meshVersion, d = !0), d && (o = Ld(l.device, i, e, u.buffer, u.atlas));
			let [f, p] = n(), m = 0;
			for (let e = 0; e < p; e++) f[e * 8 + 7] >= 0 && m++;
			if (m === 0) return;
			let h = o;
			Rd.view = h.atlasView, zd.timestampWrites = l.timestampWrites?.("raster-point-shadow");
			let g = l.encoder.beginRenderPass(zd);
			g.setPipeline(h.pipeline), g.setIndexBuffer(e.meshAtlas.indices, "uint32");
			for (let t = 0; t < m; t++) for (let n = 0; n < 6; n++) {
				let r = t * 6 + n, i = n * 512, a = t * 512;
				g.setViewport(i, a, 512, 512, 0, 1), g.setScissorRect(i, a, 512, 512), g.setBindGroup(0, h.vpBindGroups[r]), Bs(g, e.batching.indirect, 0, e.batching.activeSlots, e.batching.activeSlotCount);
			}
			g.end();
		}
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/raster/cluster.ts
var Vd = 16, Hd = 24, Ud = 128, Wd = 1024 * 1024, Gd = 128, Kd = `
${Na}

struct ClusterParams {
    viewMatrix: mat4x4<f32>,
    tilesX: u32,
    tilesY: u32,
    sliceCount: u32,
    lightCount: u32,
    near: f32,
    far: f32,
    logRatio: f32,
    bias: f32,
    tanHalfFov: f32,
    aspect: f32,
    cameraMode: f32,
    _pad: f32,
}

@group(0) @binding(0) var<uniform> params: ClusterParams;
@group(0) @binding(1) var<storage, read> pointLights: array<PointLightData>;
@group(0) @binding(2) var<storage, read_write> clusterGrid: array<vec2<u32>>;
@group(0) @binding(3) var<storage, read_write> lightIndices: array<atomic<u32>>;

fn clusterAABB(tileX: u32, tileY: u32, slice: u32) -> array<vec3<f32>, 2> {
    let tilesXf = f32(params.tilesX);
    let tilesYf = f32(params.tilesY);

    let minXNdc = f32(tileX) / tilesXf * 2.0 - 1.0;
    let maxXNdc = f32(tileX + 1u) / tilesXf * 2.0 - 1.0;
    let minYNdc = 1.0 - f32(tileY + 1u) / tilesYf * 2.0;
    let maxYNdc = 1.0 - f32(tileY) / tilesYf * 2.0;

    var nearZ: f32;
    var farZ: f32;

    if (params.cameraMode > 0.5) {
        nearZ = params.near + f32(slice) / f32(params.sliceCount) * (params.far - params.near);
        farZ = params.near + f32(slice + 1u) / f32(params.sliceCount) * (params.far - params.near);
    } else {
        nearZ = params.near * pow(params.far / params.near, f32(slice) / f32(params.sliceCount));
        farZ = params.near * pow(params.far / params.near, f32(slice + 1u) / f32(params.sliceCount));
    }

    var minPt: vec3<f32>;
    var maxPt: vec3<f32>;

    if (params.cameraMode > 0.5) {
        let halfW = params.tanHalfFov * params.aspect;
        let halfH = params.tanHalfFov;
        minPt = vec3(minXNdc * halfW, minYNdc * halfH, nearZ);
        maxPt = vec3(maxXNdc * halfW, maxYNdc * halfH, farZ);
    } else {
        let nearHalfH = params.tanHalfFov * nearZ;
        let nearHalfW = nearHalfH * params.aspect;
        let farHalfH = params.tanHalfFov * farZ;
        let farHalfW = farHalfH * params.aspect;

        minPt = vec3(
            min(minXNdc * nearHalfW, minXNdc * farHalfW),
            min(minYNdc * nearHalfH, minYNdc * farHalfH),
            nearZ
        );
        maxPt = vec3(
            max(maxXNdc * nearHalfW, maxXNdc * farHalfW),
            max(maxYNdc * nearHalfH, maxYNdc * farHalfH),
            farZ
        );
    }

    return array<vec3<f32>, 2>(minPt, maxPt);
}

fn sphereAABBIntersect(center: vec3<f32>, radius: f32, aabbMin: vec3<f32>, aabbMax: vec3<f32>) -> bool {
    let closest = clamp(center, aabbMin, aabbMax);
    let d = center - closest;
    return dot(d, d) <= radius * radius;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let tilesX = params.tilesX;
    let tilesY = params.tilesY;
    let sliceCount = params.sliceCount;
    let clusterId = gid.x;
    let totalClusters = tilesX * tilesY * sliceCount;

    if (clusterId >= totalClusters) { return; }

    let slice = clusterId / (tilesX * tilesY);
    let rem = clusterId % (tilesX * tilesY);
    let tileY = rem / tilesX;
    let tileX = rem % tilesX;

    let aabb = clusterAABB(tileX, tileY, slice);
    let aabbMin = aabb[0];
    let aabbMax = aabb[1];

    var count = 0u;

    var localIndices: array<u32, ${Ud}>;

    for (var i = 0u; i < params.lightCount; i++) {
        let light = pointLights[i];
        let worldPos = vec4(light.position, 1.0);
        let viewPos = params.viewMatrix * worldPos;
        let lightView = vec3(viewPos.x, viewPos.y, -viewPos.z);

        if (sphereAABBIntersect(lightView, light.radius, aabbMin, aabbMax)) {
            if (count < ${Ud}u) {
                localIndices[count] = i;
                count++;
            }
        }
    }

    if (count == 0u) {
        clusterGrid[clusterId] = vec2(0u, 0u);
        return;
    }

    let globalOffset = atomicAdd(&lightIndices[0], count);
    clusterGrid[clusterId] = vec2(globalOffset, count);

    for (var i = 0u; i < count; i++) {
        atomicStore(&lightIndices[globalOffset + 1u + i], localIndices[i]);
    }
}
`, qd = "\nstruct ClusterParams {\n    viewMatrix: mat4x4<f32>,\n    tilesX: u32,\n    tilesY: u32,\n    sliceCount: u32,\n    lightCount: u32,\n    near: f32,\n    far: f32,\n    logRatio: f32,\n    bias: f32,\n    tanHalfFov: f32,\n    aspect: f32,\n    cameraMode: f32,\n    _pad: f32,\n}\n\n@group(2) @binding(0) var<uniform> clusterParams: ClusterParams;\n@group(2) @binding(1) var<storage, read> clusterGrid: array<vec2<u32>>;\n@group(2) @binding(2) var<storage, read> clusterLightIndices: array<u32>;\n", Jd = `
fn getClusterIndex(fragCoord: vec2<f32>, viewZ: f32) -> u32 {
    let tileX = u32(fragCoord.x) / ${Vd}u;
    let tileY = u32(fragCoord.y) / ${Vd}u;
    var slice: u32;
    if (clusterParams.cameraMode > 0.5) {
        slice = u32(clamp((viewZ - clusterParams.near) / (clusterParams.far - clusterParams.near) * f32(clusterParams.sliceCount), 0.0, f32(clusterParams.sliceCount - 1u)));
    } else {
        slice = u32(clamp(log2(viewZ / clusterParams.near) * clusterParams.logRatio, 0.0, f32(clusterParams.sliceCount - 1u)));
    }
    return slice * clusterParams.tilesX * clusterParams.tilesY + tileY * clusterParams.tilesX + tileX;
}
`, Yd = "\nfn computePointLights(surface: SurfaceData, V: vec3<f32>, fragCoord: vec2<f32>, viewZ: f32) -> vec3<f32> {\n    var result = vec3(0.0);\n    let cluster = getClusterIndex(fragCoord, viewZ);\n    let gridEntry = clusterGrid[cluster];\n    let offset = gridEntry.x;\n    let count = gridEntry.y;\n\n    for (var j = 0u; j < count; j++) {\n        let i = clusterLightIndices[offset + 1u + j];\n        let light = pointLights[i];\n        let toLight = light.position - surface.worldPos;\n        let dist = length(toLight);\n        if (dist >= light.radius || dist < 1e-4) { continue; }\n\n        let L = toLight / dist;\n        let NdotL = max(dot(surface.worldNormal, L), 0.0);\n        if (NdotL <= 0.0) { continue; }\n\n        let ratio = 1.0 - dist / light.radius;\n        let attenuation = ratio * ratio;\n\n        var shadow = 1.0;\n        if (light.shadowIdx >= 0.0) {\n            shadow = samplePointShadow(surface.worldPos, surface.worldNormal, u32(light.shadowIdx), light.position, light.radius);\n        }\n\n        result += evaluatePointLight(surface, light.color, L, V, NdotL, attenuation, shadow);\n    }\n    return result;\n}\n", Xd = "\nfn computePointLights(surface: SurfaceData, V: vec3<f32>, fragCoord: vec2<f32>, viewZ: f32) -> vec3<f32> {\n    var result = vec3(0.0);\n    let cluster = getClusterIndex(fragCoord, viewZ);\n    let gridEntry = clusterGrid[cluster];\n    let offset = gridEntry.x;\n    let count = gridEntry.y;\n\n    for (var j = 0u; j < count; j++) {\n        let i = clusterLightIndices[offset + 1u + j];\n        let light = pointLights[i];\n        let toLight = light.position - surface.worldPos;\n        let dist = length(toLight);\n        if (dist >= light.radius || dist < 1e-4) { continue; }\n\n        let L = toLight / dist;\n        let NdotL = max(dot(surface.worldNormal, L), 0.0);\n        if (NdotL <= 0.0) { continue; }\n\n        let ratio = 1.0 - dist / light.radius;\n        let attenuation = ratio * ratio;\n\n        result += evaluatePointLight(surface, light.color, L, V, NdotL, attenuation, 1.0);\n    }\n    return result;\n}\n", Zd = new Float32Array(16), Qd = new ArrayBuffer(Gd), $d = new Float32Array(Qd), ef = new Uint32Array(Qd), tf = new Uint32Array(1);
function nf(e, t, n, r, i = 3840, a = 2160) {
	let o = null, s = null, c = null;
	return {
		name: "cluster-cull",
		inputs: ["point-light-raster"],
		outputs: ["cluster-data"],
		async prepare(e) {
			let t = e.createShaderModule({ code: Kd });
			o = await e.createComputePipelineAsync({
				label: "cluster-cull",
				layout: "auto",
				compute: {
					module: t,
					entryPoint: "main"
				}
			});
		},
		execute(l) {
			if (!o || (e.clusterGridBuffer !== c && (c = e.clusterGridBuffer, s = l.device.createBindGroup({
				layout: o.getBindGroupLayout(0),
				entries: [
					{
						binding: 0,
						resource: { buffer: e.clusterParamsBuffer }
					},
					{
						binding: 1,
						resource: { buffer: t }
					},
					{
						binding: 2,
						resource: { buffer: e.clusterGridBuffer }
					},
					{
						binding: 3,
						resource: { buffer: e.lightIndexBuffer }
					}
				]
			})), !s)) return;
			let u = n();
			if (u < 0) return;
			let d = r();
			if (d === 0) {
				l.encoder.clearBuffer(e.clusterGridBuffer), l.device.queue.writeBuffer(e.lightIndexBuffer, 0, tf);
				return;
			}
			let f = Le(Fi.data.subarray(u * 16, u * 16 + 16), Zd), p = U.fov[u], m = U.near[u], h = U.far[u], g = U.mode[u], _ = l.getTexture("color")?.width ?? 1920, v = l.getTexture("color")?.height ?? 1080, y = _ / v, b = Math.min(Math.ceil(_ / Vd), Math.ceil(i / Vd)), x = Math.min(Math.ceil(v / Vd), Math.ceil(a / Vd)), S = Hd, C = b * x * S, w = p * Math.PI / 180, T = Math.tan(w / 2), ee = Math.log2(h / m), E = S / ee, te = -S * Math.log2(m) / ee;
			$d.set(f, 0), ef[16] = b, ef[17] = x, ef[18] = S, ef[19] = d, $d[20] = m, $d[21] = h, $d[22] = E, $d[23] = te, $d[24] = T, $d[25] = y, $d[26] = g, $d[27] = 0, l.device.queue.writeBuffer(e.clusterParamsBuffer, 0, Qd), l.device.queue.writeBuffer(e.lightIndexBuffer, 0, tf);
			let D = L(l.encoder, l.timestampWrites?.("cluster-cull"));
			D.setPipeline(o), D.setBindGroup(0, s), D.dispatchWorkgroups(Math.ceil(C / 64)), D.end();
		}
	};
}
function rf(e, t) {
	return {
		paramsSize: Gd,
		gridSize: Math.ceil(e / Vd) * Math.ceil(t / Vd) * Hd * 8,
		indexSize: 4 + Wd * 4
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/raster/forward.ts
var af = { lighting: {
	params: "shadowFactor: f32, fragCoord: vec2<f32>, viewZ: f32",
	body: () => `${Za}
    return litColor + computePointLights(surface, V, fragCoord, viewZ);`
} };
function of(e, t, n = !0, r = !1) {
	let i = io(e, af), a = t ? `
${Fa}

@group(1) @binding(0) var<uniform> shadow: Shadow;
@group(1) @binding(1) var shadowMap: texture_depth_2d;

${Pa}

@group(1) @binding(2) var<uniform> pointShadow: PointShadow;
@group(1) @binding(3) var pointShadowMap: texture_depth_2d;
@group(1) @binding(4) var shadowSampler: sampler_comparison;

${qa}
${Ya}
${Yd}
` : "", o = t ? "\n    let viewZ = -dot(scene.cameraWorld[2].xyz, surface.worldPos - scene.cameraWorld[3].xyz);\n    let rawShadow = sampleShadow(surface.worldPos, viewZ, input.position.xy);\n    let shadowFactor = mix(1.0, rawShadow, scene.shadowStrength);\n" : "\n    let viewZ = -dot(scene.cameraWorld[2].xyz, surface.worldPos - scene.cameraWorld[3].xyz);\n    let shadowFactor = 1.0;\n", s = n ? "struct FragmentOutput {\n    @location(0) color: vec4<f32>,\n    @location(1) entityId: u32,\n}" : "struct FragmentOutput {\n    @location(0) color: vec4<f32>,\n}", c = n ? r ? "\n    output.entityId = 0u;" : "\n    output.entityId = input.entityId;" : "", l = r ? "let reflectedColor = litColor * surface.opacity + reflectionColor(surface, V);" : "let reflectedColor = applyReflection(surface, V, litColor);", u = t ? "" : Xd;
	return `
${La.replace(/struct FragmentOutput \{[^}]+\}/, s)}
${ka}
${Na}

const SURFACE_ID_MASK: u32 = 0xFFu;

@group(0) @binding(5) var<uniform> sky: Sky;
@group(0) @binding(6) var<storage, read> pointLights: array<PointLightData>;

${_o() ? yo() : ""}
${_o() ? bo(7) : ""}

${qd}
${Jd}

${Va}
${Ka}
${Ja}
${Xa}
${Ga}
${Qa}
${a}
${u}

${i}

@vertex
fn vs(input: VertexInput) -> VertexOutput {
    let eid = entityIds[input.instance];
    let world = matrices[eid];
    let d = data[eid];
    let surfaceId = d.flags & SURFACE_ID_MASK;
    let vtx = pullVertex(input.vertexIndex, eid);
    let position = vtx.position;
    let normal = vtx.normal;
    let result = dispatchVertexTransform(surfaceId, position, normal, vtx.uv, eid);
    let scaledPos = result.position * sizes[eid].xyz;
    let finalWorldPos = (world * vec4<f32>(scaledPos, 1.0)).xyz;
    let worldNormal = normalize((world * vec4<f32>(normal, 0.0)).xyz);

    var output: VertexOutput;
    output.position = scene.viewProj * vec4<f32>(finalWorldPos, 1.0);
    output.color = d.baseColor;
    output.worldNormal = worldNormal;
    output.entityId = eid;
    output.worldPos = finalWorldPos;
    output.objectPos = position * sizes[eid].xyz;
    output.objectNormal = normal;
    output.uv = result.uv;
    return output;
}

@fragment
fn fs(input: VertexOutput) -> FragmentOutput {
    let eid = input.entityId;
    let d = data[eid];
    let surfaceId = d.flags & SURFACE_ID_MASK;

    var surface: SurfaceData;
    surface.worldPos = input.worldPos;
    surface.objectPos = input.objectPos;
    surface.worldNormal = normalize(input.worldNormal);
    surface.objectNormal = normalize(input.objectNormal);
    surface.baseColor = input.color.rgb;
    surface.emission = d.emission.rgb * d.emission.a;
    surface.uv = input.uv;
    surface.roughness = d.pbr.x;
    surface.reflectivity = d.pbr.y;
    surface.opacity = input.color.a;

    dispatchFragment(surfaceId, &surface, input.position, eid);
    ${$a}

${o}
    let litColor = dispatchLighting(surfaceId, surface, shadowFactor, input.position.xy, viewZ);
    let V = normalize(scene.cameraWorld[3].xyz - surface.worldPos);
    let dist = length(input.worldPos - scene.cameraWorld[3].xyz);
    ${l}

    var output: FragmentOutput;
    output.color = vec4<f32>(applyHaze(reflectedColor, dist), surface.opacity);${c}
    _ = clusterParams.tilesX;
    return output;
}
`;
}
function sf(e = !1) {
	return `
${Oa}
${ka}

@group(0) @binding(0) var<uniform> scene: Scene;
@group(0) @binding(1) var<uniform> sky: Sky;

${Wa}
${Va}
${Ga}

${e ? "struct FragmentOutput {\n    @location(0) color: vec4<f32>,\n    @location(1) entityId: u32,\n}" : ""}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var positions = array<vec2<f32>, 3>(
        vec2(-1.0, -1.0),
        vec2(3.0, -1.0),
        vec2(-1.0, 3.0)
    );
    var output: VertexOutput;
    output.position = vec4(positions[vertexIndex], 0.0, 1.0);
    output.uv = (positions[vertexIndex] + 1.0) * 0.5;
    output.uv.y = 1.0 - output.uv.y;
    return output;
}

@fragment
fn fs(input: VertexOutput) -> ${e ? "FragmentOutput" : "@location(0) vec4<f32>"} {
    let dir = computeSkyDir(input.uv.x, input.uv.y);
    let color = sampleSky(dir);
    ${e ? "var output: FragmentOutput;\n    output.color = vec4(color, 1.0);\n    output.entityId = 0u;\n    return output;" : "return vec4(color, 1.0);"}
}
`;
}
async function cf(e, t, n, r) {
	let i = of(t, r), a = e.createShaderModule({ code: i });
	return e.createRenderPipelineAsync({
		label: "forward",
		layout: "auto",
		vertex: {
			module: a,
			entryPoint: "vs"
		},
		fragment: {
			module: a,
			entryPoint: "fs",
			targets: [{ format: n }, { format: "r32uint" }]
		},
		depthStencil: {
			format: "depth24plus",
			depthWriteEnabled: !0,
			depthCompare: "less"
		},
		primitive: {
			topology: "triangle-list",
			cullMode: "back"
		}
	});
}
async function lf(e, t, n, r) {
	let i = of(t, r, !0, !0), a = e.createShaderModule({ code: i });
	return e.createRenderPipelineAsync({
		label: "forward-transparent",
		layout: "auto",
		vertex: {
			module: a,
			entryPoint: "vs"
		},
		fragment: {
			module: a,
			entryPoint: "fs",
			targets: [{
				format: n,
				blend: {
					color: {
						srcFactor: "one",
						dstFactor: "one-minus-src-alpha"
					},
					alpha: {
						srcFactor: "one",
						dstFactor: "one-minus-src-alpha"
					}
				}
			}, {
				format: "r32uint",
				writeMask: 0
			}]
		},
		depthStencil: {
			format: "depth24plus",
			depthWriteEnabled: !1,
			depthCompare: "less-equal"
		},
		primitive: {
			topology: "triangle-list",
			cullMode: "none"
		}
	});
}
async function uf(e, t) {
	let n = sf(!0), r = e.createShaderModule({ code: n });
	return e.createRenderPipelineAsync({
		label: "sky",
		layout: "auto",
		vertex: {
			module: r,
			entryPoint: "vs"
		},
		fragment: {
			module: r,
			entryPoint: "fs",
			targets: [{ format: t }, { format: "r32uint" }]
		},
		depthStencil: {
			format: "depth24plus",
			depthWriteEnabled: !1,
			depthCompare: "always"
		},
		primitive: { topology: "triangle-list" }
	});
}
async function df(e, t) {
	let [n, r, i] = await Promise.all([
		cf(e, t, Yi, !0),
		uf(e, Yi),
		lf(e, t, Yi, !0)
	]);
	return {
		opaque: n,
		transparent: i,
		sky: r
	};
}
function ff(e, t, n, r) {
	let i = [
		{
			binding: 0,
			resource: { buffer: n.scene }
		},
		{
			binding: 1,
			resource: { buffer: n.batching.entityIds.buffer }
		},
		{
			binding: 2,
			resource: { buffer: n.matrices.buffer }
		},
		R(3, n.sizes),
		{
			binding: 4,
			resource: { buffer: n.data.buffer }
		},
		{
			binding: 5,
			resource: { buffer: n.sky }
		},
		{
			binding: 6,
			resource: { buffer: n.pointLightBuffer }
		}
	];
	n.instanceDataBuffer && i.push({
		binding: 7,
		resource: { buffer: n.instanceDataBuffer.buffer }
	}), i.push(R(8, n.shapes), {
		binding: 9,
		resource: { buffer: n.meshAtlas.vertices }
	}, {
		binding: 10,
		resource: { buffer: n.meshAtlas.meta }
	});
	let a = (t) => e.createBindGroup({
		layout: t.getBindGroupLayout(0),
		entries: i
	}), o = e.createSampler({
		compare: "less",
		magFilter: "linear",
		minFilter: "linear"
	}), s = [
		{
			binding: 0,
			resource: { buffer: r.shadowBuffer }
		},
		{
			binding: 1,
			resource: r.shadowAtlas.createView()
		},
		{
			binding: 2,
			resource: { buffer: r.pointShadowBuffer }
		},
		{
			binding: 3,
			resource: r.pointShadowAtlas.createView()
		},
		{
			binding: 4,
			resource: o
		}
	], c = (t) => e.createBindGroup({
		layout: t.getBindGroupLayout(1),
		entries: s
	}), l = [
		{
			binding: 0,
			resource: { buffer: r.clusterParamsBuffer }
		},
		{
			binding: 1,
			resource: { buffer: r.clusterGridBuffer }
		},
		{
			binding: 2,
			resource: { buffer: r.lightIndexBuffer }
		}
	], u = (t) => e.createBindGroup({
		layout: t.getBindGroupLayout(2),
		entries: l
	});
	return {
		scene: a(t.opaque),
		sceneTransparent: a(t.transparent),
		shadow: c(t.opaque),
		shadowTransparent: c(t.transparent),
		cluster: u(t.opaque),
		clusterTransparent: u(t.transparent),
		sky: e.createBindGroup({
			layout: t.sky.getBindGroupLayout(0),
			entries: [{
				binding: 0,
				resource: { buffer: n.scene }
			}, {
				binding: 1,
				resource: { buffer: n.sky }
			}]
		})
	};
}
var pf = {
	view: null,
	clearValue: {
		r: 0,
		g: 0,
		b: 0,
		a: 1
	},
	loadOp: "clear",
	storeOp: "store"
}, mf = {
	view: null,
	clearValue: {
		r: 0,
		g: 0,
		b: 0,
		a: 0
	},
	loadOp: "clear",
	storeOp: "store"
}, hf = {
	view: null,
	depthClearValue: 1,
	depthLoadOp: "clear",
	depthStoreOp: "store"
}, gf = {
	colorAttachments: [pf, mf],
	depthStencilAttachment: hf
};
function _f(e, t, n, r, i, a, o, s, c, l, u) {
	pf.view = a, pf.clearValue.r = c.r, pf.clearValue.g = c.g, pf.clearValue.b = c.b, mf.view = o, hf.view = s, gf.timestampWrites = u;
	let d = e.encoder.beginRenderPass(gf);
	l && (d.setPipeline(t.sky), d.setBindGroup(0, n.sky), d.draw(3)), d.setPipeline(t.opaque), d.setBindGroup(0, n.scene), d.setBindGroup(1, n.shadow), d.setBindGroup(2, n.cluster), d.setIndexBuffer(r, "uint32"), Bs(d, i.indirect, 0, i.activeSlots, i.activeSlotCount), d.setPipeline(t.transparent), d.setBindGroup(0, n.sceneTransparent), d.setBindGroup(1, n.shadowTransparent), d.setBindGroup(2, n.clusterTransparent), Bs(d, i.indirect, So, i.activeSlots, i.activeSlotCount), d.end();
}
function vf(e, t, n, r, i) {
	let a = null, o = null, s = null, c = !1, l = M(), u = e.meshVersion;
	return {
		name: "forward",
		inputs: [
			"culled",
			"shadow-atlas",
			"point-shadow-atlas",
			"cluster-data"
		],
		outputs: [
			"color",
			"eid",
			"z"
		],
		async prepare(r) {
			a = await df(r, n()), s = e.instanceDataBuffer, o = ff(r, a, e, t);
		},
		execute(n) {
			if (!a || !o || globalThis.__SKIP_FORWARD) return;
			M() !== l && (l = M(), c = !0), e.meshVersion !== u && (u = e.meshVersion, c = !0), t.bindGroupsDirty && (t.bindGroupsDirty = !1, c = !0);
			let d = e.instanceDataBuffer;
			(d !== s || c) && (s = d, c = !1, o = ff(n.device, a, e, t));
			let f = n.getTextureView("color"), p = n.getTextureView("eid"), m = n.getTextureView("z");
			if (!f || !p || !m) return;
			let h = r(), g = i();
			_f(n, a, o, e.meshAtlas.indices, e.batching, f, p, m, h, g, n.timestampWrites?.("raster-forward"));
		}
	};
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/raster/index.ts
var yf = 100, bf = I("raster"), xf = {
	name: "Raster",
	systems: [],
	components: {},
	dependencies: [Zs],
	async initialize(e) {
		let t = un.from(e), n = Xs.from(e);
		if (!t || !n) return;
		let { device: r } = t, i = r.createTexture({
			label: "shadow-atlas-placeholder",
			size: [1, 1],
			format: "depth32float",
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		}), a = !1, o = dd(r), s = r.createTexture({
			label: "point-shadow-atlas",
			size: [1, 1],
			format: "depth32float",
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		}), c = r.createBuffer({
			label: "point-shadow",
			size: wd,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		}), l = { current: null }, u = 3840, d = 2160, f = r.createBuffer({
			label: "cluster-params",
			size: 128,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		}), p = r.createBuffer({
			label: "cluster-grid",
			size: 8,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		}), m = r.createBuffer({
			label: "light-indices",
			size: 4,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
		}), h = !1, g = {
			shadowAtlas: i,
			shadowBuffer: o,
			pointShadowAtlas: s,
			pointShadowBuffer: c,
			clusterParamsBuffer: f,
			clusterGridBuffer: p,
			lightIndexBuffer: m,
			bindGroupsDirty: !1
		};
		e.setResource(bf, g);
		let _ = () => hr.from(e)?.eid ?? -1, v = () => {
			let e = _();
			return e >= 0 ? ke(U.clearColor[e]) : {
				r: 0,
				g: 0,
				b: 0
			};
		}, y = () => e.only([la]) >= 0, b = () => {
			let t = _();
			if (t < 0 || !e.hasComponent(t, oa)) return !1;
			let n = e.only([H]);
			return n >= 0 && H.shadows[n] !== 0;
		}, x = () => {
			let t = _();
			return t >= 0 && e.hasComponent(t, oa) ? oa.distance[t] : yf;
		}, S = () => {
			let e = _();
			return e >= 0 ? {
				world: Fi.data.subarray(e * 16, e * 16 + 16),
				fov: U.fov[e],
				near: U.near[e],
				far: U.far[e],
				width: n.width,
				height: n.height
			} : null;
		}, C = () => {
			let t = e.only([H]);
			if (t >= 0) {
				let [e, n, r] = je(H.directionX[t], H.directionY[t], H.directionZ[t]);
				return [
					e,
					n,
					r
				];
			}
			return [
				-.5,
				-1,
				-.5
			];
		}, w = t.graph.subGraph("raster"), T = pd(o, S, C, b, x);
		w.add(T);
		let ee = bd(n, o, () => (a || (a = !0, i.destroy(), i = fd(r), g.shadowAtlas = i, g.bindGroupsDirty = !0), i), b, oo.all);
		for (let e of ee) w.add(e);
		let E = () => n.pointLightData;
		w.add({
			name: "point-light-setup",
			scope: "frame",
			inputs: ["point-light-data"],
			outputs: ["point-light-raster"],
			execute(e) {
				let [t, r] = n.pointLightData;
				te = r;
				let i = !1;
				for (let e = 0; e < r; e++) if (t[e * 8 + 7] >= 0) {
					i = !0;
					break;
				}
				if (i && !l.current) {
					let t = xd(e.device, l);
					s.destroy(), c.destroy(), g.pointShadowAtlas = t.atlas, g.pointShadowBuffer = t.buffer, g.bindGroupsDirty = !0;
				}
				if (r > 0 && !h) {
					h = !0, p.destroy(), m.destroy();
					let t = rf(u, d);
					p = e.device.createBuffer({
						label: "cluster-grid",
						size: t.gridSize,
						usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
					}), m = e.device.createBuffer({
						label: "light-indices",
						size: t.indexSize,
						usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
					}), g.clusterGridBuffer = p, g.lightIndexBuffer = m, g.bindGroupsDirty = !0;
				}
			}
		});
		let te = 0, D = nf(g, n.pointLightBuffer, () => _(), () => te, u, d);
		w.add(D);
		let O = Pd(E, () => l.current?.buffer ?? null);
		w.add(O);
		let ne = Bd(n, () => l.current, E, oo.all);
		w.add(ne);
		let re = Yu({
			matrices: n.matrices,
			sizes: n.sizes,
			batching: n.batching,
			viewProj: n.viewProj
		});
		for (let e of re.nodes) w.add(e);
		let ie = vf(n, g, oo.all, v, y);
		w.add(ie);
	}
}, Sf = {
	bg: "#1a1816",
	track: "#252220",
	bar: "#d49560",
	text: "#e8e0d8"
}, Cf = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 285 80\">\n  <defs>\n    <radialGradient id=\"baseGradient\" cx=\"35%\" cy=\"30%\" r=\"70%\" fx=\"25%\" fy=\"20%\">\n      <stop offset=\"0%\" stop-color=\"#F5D4B8\"/>\n      <stop offset=\"45%\" stop-color=\"#E8A86B\"/>\n      <stop offset=\"100%\" stop-color=\"#B87654\"/>\n    </radialGradient>\n  </defs>\n  <g id=\"Icon\" transform=\"rotate(35 40 40)\">\n    <path id=\"Background\" d=\"M40,2 C44,10 66,28 66,46 C66,60 48,70 40,78 C32,70 14,60 14,46 C14,28 36,10 40,2 Z\" fill=\"#E8A86B\"/>\n    <path id=\"CloveLeft\" d=\"M40,6 C37,14 22,28 20,44 C20,52 28,62 36,70 C34,58 26,46 26,38 C26,26 38,12 40,6 Z\" fill=\"#D49560\"/>\n    <path id=\"CloveRight\" d=\"M40,6 C43,14 58,28 60,44 C60,52 52,62 44,70 C46,58 54,46 54,38 C54,26 42,12 40,6 Z\" fill=\"#D49560\"/>\n    <path id=\"CenterCrease\" d=\"M40,8 C40,20 40,50 40,72\" stroke=\"#6B4230\" stroke-width=\"1\" stroke-opacity=\"0.4\" fill=\"none\" stroke-linecap=\"round\"/>\n    <path id=\"BottomEdge\" d=\"M40,78 C48,70 66,60 66,46 C61,58 44,70 40,73 Z\" fill=\"#D49560\"/>\n    <path id=\"Outline\" d=\"M40,2 C44,10 66,28 66,46 C66,60 48,70 40,78 C32,70 14,60 14,46 C14,28 36,10 40,2 Z\" fill=\"none\" stroke=\"#6B4230\" stroke-width=\"2\"/>\n  </g>\n  <g id=\"Text\" transform=\"translate(80 59)\">\n    <path d=\"M13.37 0.73Q10.88 0.73 8.47 0.07Q6.06 -0.58 4.02 -1.75Q1.97 -2.93 0.52 -4.52L5.54 -9.63Q6.96 -8.09 8.87 -7.26Q10.79 -6.44 13.05 -6.44Q14.62 -6.44 15.44 -6.89Q16.27 -7.34 16.27 -8.18Q16.27 -9.22 15.27 -9.77Q14.27 -10.32 12.7 -10.74Q11.14 -11.17 9.4 -11.7Q7.66 -12.24 6.08 -13.17Q4.5 -14.09 3.51 -15.73Q2.52 -17.37 2.52 -19.95Q2.52 -22.65 3.92 -24.66Q5.31 -26.68 7.86 -27.83Q10.41 -28.97 13.86 -28.97Q17.43 -28.97 20.49 -27.74Q23.55 -26.51 25.46 -24.04L20.42 -18.94Q19.08 -20.5 17.43 -21.16Q15.78 -21.81 14.18 -21.81Q12.67 -21.81 11.93 -21.36Q11.19 -20.91 11.19 -20.13Q11.19 -19.23 12.18 -18.7Q13.17 -18.18 14.73 -17.78Q16.3 -17.37 18.02 -16.81Q19.75 -16.24 21.32 -15.24Q22.88 -14.24 23.87 -12.59Q24.85 -10.93 24.85 -8.29Q24.85 -4.15 21.75 -1.71Q18.65 0.73 13.37 0.73Z M48.31 0V-16.04Q48.31 -18.27 46.95 -19.62Q45.59 -20.97 43.48 -20.97Q42.04 -20.97 40.93 -20.36Q39.82 -19.75 39.19 -18.63Q38.57 -17.52 38.57 -16.04L35.12 -17.72Q35.12 -21.05 36.53 -23.53Q37.93 -26.01 40.42 -27.39Q42.91 -28.77 46.15 -28.77Q49.45 -28.77 51.94 -27.39Q54.43 -26.01 55.81 -23.61Q57.19 -21.2 57.19 -18.04V0ZM29.7 0V-42.11H38.57V0Z M74.65 0.58Q70.76 0.58 67.7 -1.33Q64.64 -3.25 62.89 -6.55Q61.13 -9.86 61.13 -14.07Q61.13 -18.3 62.89 -21.62Q64.64 -24.94 67.7 -26.85Q70.76 -28.77 74.65 -28.77Q77.49 -28.77 79.78 -27.67Q82.07 -26.56 83.51 -24.62Q84.94 -22.68 85.14 -20.18V-8Q84.94 -5.51 83.52 -3.57Q82.1 -1.62 79.79 -0.52Q77.49 0.58 74.65 0.58ZM76.44 -7.42Q79.29 -7.42 81.03 -9.29Q82.77 -11.17 82.77 -14.09Q82.77 -16.07 81.98 -17.56Q81.2 -19.05 79.78 -19.91Q78.36 -20.76 76.47 -20.76Q74.62 -20.76 73.2 -19.91Q71.78 -19.05 70.95 -17.55Q70.12 -16.04 70.12 -14.09Q70.12 -12.15 70.93 -10.64Q71.75 -9.13 73.18 -8.28Q74.62 -7.42 76.44 -7.42ZM82.39 0V-7.57L83.72 -14.44L82.39 -21.26V-28.19H91.12V0Z M97.38 0V-42.11H106.26V0Z M112.52 0V-42.11H121.39V0Z M141.23 0.64Q136.85 0.64 133.36 -1.31Q129.86 -3.25 127.83 -6.61Q125.8 -9.98 125.8 -14.15Q125.8 -18.33 127.82 -21.63Q129.83 -24.94 133.33 -26.88Q136.82 -28.83 141.2 -28.83Q145.61 -28.83 149.09 -26.9Q152.57 -24.97 154.6 -21.65Q156.63 -18.33 156.63 -14.15Q156.63 -9.98 154.61 -6.61Q152.6 -3.25 149.12 -1.31Q145.64 0.64 141.23 0.64ZM141.2 -7.42Q143.12 -7.42 144.56 -8.27Q146.02 -9.11 146.81 -10.63Q147.61 -12.15 147.61 -14.12Q147.61 -16.1 146.78 -17.59Q145.96 -19.08 144.54 -19.92Q143.12 -20.76 141.2 -20.76Q139.34 -20.76 137.9 -19.91Q136.45 -19.05 135.63 -17.56Q134.82 -16.07 134.82 -14.09Q134.82 -12.15 135.63 -10.63Q136.45 -9.11 137.9 -8.27Q139.34 -7.42 141.2 -7.42Z M165.07 0V-39.85H173.94V0ZM158.69 -20.65V-28.19H180.32V-20.65Z\" fill=\"#3D2415\" transform=\"translate(2.5 3)\"/>\n    <path d=\"M13.37 0.73Q10.88 0.73 8.47 0.07Q6.06 -0.58 4.02 -1.75Q1.97 -2.93 0.52 -4.52L5.54 -9.63Q6.96 -8.09 8.87 -7.26Q10.79 -6.44 13.05 -6.44Q14.62 -6.44 15.44 -6.89Q16.27 -7.34 16.27 -8.18Q16.27 -9.22 15.27 -9.77Q14.27 -10.32 12.7 -10.74Q11.14 -11.17 9.4 -11.7Q7.66 -12.24 6.08 -13.17Q4.5 -14.09 3.51 -15.73Q2.52 -17.37 2.52 -19.95Q2.52 -22.65 3.92 -24.66Q5.31 -26.68 7.86 -27.83Q10.41 -28.97 13.86 -28.97Q17.43 -28.97 20.49 -27.74Q23.55 -26.51 25.46 -24.04L20.42 -18.94Q19.08 -20.5 17.43 -21.16Q15.78 -21.81 14.18 -21.81Q12.67 -21.81 11.93 -21.36Q11.19 -20.91 11.19 -20.13Q11.19 -19.23 12.18 -18.7Q13.17 -18.18 14.73 -17.78Q16.3 -17.37 18.02 -16.81Q19.75 -16.24 21.32 -15.24Q22.88 -14.24 23.87 -12.59Q24.85 -10.93 24.85 -8.29Q24.85 -4.15 21.75 -1.71Q18.65 0.73 13.37 0.73Z M48.31 0V-16.04Q48.31 -18.27 46.95 -19.62Q45.59 -20.97 43.48 -20.97Q42.04 -20.97 40.93 -20.36Q39.82 -19.75 39.19 -18.63Q38.57 -17.52 38.57 -16.04L35.12 -17.72Q35.12 -21.05 36.53 -23.53Q37.93 -26.01 40.42 -27.39Q42.91 -28.77 46.15 -28.77Q49.45 -28.77 51.94 -27.39Q54.43 -26.01 55.81 -23.61Q57.19 -21.2 57.19 -18.04V0ZM29.7 0V-42.11H38.57V0Z M74.65 0.58Q70.76 0.58 67.7 -1.33Q64.64 -3.25 62.89 -6.55Q61.13 -9.86 61.13 -14.07Q61.13 -18.3 62.89 -21.62Q64.64 -24.94 67.7 -26.85Q70.76 -28.77 74.65 -28.77Q77.49 -28.77 79.78 -27.67Q82.07 -26.56 83.51 -24.62Q84.94 -22.68 85.14 -20.18V-8Q84.94 -5.51 83.52 -3.57Q82.1 -1.62 79.79 -0.52Q77.49 0.58 74.65 0.58ZM76.44 -7.42Q79.29 -7.42 81.03 -9.29Q82.77 -11.17 82.77 -14.09Q82.77 -16.07 81.98 -17.56Q81.2 -19.05 79.78 -19.91Q78.36 -20.76 76.47 -20.76Q74.62 -20.76 73.2 -19.91Q71.78 -19.05 70.95 -17.55Q70.12 -16.04 70.12 -14.09Q70.12 -12.15 70.93 -10.64Q71.75 -9.13 73.18 -8.28Q74.62 -7.42 76.44 -7.42ZM82.39 0V-7.57L83.72 -14.44L82.39 -21.26V-28.19H91.12V0Z M97.38 0V-42.11H106.26V0Z M112.52 0V-42.11H121.39V0Z M141.23 0.64Q136.85 0.64 133.36 -1.31Q129.86 -3.25 127.83 -6.61Q125.8 -9.98 125.8 -14.15Q125.8 -18.33 127.82 -21.63Q129.83 -24.94 133.33 -26.88Q136.82 -28.83 141.2 -28.83Q145.61 -28.83 149.09 -26.9Q152.57 -24.97 154.6 -21.65Q156.63 -18.33 156.63 -14.15Q156.63 -9.98 154.61 -6.61Q152.6 -3.25 149.12 -1.31Q145.64 0.64 141.23 0.64ZM141.2 -7.42Q143.12 -7.42 144.56 -8.27Q146.02 -9.11 146.81 -10.63Q147.61 -12.15 147.61 -14.12Q147.61 -16.1 146.78 -17.59Q145.96 -19.08 144.54 -19.92Q143.12 -20.76 141.2 -20.76Q139.34 -20.76 137.9 -19.91Q136.45 -19.05 135.63 -17.56Q134.82 -16.07 134.82 -14.09Q134.82 -12.15 135.63 -10.63Q136.45 -9.11 137.9 -8.27Q139.34 -7.42 141.2 -7.42Z M165.07 0V-39.85H173.94V0ZM158.69 -20.65V-28.19H180.32V-20.65Z\" fill=\"none\" stroke=\"#6B4230\" stroke-width=\"3.5\" stroke-linejoin=\"round\"/>\n    <path d=\"M13.37 0.73Q10.88 0.73 8.47 0.07Q6.06 -0.58 4.02 -1.75Q1.97 -2.93 0.52 -4.52L5.54 -9.63Q6.96 -8.09 8.87 -7.26Q10.79 -6.44 13.05 -6.44Q14.62 -6.44 15.44 -6.89Q16.27 -7.34 16.27 -8.18Q16.27 -9.22 15.27 -9.77Q14.27 -10.32 12.7 -10.74Q11.14 -11.17 9.4 -11.7Q7.66 -12.24 6.08 -13.17Q4.5 -14.09 3.51 -15.73Q2.52 -17.37 2.52 -19.95Q2.52 -22.65 3.92 -24.66Q5.31 -26.68 7.86 -27.83Q10.41 -28.97 13.86 -28.97Q17.43 -28.97 20.49 -27.74Q23.55 -26.51 25.46 -24.04L20.42 -18.94Q19.08 -20.5 17.43 -21.16Q15.78 -21.81 14.18 -21.81Q12.67 -21.81 11.93 -21.36Q11.19 -20.91 11.19 -20.13Q11.19 -19.23 12.18 -18.7Q13.17 -18.18 14.73 -17.78Q16.3 -17.37 18.02 -16.81Q19.75 -16.24 21.32 -15.24Q22.88 -14.24 23.87 -12.59Q24.85 -10.93 24.85 -8.29Q24.85 -4.15 21.75 -1.71Q18.65 0.73 13.37 0.73Z M48.31 0V-16.04Q48.31 -18.27 46.95 -19.62Q45.59 -20.97 43.48 -20.97Q42.04 -20.97 40.93 -20.36Q39.82 -19.75 39.19 -18.63Q38.57 -17.52 38.57 -16.04L35.12 -17.72Q35.12 -21.05 36.53 -23.53Q37.93 -26.01 40.42 -27.39Q42.91 -28.77 46.15 -28.77Q49.45 -28.77 51.94 -27.39Q54.43 -26.01 55.81 -23.61Q57.19 -21.2 57.19 -18.04V0ZM29.7 0V-42.11H38.57V0Z M74.65 0.58Q70.76 0.58 67.7 -1.33Q64.64 -3.25 62.89 -6.55Q61.13 -9.86 61.13 -14.07Q61.13 -18.3 62.89 -21.62Q64.64 -24.94 67.7 -26.85Q70.76 -28.77 74.65 -28.77Q77.49 -28.77 79.78 -27.67Q82.07 -26.56 83.51 -24.62Q84.94 -22.68 85.14 -20.18V-8Q84.94 -5.51 83.52 -3.57Q82.1 -1.62 79.79 -0.52Q77.49 0.58 74.65 0.58ZM76.44 -7.42Q79.29 -7.42 81.03 -9.29Q82.77 -11.17 82.77 -14.09Q82.77 -16.07 81.98 -17.56Q81.2 -19.05 79.78 -19.91Q78.36 -20.76 76.47 -20.76Q74.62 -20.76 73.2 -19.91Q71.78 -19.05 70.95 -17.55Q70.12 -16.04 70.12 -14.09Q70.12 -12.15 70.93 -10.64Q71.75 -9.13 73.18 -8.28Q74.62 -7.42 76.44 -7.42ZM82.39 0V-7.57L83.72 -14.44L82.39 -21.26V-28.19H91.12V0Z M97.38 0V-42.11H106.26V0Z M112.52 0V-42.11H121.39V0Z M141.23 0.64Q136.85 0.64 133.36 -1.31Q129.86 -3.25 127.83 -6.61Q125.8 -9.98 125.8 -14.15Q125.8 -18.33 127.82 -21.63Q129.83 -24.94 133.33 -26.88Q136.82 -28.83 141.2 -28.83Q145.61 -28.83 149.09 -26.9Q152.57 -24.97 154.6 -21.65Q156.63 -18.33 156.63 -14.15Q156.63 -9.98 154.61 -6.61Q152.6 -3.25 149.12 -1.31Q145.64 0.64 141.23 0.64ZM141.2 -7.42Q143.12 -7.42 144.56 -8.27Q146.02 -9.11 146.81 -10.63Q147.61 -12.15 147.61 -14.12Q147.61 -16.1 146.78 -17.59Q145.96 -19.08 144.54 -19.92Q143.12 -20.76 141.2 -20.76Q139.34 -20.76 137.9 -19.91Q136.45 -19.05 135.63 -17.56Q134.82 -16.07 134.82 -14.09Q134.82 -12.15 135.63 -10.63Q136.45 -9.11 137.9 -8.27Q139.34 -7.42 141.2 -7.42Z M165.07 0V-39.85H173.94V0ZM158.69 -20.65V-28.19H180.32V-20.65Z\" fill=\"#E8A86B\"/>\n  </g>\n</svg>";
function wf(e, t) {
	if (typeof document > "u") return null;
	let n = document.createElement("div"), r = t ?? document.querySelector("canvas")?.parentElement ?? document.body;
	return n.style.cssText = `
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: ${e};
        z-index: 10000;
    `, getComputedStyle(r).position === "static" && (r.style.position = "relative"), r.appendChild(n), n;
}
function Tf(e) {
	let t = document.createElement("div");
	t.style.cssText = `
        width: 228px;
        height: 4px;
        background: ${e.track};
        overflow: hidden;
    `;
	let n = document.createElement("div");
	return n.style.cssText = `
        width: 0%;
        height: 100%;
        background: ${e.bar};
        transition: width 0.15s ease-out;
    `, t.appendChild(n), {
		track: t,
		bar: n
	};
}
function Ef(e, t, n, r) {
	let i = document.createElement("div");
	i.style.cssText = `max-width: 400px; color: ${n.text}; font: 14px/1.5 system-ui, sans-serif; text-align: center;`, i.textContent = t, r ? r.replaceWith(i) : e.appendChild(i);
}
function Df(e, t) {
	let n = null, r = null, i = null;
	return {
		show() {
			if (n = wf(e.bg, t), !n) return;
			let a = document.createElement("div");
			a.innerHTML = Cf, a.style.cssText = "width: 228px; height: 64px; margin-bottom: 24px;", n.appendChild(a);
			let o = Tf(e);
			return r = o.bar, i = o.track, n.appendChild(o.track), () => {
				n?.remove(), n = null, r = null, i = null;
			};
		},
		update(e) {
			r && (r.style.width = `${e * 100}%`);
		},
		error(t) {
			n && Ef(n, t, e, i ?? void 0);
		}
	};
}
var Of = (e) => Df(Sf, e), kf = We(16), Af = [];
function jf(e) {
	return Af[e];
}
function Mf(e) {
	let t = kf.get(e), n = Af[e];
	if (!t || !n) return [];
	let r = [];
	for (let [e, i] of n) {
		let n = t.paramLayout.get(e);
		n !== void 0 && r.push([n, i]);
	}
	return r;
}
var Nf = We(256);
function Pf(e) {
	if (!e.backend) return;
	let t = Nf.all();
	for (let n = 0; n < t.length; n++) {
		let r = t[n];
		r.data && e.registeredSampleVersions.get(n) !== r.version && (e.backend.send({
			type: "set_sample",
			id: n,
			data: r.data
		}), e.registeredSampleVersions.set(n, r.version));
	}
}
var Ff = 523.2511;
function If(e, t = 0, n = 0, r = 0) {
	return (e > 0 ? e : Ff) * 2 ** (t + n / 12 + r / 1200);
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/audio/worklet.ts
function Lf() {
	let e = new Blob([Rf], { type: "application/javascript" });
	return URL.createObjectURL(e);
}
var Rf, zf = t((() => {
	Rf = "\nconst MAX_TRANSPORTS = 8;\n\nclass SynthProcessor extends AudioWorkletProcessor {\n    constructor() {\n        super();\n        this.wasm = null;\n        this.memory = null;\n        this._pendingMessages = [];\n        this._releasing = new Set();\n        this._frameCount = 0;\n        this._outputPeak = 0;\n        this._lastFrame = -1;\n        this._droppedBlocks = 0;\n        this._warmedUp = false;\n        this.port.onmessage = (e) => {\n            if (e.data.type === \"init\") {\n                WebAssembly.instantiate(e.data.bytes, {}).then((result) => {\n                    this.wasm = result.instance.exports;\n                    this.memory = this.wasm.memory;\n                    this.wasm.audio_init(sampleRate);\n                    for (const msg of this._pendingMessages) {\n                        this._handleMessage(msg);\n                    }\n                    this._pendingMessages = [];\n                });\n            } else {\n                if (!this.wasm) {\n                    this._pendingMessages.push(e.data);\n                } else {\n                    this._handleMessage(e.data);\n                }\n            }\n        };\n    }\n\n    _handleMessage(data) {\n        if (data.type === \"batch\") {\n            for (const cmd of data.commands) this._handleMessage(cmd);\n            return;\n        }\n        if (data.type === \"params\") {\n            for (const [voiceId, paramId, value] of data.changes) {\n                this.wasm.audio_set_param(voiceId, paramId, value);\n            }\n        } else if (data.type === \"gate\") {\n            this.wasm.audio_set_gate(data.voiceId, data.value);\n            if (data.value !== 0) {\n                this._releasing.delete(data.voiceId);\n            }\n        } else if (data.type === \"spatial\") {\n            const arr = data.data;\n            for (let i = 0; i < arr.length; i += 7) {\n                this.wasm.audio_set_spatial(\n                    arr[i],\n                    arr[i + 1],\n                    arr[i + 2],\n                    arr[i + 3],\n                    arr[i + 4],\n                    arr[i + 5],\n                    arr[i + 6],\n                );\n            }\n        } else if (data.type === \"voice_active\") {\n            this.wasm.audio_voice_active(data.voiceId, data.active ? 1 : 0);\n            if (!data.active) {\n                this._releasing.delete(data.voiceId);\n            }\n        } else if (data.type === \"set_instrument\") {\n            this.wasm.audio_set_instrument(data.id, data.nodeCount, data.outputBuf);\n            for (let i = 0; i < data.nodes.length; i++) {\n                const n = data.nodes[i];\n                this.wasm.audio_set_instrument_node(data.id, i, n.type, n.inputBuf, n.inputBufB, n.outputBuf, n.paramOffset);\n            }\n            if (data.modulations) {\n                for (let i = 0; i < data.modulations.length; i++) {\n                    const m = data.modulations[i];\n                    this.wasm.audio_set_instrument_mod(data.id, i, m.sourceBuf, m.targetNode, m.targetParam, m.depthParam, m.mode);\n                }\n            }\n        } else if (data.type === \"set_voice_instrument\") {\n            this.wasm.audio_set_voice_instrument(data.voiceId, data.instrumentId);\n            this._releasing.delete(data.voiceId);\n        } else if (data.type === \"transport_play\") {\n            this.wasm.transport_play(data.tid);\n        } else if (data.type === \"transport_stop\") {\n            this.wasm.transport_stop(data.tid);\n        } else if (data.type === \"transport_pause\") {\n            this.wasm.transport_pause(data.tid);\n        } else if (data.type === \"transport_set_bpm\") {\n            this.wasm.transport_set_bpm(data.tid, data.bpm);\n        } else if (data.type === \"transport_queue_event\") {\n            this.wasm.transport_queue_event(\n                data.tid,\n                data.beat, data.voiceId, data.durationBeats,\n                data.p0Off ?? 0, data.p0Val ?? 0,\n                data.p1Off ?? 0, data.p1Val ?? 0,\n                data.p2Off ?? 0, data.p2Val ?? 0,\n                data.p3Off ?? 0, data.p3Val ?? 0,\n                data.paramCount ?? 0,\n            );\n        } else if (data.type === \"transport_clear_events\") {\n            this.wasm.transport_clear_events(data.tid);\n        } else if (data.type === \"transport_set_loop\") {\n            this.wasm.transport_set_loop(data.tid, data.length);\n        } else if (data.type === \"transport_seek\") {\n            this.wasm.transport_seek(data.tid, data.beat);\n        } else if (data.type === \"voice_spatial\") {\n            this.wasm.audio_set_voice_spatial(data.voiceId, data.spatial ? 1 : 0);\n        } else if (data.type === \"voice_one_shot\") {\n            this.wasm.audio_set_voice_one_shot(data.voiceId, 1);\n        } else if (data.type === \"acoustic\") {\n            const arr = data.data;\n            for (let i = 0; i < data.len; i += 5) {\n                this.wasm.audio_set_acoustic_separate(arr[i], arr[i + 1], arr[i + 2], arr[i + 3], arr[i + 4]);\n            }\n        } else if (data.type === \"set_sample\") {\n            const ptr = this.wasm.audio_sample_alloc(data.id, data.data.length);\n            if (ptr) {\n                new Float32Array(this.memory.buffer, ptr, data.data.length).set(data.data);\n            }\n        } else if (data.type === \"reflectionIR\") {\n            const ptr = this.wasm.audio_ir_staging_ptr();\n            const staging = new Float32Array(this.memory.buffer, ptr, data.irLen);\n            staging.set(data.ir.subarray(0, data.irLen));\n            this.wasm.audio_set_reflection_ir(data.voiceId, data.irLen);\n        } else if (data.type === \"reflectionGain\") {\n            this.wasm.audio_set_reflection_gain(data.voiceId, data.gain);\n        } else if (data.type === \"reverb\") {\n            this.wasm.audio_set_reverb(data.rt60Low, data.rt60Mid, data.rt60High, data.wetGain, data.eqLow, data.eqMid, data.eqHigh);\n        } else if (data.type === \"watch_idle\") {\n            this._releasing.add(data.voiceId);\n        } else if (data.type === \"reset\") {\n            this.wasm.audio_reset();\n            this._lastFrame = -1;\n            this._warmedUp = false;\n        } else if (data.type === \"set_budget\") {\n            this.wasm.audio_set_real_voice_budget(data.budget);\n        }\n    }\n\n    process(inputs, outputs, parameters) {\n        if (!this.wasm) return true;\n        try {\n        if (this._lastFrame >= 0) {\n            const gap = currentFrame - this._lastFrame;\n            if (gap > 128) {\n                this._droppedBlocks += (gap / 128) - 1;\n            }\n        }\n        this._lastFrame = currentFrame;\n        const ptr = this.wasm.audio_process();\n        const buf = this.memory.buffer;\n        const stereo = new Float32Array(buf, ptr, 256);\n        const out = outputs[0];\n        if (out.length >= 2 && out[0].length >= 128) {\n            out[0].set(stereo.subarray(0, 128));\n            out[1].set(stereo.subarray(128, 256));\n        } else if (out.length === 1 && out[0].length >= 128) {\n            for (let i = 0; i < 128; i++) {\n                out[0][i] = (stereo[i] + stereo[128 + i]) * 0.5;\n            }\n        }\n\n        const rb = new Uint32Array(buf, this.wasm.transport_readback_ptr(), MAX_TRANSPORTS * 4);\n        const beats = [];\n        for (let tid = 0; tid < MAX_TRANSPORTS; tid++) {\n            const base = tid * 4;\n            if (rb[base] !== 0) {\n                beats.push({ tid, beatLo: rb[base + 1], beatHi: rb[base + 2] });\n            }\n        }\n        if (beats.length > 0) {\n            this.port.postMessage({ type: \"transport_beats\", beats });\n        }\n\n        const idle = [];\n        for (const voiceId of this._releasing) {\n            if (this.wasm.audio_voice_idle(voiceId)) {\n                idle.push(voiceId);\n            }\n        }\n        for (const voiceId of idle) {\n            this.port.postMessage({ type: \"voice_idle\", voiceId });\n            this._releasing.delete(voiceId);\n        }\n\n        const overflow = this.wasm.audio_overflow_count();\n        if (overflow > 0) {\n            this.port.postMessage({ type: \"overflow\", count: overflow });\n        }\n\n        let outPeak = 0;\n        let hasNaN = false;\n        if (out.length >= 2) {\n            for (let i = 0; i < 128; i++) {\n                const l = out[0][i];\n                const r = out[1][i];\n                if (l !== l || r !== r) { hasNaN = true; break; }\n                const a = Math.abs(l);\n                if (a > outPeak) outPeak = a;\n                const b = Math.abs(r);\n                if (b > outPeak) outPeak = b;\n            }\n        }\n        if (hasNaN) outPeak = -1;\n        if (outPeak > this._outputPeak || (outPeak < 0 && this._outputPeak >= 0)) this._outputPeak = outPeak;\n\n        if (++this._frameCount % 344 === 0) {\n            if (!this._warmedUp) {\n                this._warmedUp = true;\n                this._droppedBlocks = 0;\n            }\n            this.port.postMessage({\n                type: \"heartbeat\",\n                frame: this._frameCount,\n                outputPeak: this._outputPeak,\n                dropped: this._droppedBlocks,\n            });\n            this._outputPeak = 0;\n            this._droppedBlocks = 0;\n        }\n        } catch (e) {\n            this.port.postMessage({ type: \"error\", message: String(e) });\n        }\n        return true;\n    }\n}\n\nregisterProcessor(\"synth-processor\", SynthProcessor);\n";
}));
//#endregion
//#region ../../shallot/packages/shallot/rust/audio/pkg/shallot_audio.js
async function Bf() {
	return (await fetch(Vf)).arrayBuffer();
}
var Vf, Hf = t((() => {
	Vf = new URL("data:application/wasm;base64,AGFzbQEAAAABugIoYAJ/fwBgA39/fwF/YAJ/fwF/YAF/AGADf39/AGAEf39/fwBgDn9/fH99f31/fX99f31/AGACf30AYAF/AX9gDH9/f39/fX1/f39/fwBgC39/f39/f399fX9/AGAIf39/f399f38AYAJ/fQF9YAABf2AAAX1gAX0AYAAAYAR/fX19AGAFf319fX0AYAd/f39/f39/AGADf399AGAHfX19fX19fQBgB399fX19fX0AYA1/fH99f31/fX99f31/AGACf3wAYAR/f39/AX9gBX9/f39/AGAGf39/f39/AGACfn8Bf2AGf39/f39/AX9gA35/fwF/YAR/fX9/AX9gBX9/f39/AX9gCX9/f39/f35+fgBgCH9/f39/f39/AGABfQF9YAV/fn5+fgBgAn19AX1gAXwBfGACfHwBfAOqAagBAwEDAAQEBQQGBwcICQUFCgsMBQMNDQ0NDg8NDQ4NEAIREgAABBMTFAMHABUWAAAADQAIAwMDFw0YBxgDAgQZAhACAAICCBAEAxkAAAMDAgAAAAAaAwMDGwAaCAABAwMAAgECAgAAAAAAAAQAABAZAhwCHQEBAgQEHgICBQQaGhMfBQUfHwIgAgEBAQIhAxsCIgIdIyMkJSMjIyMYJiYjIyMjJyYlIyMmBAUBcAEXFwUDAQASBhkDfwFBgIDAAAt/AEHgqcUAC38AQeCpxQALB6MHLAZtZW1vcnkCABJhdWRpb19jbGVhcl9zYW1wbGUAExFhdWRpb19kaWFnX2FjdGl2ZQAUFGF1ZGlvX2RpYWdfY29udm9sdmVkABUPYXVkaW9fZGlhZ19yZWFsABYSYXVkaW9fZGlhZ192aXJ0dWFsABcOYXVkaW9fZmRuX3BlYWsAGAphdWRpb19pbml0ABkUYXVkaW9faXJfc3RhZ2luZ19wdHIAGhRhdWRpb19vdmVyZmxvd19jb3VudAAbE2F1ZGlvX3ByZV90YW5oX3BlYWsAHA1hdWRpb19wcm9jZXNzAB0LYXVkaW9fcmVzZXQAHhJhdWRpb19zYW1wbGVfYWxsb2MAHxJhdWRpb19zZXRfYWNvdXN0aWMAIBthdWRpb19zZXRfYWNvdXN0aWNfc2VwYXJhdGUAIQ5hdWRpb19zZXRfZ2F0ZQAiF2F1ZGlvX3NldF9nYXRlX2R1cmF0aW9uACMUYXVkaW9fc2V0X2luc3RydW1lbnQAJBhhdWRpb19zZXRfaW5zdHJ1bWVudF9tb2QAJRlhdWRpb19zZXRfaW5zdHJ1bWVudF9ub2RlACYPYXVkaW9fc2V0X3BhcmFtACcbYXVkaW9fc2V0X3JlYWxfdm9pY2VfYnVkZ2V0ACgZYXVkaW9fc2V0X3JlZmxlY3Rpb25fZ2FpbgApF2F1ZGlvX3NldF9yZWZsZWN0aW9uX2lyACoQYXVkaW9fc2V0X3JldmVyYgArEWF1ZGlvX3NldF9zcGF0aWFsACwaYXVkaW9fc2V0X3ZvaWNlX2luc3RydW1lbnQALRhhdWRpb19zZXRfdm9pY2Vfb25lX3Nob3QALhdhdWRpb19zZXRfdm9pY2Vfc3BhdGlhbAAvFGF1ZGlvX3NwaWtlX2RpYWdfcHRyADASYXVkaW9fdm9pY2VfYWN0aXZlADEQYXVkaW9fdm9pY2VfaWRsZQAyFnRyYW5zcG9ydF9jbGVhcl9ldmVudHMAMw90cmFuc3BvcnRfcGF1c2UANA50cmFuc3BvcnRfcGxheQA1FXRyYW5zcG9ydF9xdWV1ZV9ldmVudAA2FnRyYW5zcG9ydF9yZWFkYmFja19wdHIANw50cmFuc3BvcnRfc2VlawA4EXRyYW5zcG9ydF9zZXRfYnBtADkSdHJhbnNwb3J0X3NldF9sb29wADoOdHJhbnNwb3J0X3N0b3AAOwpfX2RhdGFfZW5kAwELX19oZWFwX2Jhc2UDAgkeAQBBAQsWhQFYXWFgXGJnZWZeY2loX1FSeXGRAXVvCpSPB6gB5AkBBX8gACgCvBQhAUEAIQIDQAJAIAEgAmoiA0GNKGotAABBAUcNAAJAIANB/CdqKAIAIgRFDQACQEHw8ABFIgUNACAEKAIQQQBB8PAA/AsACwJAIAUNACAEKAIUQQBB8PAA/AsACyAEQQA6AKQEQYQERQ0AIARBGGpBAEGEBPwLAAsgA0HEJ2pBADYCAAsgAkGUKGoiAkGAihRHDQALAkBB5D9FDQAgAEG8/QFqQQBB5D/8CwALAkBBgIDAAEUNACAAKALIFEEAQYCAwAD8CwALAkBBgCBFIgINACAAQYTEAGpBAEGAIPwLAAsCQCACDQAgAEGQ5ABqQQBBgCD8CwALAkAgAg0AIABBnIQBakEAQYAg/AsACyAAQegVakIANwIAIABCADcC4BUgAEIANwKEFiAAQYwWakIANwIAIABCADcCqBYgAEGwFmpCADcCACAAQgA3AswWIABB1BZqQgA3AgAgAEIANwLwFiAAQfgWakIANwIAIABCADcClBcgAEGcF2pCADcCACAAQgA3ArgXIABBwBdqQgA3AgAgAEHkF2pCADcCACAAQgA3AtwXIABBiBhqQgA3AgAgAEIANwKAGCAAQawYakIANwIAIABCADcCpBggAEHQGGpCADcCACAAQgA3AsgYIABB9BhqQgA3AgAgAEIANwLsGCAAQZgZakIANwIAIABCADcCkBkgAEG8GWpCADcCACAAQgA3ArQZIABB4BlqQgA3AgAgAEIANwLYGSAAQYQaakIANwIAIABCADcC/BkgAEGoGmpCADcCACAAQgA3AqAaIABBzBpqQgA3AgAgAEIANwLEGiAAQfAaakIANwIAIABCADcC6BogAEGUG2pCADcCACAAQgA3AowbIABBuBtqQgA3AgAgAEIANwKwGyAAQdwbakIANwIAIABCADcC1BsgAEGAHGpCADcCACAAQgA3AvgbIABBpBxqQgA3AgAgAEIANwKcHCAAQcgcakIANwIAIABCADcCwBwgAEHsHGpCADcCACAAQgA3AuQcIABBkB1qQgA3AgAgAEIANwKIHSAAQbQdakIANwIAIABCADcCrB0gAEHYHWpCADcCACAAQgA3AtAdIABB/B1qQgA3AgAgAEIANwL0HSAAQaAeakIANwIAIABCADcCmB4gAEHEHmpCADcCACAAQgA3ArweIABB6B5qQgA3AgAgAEIANwLgHiAAQYwfakIANwIAIABCADcChB8gAEGwH2pCADcCACAAQgA3AqgfIABB1B9qQgA3AgAgAEIANwLMHyAAQfgfakIANwIAIABCADcC8B8gAEGcIGpCADcCACAAQgA3ApQgIABBwCBqQgA3AgAgAEIANwK4ICAAQeQgakIANwIAIABCADcC3CAgAEGIIWpCADcCACAAQgA3AoAhIABBrCFqQgA3AgAgAEIANwKkISAAQdAhakIANwIAIABCADcCyCEgAEH0IWpCADcCACAAQgA3AuwhIABBmCJqQgA3AgAgAEIANwKQIiAAQbwiakIANwIAIABCADcCtCIgAEHgImpCADcCACAAQgA3AtgiIABBhCNqQgA3AgAgAEIANwL8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IABBgCBqQQBBggT8CwALIABBnCRqQQA7AQAgAEGUJGpCADcCACAAQYwkakIANwIAIABCADcChCQgAEIANwKgJCAAQagkakIANwIAIABBsCRqQgA3AgAgAEG4JGpBADsBACAAQgA3ArwkIABBxCRqQgA3AgAgAEHMJGpCADcCACAAQdQkakEAOwEAIABCADcC2CQgAEHgJGpCADcCACAAQegkakIANwIAIABB8CRqQQA7AQAgAEGMJWpBADsBACAAQYQlakIANwIAIABB/CRqQgA3AgAgAEIANwL0JCAAQaglakEAOwEAIABBoCVqQgA3AgAgAEGYJWpCADcCACAAQgA3ApAlIABCADcCrCUgAEG0JWpCADcCACAAQbwlakIANwIAIABBxCVqQQA7AQAgAEIANwLIJSAAQdAlakIANwIAIABB2CVqQgA3AgAgAEHgJWpBADsBACAAQgA3AuQlIABB7CVqQgA3AgAgAEH0JWpCADcCACAAQfwlakEAOwEAIABCADcCgCYgAEGIJmpCADcCACAAQZAmakIANwIAIABBmCZqQQA7AQAgAEG0JmpBADsBACAAQawmakIANwIAIABBpCZqQgA3AgAgAEIANwKcJiAAQdAmakEAOwEAIABByCZqQgA3AgAgAEHAJmpCADcCACAAQgA3ArgmIABB7CZqQQA7AQAgAEHkJmpCADcCACAAQdwmakIANwIAIABCADcC1CYgAEGIJ2pBADsBACAAQYAnakIANwIAIABB+CZqQgA3AgAgAEIANwLwJiAAQZwnakIANwIAIABBlCdqQgA3AgAgAEIANwKMJwwBCyADQQxqIgUtAFAhBkEAIQNBACEHQQAhCEEAIQlBACEKQQAhC0EAIQxBACENQQAhDkEAIQ9BACEQQQAhEUEAIRJBACETQQAhFEEAIRUCQCAEQQFGDQAgBS0AVSEHAkACQAJAIARBAkcNAEEAIQhBACEJQQAhCkEAIQtBACEMQQAhDUEAIQ5BACEPQQAhEEEAIRFBACESQQAhEwwBCyAFLQBaIQgCQCAEQQNHDQBBACEJQQAhCkEAIQtBACEMQQAhDUEAIQ5BACEPQQAhEEEAIRFBACESQQAhEwwBCyAFLQBfIQkCQCAEQQRHDQBBACEKQQAhC0EAIQxBACENQQAhDkEAIQ9BACEQQQAhEUEAIRJBACETDAEL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AmpBADoAACAFQcQCakKAgICAgICA+MIANwIAIAVBvAJqQgA3AgAgBUG4AmpBADoAACAFQbQCakEANgIAIAVBsAJqQQA6AAAgBUGsAmpBADYCACAFQagCakEAOgAAIAVBpAJqQQA2AgAgBUGgAmpBADoAACAFQZwCakEAOgAAIAVBlAJqQoCAgICAgID4wgA3AgAgBUGMAmpCADcCACAFQYgCakEAOgAAIAVBhAJqQQA2AgAgBUGAAmpBADoAACAFQfwBakEANgIAIAVB+AFqQQA6AAAgBUH0AWpBADYCACAFQfABakEAOgAAIAVB7AFqQQA6AAAgBUHkAWpCgICAgICAgPjCADcCACAFQdwBakIANwIAIAVB2AFqQQA6AAAgBUHUAWpBADYCACAFQdABakEAOgAAIAVBzAFqQQA2AgAgBUHIAWpBADoAACAFQcQBakEANgIAIAVBwAFqQQA6AAAgBUG8AWpBADoAACAFQbQBakKAgICAgICA+MIANwIAIAVBrAFqQgA3AgAgBUGoAWpBADoAACAFQaQBakEANgIAIAVBoAFqQQA6AAAgBUGcAWpBADYCACAFQZgBakEAOgAAIAVBlAFqQQA2AgAgBUGQAWpBADoAACAFQYwBakEAOgAAIAVBhAFqQoCAgICAgID4wgA3AgAgBUH8AGpCADcCACAFQfgAakEAOgAAIAVB9ABqQQA2AgAgBUHwAGpBADoAACAFQewAakEANgIAIAVB6ABqQQA6AAAgBUHkAGpBADYCACAFQeAAakEAOgAAIAVB3ABqQQA6AAAgBUHUAGpCgICAgICAgPjCADcCACAFQcwAakIANwIAIAVByABqQQA6AAAgBUHEAGpBADYCACAFQcAAakEAOgAAIAVBPGpBADYCACAFQThqQQA6AAAgBUE0akEANgIAIAVBMGpBADoAACAFQSxqQQA6AAAgBUEkakKAgICAgICA+MIANwIAIAVBHGpCADcCACAFQRhqQQA6AAAgBUEUakEANgIAIAVBEGpBADoAACAFQQxqQQA2AgAgBUEIakEAOgAAIAVBBGpBADYCACAEQYADaiIEQYDAAUcNAAtBACEJAkBBgAJFDQAgAkHA2AJqQQBBgAL8CwALIAJB+NoFakIANwMAIAJB8NoFakIANwMAIAJB6NoFakIANwMAIAJB4NoFakIANwMAIAJB2NoFakIANwMAIAJBwNoFakEQakIANwMAIAJByNoFakIANwMAIAJCADcDwNoFIAFDAADAP5T8ASIFQRAgBUEQSxtBBHYhCkEqIQsDQCAKIAtB7ZyZjgRsQbngAGoiC0EQdkHlAHBqIgVBAiAFQQJLGyEMIAlBAnQiDSgC4O7AgAAhDkEBIQUCQANAIAUiBCAMTw0BIAQgDmwiBUGBgAFJDQALCyACQcDaBWogDWogBDYCACAJQQFqIglBEEcNAAsQwICAgABBgIDAAEEEELyAgIAAIgxFDQRBACEFAkBBgIDAAEUNACAMQQBBgIDAAPwLAAsgAkH86gNqQgA3AgAgAkH06gNqQgA3AgAgAkHs6gNqQgA3AgAgAkHk6gNqQgA3AgAgAkHc6gNqQgA3AgAgAkHU6gNqQgA3AgAgAkHM6gNqQgA3AgAgAkIANwLE6gMCQEGAIEUiBA0AIAJBwPoEakEAQYAg/AsACwJAIAQNACACQcDaAmpBAEGAIPwLAAsCQCAEDQAgAkHAugVqQQBBgCD8CwALAkAgBA0AIAJBwJoFakEAQYAg/AsACyACQdDrA2pCADcCACACQdjrA2pCADcCACACQeDrA2pCADcCACACQYzrA2ogAkHI2gVqKQMANwIAIAJBlOsDaiACQdDaBWopAwA3AgAgAkGc6wNqIAJB2NoFaikDADcCACACQaTrA2ogAkHg2gVqKQMANwIAIAJBrOsDaiACQejaBWopAwA3AgAgAkG06wNqIAJB8NoFaikDADcCACACQbzrA2ogAkH42gVqKQMANwIAIAIgDDYCwOoDIAJCADcCyOsDIAJBgICA/AM2AsTrAyACIAIpA8DaBTcChOsDIAJB9OsDakIANwIAIAJB/OsDakIANwIAIAJBhOwDakIANwIAIAJBmOwDakIANwIAIAJBoOwDakIANwIAIAJBqOwDakIANwIAIAJBvOwDakIANwIAIAJBxOwDakIANwIAIAJBzOwDakIANwIAIAJB4OwDakIANwIAIAJB6OwDakIANwIAIAJB8OwDakIANwIAIAJCADcC7OsDIAJBgICA/AM2AujrAyACQgA3ApDsAyACQYCAgPwDNgKM7AMgAkIANwK07AMgAkGAgID8AzYCsOwDIAJCADcC2OwDIAJBgICA/AM2AtTsAyACQYCAgPwDNgL47AMgAkGU7QNqQgA3AgAgAkGM7QNqQgA3AgAgAkGE7QNqQgA3AgAgAkIANwL87AMgAkGAgID8AzYCnO0DIAJBuO0DakIANwIAIAJBsO0DakIANwIAIAJBqO0DakIANwIAIAJCADcCoO0DIAJBgICA/AM2AsDtAyACQdztA2pCADcCACACQdTtA2pCADcCACACQcztA2pCADcCACACQgA3AsTtAyACQYCAgPwDNgLk7QMgAkGA7gNqQgA3AgAgAkH47QNqQgA3AgAgAkHw7QNqQgA3AgAgAkIANwLo7QMgAkGAgID8AzYCiO4DIAJBpO4DakIANwIAIAJBnO4DakIANwIAIAJBlO4DakIANwIAIAJCADcCjO4DIAJBgICA/AM2AqzuAyACQcjuA2pCADcCACACQcDuA2pCADcCACACQbjuA2pCADcCACACQgA3ArDuAyACQYCAgPwDNgLQ7gMgAkHs7gNqQgA3AgAgAkHk7gNqQgA3AgAgAkHc7gNqQgA3AgAgAkIANwLU7gMgAkGAgID8AzYC9O4DIAJBkO8DakIANwIAIAJBiO8DakIANwIAIAJBgO8DakIANwIAIAJCADcC+O4DIAJBgICA/AM2ApjvAyACQbTvA2pCADcCACACQazvA2pCADcCACACQaTvA2pCADcCACACQgA3ApzvAyACQYCAgPwDNgK87wMgAkHY7wNqQgA3AgAgAkHQ7wNqQgA3AgAgAkHI7wNqQgA3AgAgAkIANwLA7wMgAkGAgID8AzYC4O8DIAJB/O8DakIANwIAIAJB9O8DakIANwIAIAJB7O8DakIANwIAIAJCADcC5O8DIAJBgICA/AM2AoTwAyACQaDwA2pCADcCACACQZjwA2pCADcCACACQZDwA2pCADcCACACQgA3AojwAyACQYCAgPwDNgKo8AMgAkHE8ANqQgA3AgAgAkG88ANqQgA3AgAgAkG08ANqQgA3AgAgAkIANwKs8AMgAkGAgID8AzYCzPADIAJB6PADakIANwIAIAJB4PADakIANwIAIAJB2PADakIANwIAIAJCADcC0PADIAJBgICA/AM2AvDwAyACQYzxA2pCADcCACACQYTxA2pCADcCACACQfzwA2pCADcCACACQgA3AvTwAyACQYCAgPwDNgKU8QMgAkGw8QNqQgA3AgAgAkGo8QNqQgA3AgAgAkGg8QNqQgA3AgAgAkIANwKY8QMgAkGAgID8AzYCuPEDIAJB1PEDakIANwIAIAJBzPEDakIANwIAIAJBxPEDakIANwIAIAJCADcCvPEDIAJBgICA/AM2AtzxAyACQfjxA2pCADcCACACQfDxA2pCADcCACACQejxA2pCADcCACACQgA3AuDxAyACQYCAgPwDNgKA8gMgAkGc8gNqQgA3AgAgAkGU8gNqQgA3AgAgAkGM8gNqQgA3AgAgAkIANwKE8gMgAkGAgID8AzYCpPIDIAJBwPIDakIANwIAIAJBuPIDakIANwIAIAJBsPIDakIANwIAIAJCADcCqPIDIAJBgICA/AM2AsjyAyACQeTyA2pCADcCACACQdzyA2pCADcCACACQdTyA2pCADcCACACQgA3AszyAyACQYCAgPwDNgLs8gMgAkGI8wNqQgA3AgAgAkGA8wNqQgA3AgAgAkH48gNqQgA3AgAgAkIANwLw8gMgAkGAgID8AzYCkPMDIAJBrPMDakIANwIAIAJBpPMDakIANwIAIAJBnPMDakIANwIAIAJCADcClPMDIAJBgICA/AM2ArTzAyACQdDzA2pCADcCACACQcjzA2pCADcCACACQcDzA2pCADcCACACQgA3ArjzAyACQYCAgPwDNgLY8wMgAkH08wNqQgA3AgAgAkHs8wNqQgA3AgAgAkHk8wNqQgA3AgAgAkIANwLc8wMgAkGAgID8AzYC/PMDIAJBmPQDakIANwIAIAJBkPQDakIANwIAIAJBiPQDakIANwIAIAJCADcCgPQDIAJBgICA/AM2AqD0AyACQbz0A2pCADcCACACQbT0A2pCADcCACACQaz0A2pCADcCACACQgA3AqT0AyACQYCAgPwDNgLE9AMgAkHg9ANqQgA3AgAgAkHY9ANqQgA3AgAgAkHQ9ANqQgA3AgAgAkIANwLI9AMgAkGAgID8AzYC6PQDIAJBhPUDakIANwIAIAJB/PQDakIANwIAIAJB9PQDakIANwIAIAJCADcC7PQDIAJBgICA/AM2Aoz1AyACQaj1A2pCADcCACACQaD1A2pCADcCACACQZj1A2pCADcCACACQgA3ApD1AyACQYCAgPwDNgKw9QMgAkHM9QNqQgA3AgAgAkHE9QNqQgA3AgAgAkG89QNqQgA3AgAgAkIANwK09QMgAkGAgID8AzYC1PUDIAJB8PUDakIANwIAIAJB6PUDakIANwIAIAJB4PUDakIANwIAIAJCADcC2PUDIAJBgICA/AM2Avj1AyACQZT2A2pCADcCACACQYz2A2pCADcCACACQYT2A2pCADcCACACQgA3Avz1AyACQYCAgPwDNgKc9gMgAkG49gNqQgA3AgAgAkGw9gNqQgA3AgAgAkGo9gNqQgA3AgAgAkIANwKg9gMgAkGAgID8AzYCwPYDIAJB3PYDakIANwIAIAJB1PYDakIANwIAIAJBzPYDakIANwIAIAJCADcCxPYDIAJBgICA/AM2AuT2AyACQYD3A2pCADcCACACQfj2A2pCADcCACACQfD2A2pCADcCACACQgA3Auj2AyACQYCAgPwDNgKI9wMgAkGk9wNqQgA3AgAgAkGc9wNqQgA3AgAgAkGU9wNqQgA3AgAgAkIANwKM9wMgAkGAgID8AzYCrPcDIAJByPcDakIANwIAIAJBwPcDakIANwIAIAJBuPcDakIANwIAIAJCADcCsPcDIAJBgICA/AM2AtD3AyACQez3A2pCADcCACACQeT3A2pCADcCACACQdz3A2pCADcCACACQgA3AtT3AyACQYCAgPwDNgL09wMgAkGQ+ANqQgA3AgAgAkGI+ANqQgA3AgAgAkGA+ANqQgA3AgAgAkIANwL49wMgAkGAgID8AzYCmPgDIAJBtPgDakIANwIAIAJBrPgDakIANwIAIAJBpPgDakIANwIAIAJCADcCnPgDIAJBgICA/AM2Arz4AyACQdj4A2pCADcCACACQdD4A2pCADcCACACQcj4A2pCADcCACACQgA3AsD4AyACQYCAgPwDNgLg+AMgAkH8+ANqQgA3AgAgAkH0+ANqQgA3AgAgAkHs+ANqQgA3AgAgAkIANwLk+AMgAkGAgID8AzYChPkDIAJBoPkDakIANwIAIAJBmPkDakIANwIAIAJBkPkDakIANwIAIAJCADcCiPkDIAJBgICA/AM2Aqj5AyACQcT5A2pCADcCACACQbz5A2pCADcCACACQbT5A2pCADcCACACQgA3Aqz5AyACQYCAgPwDNgLM+QMgAkHo+QNqQgA3AgAgAkHg+QNqQgA3AgAgAkHY+QNqQgA3AgAgAkIANwLQ+QMCQCAEDQAgAkHw+QNqIAJBwNoCakGAIPwKAAALIAJBgICA+AM2AviZBCACQoCAgICQHDcC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XUEAIQ4gAEEANgBZIABB/wE6AFggAEEANgJUIABB/wE6AFMgAEEANgBPIABB/wE6AE4gAEEANgFKIABB/wE6AEkgAEEANgBFIABB/wE6AEQgAEEANgJAIABB/wE6AD8gAEEANgA7IABB/wE6ADogAEEANgE2IABB/wE6ADUgAEEANgAxIABB/wE6ADAgAEEANgIsIABB/wE6ACsgAEEANgAnIABB/wE6ACYgAEEANgEiIABB/wE6ACEgAEEANgAdIABB/wE6ABwgAEEANgIYIABB/wE6ABcgAEEANgATIABB/wE6ABIgAEEANgEOIABBgP4DOwEMIABDAACAP0MAAIC/IAFDCtejO5SVEKWBgIAAkzgC0KQBIAJCADcDwLoFIABBrgFqQQA7AQAgAEEANgGqASAAQQA2ALEBIABBADYBtgEgAEEANgC7ASAAQQA2AsABIABBADYAxQEgAEEANgHKASAAQQA2AM8BIABBADYC1AEgAEEANgDZASAAQQA2Ad4BIABBADYA4wEgAEEANgLoASAAQQA2AO0BIABBADYB8gEgAEEANgD3ASAAQQA2AvwBIABC//+DgIDg//8ANwKAAiAAQoCA/P+PgICAfzcCiAIgAEL/gYCA8P8/NwKQAiAAQoD+/4eAgEA3ApgCIABCgICA+P8fNwKgAiAAQv//g4CA4P//ADcCqAIgAEKAgPz/j4CAgH83ArACIABC/4GAgPD/PzcCuAIgAEKA/v+HgIBANwLAAiAAQYCAgHg2AsgCIABB/wE6AMwCIABB/wE6APsBIABB/wE6APYBIABB/wE6APEBIABB/wE6AOwBIABB/wE6AOcBIABB/wE6AOIBIABB/wE6AN0BIABB/wE6ANgBIABB/wE6ANMBIABB/wE6AM4BIABB/wE6AMkBIABB/wE6AMQBIABB/wE6AL8BIABB/wE6ALoBIABB/wE6ALUBIABB/wE6ALABIABB0QJqQQA7AAAgAEEANgDNAiAAQQA2AtQCIABBADYA2QIgAEEANgHeAiAAQQA2AOMCIABBADYC6AIgAEEANgDtAiAAQQA2AfICIABBADYA9wIgAEEANgL8AiAAQQA2AIEDIABBADYBhgMgAEEANgCLAyAAQQA2ApADIABBADYAlQMgAEEANgGaAyAAQQA2AJ8DIABC//+DgIDg//8ANwCjAyAAQoCA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4P//ADcAqRAgAEKAgPz/j4CAgH83ALEQIABC/4GAgPD/PzcAuRAgAEKA/v+HgIBANwDBECAAQYCAgHg2AMkQIABB/wE6AM0QIABB/wE6APwPIABB/wE6APcPIABB/wE6APIPIABB/wE6AO0PIABB/wE6AOgPIABB/wE6AOMPIABB/wE6AN4PIABB/wE6ANkPIABB/wE6ANQPIABB/wE6AM8PIABB/wE6AMoPIABB/wE6AMUPIABB/wE6AMAPIABB/wE6ALsPIABB/wE6ALYPIABB/wE6ALEPIABB0hBqQQA7AQAgAEEANgHOECAAQQA2ANUQIABBADYB2hAgAEEANgDfECAAQQA2AuQQIABBADYA6RAgAEEANgHuECAAQQA2APMQIABBADYC+BAgAEEANgD9ECAAQQA2AYIRIABBADYAhxEgAEEANgKMESAAQQA2AJERIABBADYBlhEgAEEANgCbESAAQQA2AqARIABC//+DgIDg//8ANwKkESAAQoCA/P+PgICAfzcCrBEgAEL/gYCA8P8/NwK0ESAAQoD+/4eAgEA3ArwRIABCgICA+P8fNwLEESAAQv//g4CA4P//ADcCzBEgAEKAgPz/j4CAgH83AtQRIABC/4GAgPD/PzcC3BEgAEKA/v+HgIBANwLkESAAQYCAgHg2AuwRIABB/wE6APARIABB/wE6AJ8RIABB/wE6AJoRIABB/wE6AJURIABB/wE6AJARIABB/wE6AIsRIABB/wE6AIYRIABB/wE6AIERIABB/wE6APwQIABB/wE6APcQIABB/wE6APIQIABB/wE6AO0QIABB/wE6AOgQIABB/wE6AOMQIABB/wE6AN4QIABB/wE6ANkQIABB/wE6ANQQIABB9RFqQQA7AAAgAEEANgDxESAAQQA2AvgRIABBADYA/REgAEEANgGCEiAAQQA2AIcSIABBADYCjBIgAEEANgCREiAAQQA2AZYSIABBADYAmxIgAEEANgKgEiAAQQA2AKUSIABBADYBqhIgAEEANgCvEiAAQQA2ArQSIABBADYAuRIgAEEANgG+EiAAQQA2AMMSIABC//+DgIDg//8ANwDHEiAAQoCA/P+PgICAfzcAzxIgAEL/gYCA8P8/NwDXEiAAQoD+/4eAgEA3AN8SIABCgICA+P8fNwDnEiAAQv//g4CA4P//ADcA7xIgAEKAgPz/j4CAgH83APcSIABC/4GAgPD/PzcA/xIgAEKA/v+HgIBANwCHEyAAQYCAgHg2AI8TIABB/wE6AJMTIABB/wE6AMISIABB/wE6AL0SIABB/wE6ALgSIABB/wE6ALMSIABB/wE6AK4SIABB/wE6AKkSIABB/wE6AKQSIABB/wE6AJ8SIABB/wE6AJoSIABB/wE6AJUSIABB/wE6AJASIABB/wE6AIsSIABB/wE6AIYSIABB/wE6AIESIABB/wE6APwRIABB/wE6APcRIABBmBNqQQA7AQAgAEEANgKUEyAAQQA2AJsTIABBADYCoBMgAEEANgClEyAAQQA2AaoTIABBADYArxMgAEEANgK0EyAAQQA2ALkTIABBADYBvhMgAEEANgDDEyAAQQA2AsgTIABBADYAzRMgAEEANgHSEyAAQQA2ANcTIABBADYC3BMgAEEANgDhEyAAQQA2AeYTIABC//+DgIDg//8ANwHqEyAAQoCA/P+PgICAfzcB8hMgAEL/gYCA8P8/NwH6EyAAQoD+/4eAgEA3AYIUIABCgICA+P8fNwGKFCAAQv//g4CA4P//ADcBkhQgAEKAgPz/j4CAgH83AZoUIABC/4GAgPD/PzcBohQgAEKA/v+HgIBANwGqFCAAQYCAgHg2AbIUIABB/wE6ALYUIABB/wE6AOUTIABB/wE6AOATIABB/wE6ANsTIABB/wE6ANYTIABB/wE6ANETIABB/wE6AMwTIABB/wE6AMcTIABB/wE6AMITIABB/wE6AL0TIABB/wE6ALgTIABB/wE6ALMTIABB/wE6AK4TIABB/wE6AKkTIABB/wE6AKQTIABB/wE6AJ8TIABB/wE6AJoTIABBuxRqQQA6AAAgAEEANgC3FCAAIAY2AsAUIABBgAI2AgAgACAHNgIEIABBgAI2AggCQEGAEEUNACAAQdikAWogAkGAEPwKAAALAkBBgAhFDQAgAEHYtAFqIAJBgBBqQYAI/AoAAAsgAEHYvAFqIQMCQEHgwABFIgcNACADIAJBgBhqQeDAAPwKAAALIABBADYCuP0BAkBB4D9FDQAgAEG8/QFqIAJB4NgAakHgP/wKAAALIABBwKkHNgKcvgIgAEEANgKYvgIgAEEANgKUvgIgAEEANgKQvgIgAEHAqQc2Aoy+AiAAQQA2Aoi+AiAAQQA2AoS+AiAAQQA2AoC+AiAAQcCpBzYC/L0CIABBADYC+L0CIABBADYC9L0CIABBADYC8L0CIABBwKkHNgLsvQIgAEEANgLovQIgAEEANgLkvQIgAEEANgLgvQIgAEHAqQc2Aty9AiAAQQA2Ati9AiAAQQA2AtS9AiAAQQA2AtC9AiAAQcCpBzYCzL0CIABBADYCyL0CIABBADYCxL0CIABBADYCwL0CIABBwKkHNgK8vQIgAEEANgK4vQIgAEEANgK0vQIgAEEANgKwvQIgAEHAqQc2Aqy9AiAAQQA2Aqi9AiAAQQA2AqS9AiAAQQA2AqC9AiAAIAg2AsQUIABBADYCnL0CAkBBgMABRQ0AIABBoL4CaiACQcCYAWpBgMAB/AoAAAsCQEGAAkUNACAAQaD+A2ogAkHA2AJqQYAC/AoAAAsgAEEANgKggAQCQEGAkAFFDQAgAEHIFGogAkHA2gJqQYCQAfwKAAALIABBADYCpIAEAkBBiA1FDQAgAEGogARqIAJBwOoDakGIDfwKAAALIAAgBTYCyKQBIABBGDYC2I0EIABBADYC1I0EIABBADYC0I0EIAAgAikDwJoFNwKwjQQgAEG4jQRqIAkpAwA3AgAgAEHAjQRqIAwpAwA3AgAgAEHIjQRqIAQpAwA3AgAgACACKQPAugU3ANyNBCAAQeSNBGogEykDADcAACAAQeyNBGogEikDADcAACAAQfSNBGogESkDADcAACAAQfyNBGogECkDADcAACAAQYSOBGogCikDADcAACAAQYyOBGogDSkDADcAACAAQZSOBGogCykDADcAACAAQaSOBGpCADcCACAAQgA3ApyOBCACQb2UtJB8NgKcWSACQYCA9pwENgKYWSACQb2UtJB8NgKUWSACQYCAhJsENgKQWSACQb2UtJB8NgKMWSACQYCAnJgENgKIWSACQb2UtJB8NgKEWSACQYCA0JEENgKAWSACQb2UtJAENgL8WCACQYCA9pwENgL4WCACQb2UtJAENgL0WCACQYCAhJsENgLwWCACQb2UtJAENgLsWCACQYCAnJgENgLoWCACQb2UtJAENgLkWCACQYCA0JEENgLgWAJAIAcNACACQcCYAWpBAEHgwAD8CwALQwAAgD8gASABkiIUQze/BTqUIg+TIA9DAACAP5IiFZUhDyACQcDqA2pBgARqIQtBACEJA0AgAkHg2ABq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D0EsaiAOQQhqKAIANgIAIB5BAkYNASAaIAtBGGoiHSkCADcDACAcIAtBEGoiDikCADcDACAfIAtBCGoiOikCADcDACANIDFBCGooAgA2AgAgASALKQIANwMYIAEgMSkCADcDCCALIRkCQCABKAKgNSABKALQNSIPTQ0AIAsgDCkCADcCACALQShqIAxBKGoiNCkCADcCACALQSBqIAxBIGoiSCkCADcCACAdIAxBGGoiSSkCADcCACAOIAxBEGoiSikCADcCACA6IAxBCGoiSykCADcCACAMIRkgASgC8DQgD00NACAMIAEpAtA0NwIAIDQgAUHQNGpBKGopAgA3AgAgSCABQdA0akEgaikCADcCACBJIAFB0DRqQRhqKQIANwIAIEogAUHQNGpBEGopAgA3AgAgSyABQdA0akEIaikCADcCACABQdA0aiEZCyAZIAEpAxg3AgAgGSAPNgIgIBkgASkDCDcCJCAZQRhqIBopAwA3AgAgGUEQaiAcKQMANwIAIBlBCGogHykDADcCACAZQSxqIA0oAgA2AgAgHkEDRg0BIBogCkEYaiI0KQIANwMAIBwgCkEQaiJIKQIANwMAIB8gCkEIaiJJKQIANwMAIA0gMEEIaigCADYCACABIAopAgA3AxggASAwKQIANwMIIAohGQJAIAEoAtA1IAEoAoA2Ig9NDQAgCiALKQIANwIAIApBKGogC0EoaiJKKQIANwIAIApBIGogC0EgaiJLKQIANwIAIDQgHSkCADcCACBIIA4pAgA3AgAgSSA6KQIANwIAIAshGSABKAKgNSAPTQ0AIAsgDCkCADcCACBKIAxBKGoiTCkCADcCACBLIAxBIGoiSikCADcCACAdIAxBGGoiSykCADcCACAOIAxBEGoiTSkCADcCACA6IAxBCGoiTikCADcCACAMIRkgASgC8DQgD00NACAMIAEpAtA0NwIAIEwgAUHQNGpBKGopAgA3AgAgSiABQdA0akEgaikCADcCACBLIAFB0DRqQRhqKQIANwIAIE0gAUHQNGpBEGopAgA3AgAgTiABQdA0akEIaikCADcCACABQdA0aiEZCyAZIAEpAxg3AgAgGSAPNgIgIBkgASkDCDcCJCAZQRhqIBopAwA3AgAgGUEQaiAcKQMANwIAIBlBCGogHykDADcCACAZQSxqIA0oAgA2AgAgHkEE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WSAcs0MAAAA8lJSSlCIUICeSOAIAIAAgACgCzBRBAWpB//8AcTYCzBQgACgC0BQiGUH//wBLDQEgACgCyBQgGUECdGogFCAokjgCgIAEIAAgACgC0BRBAWpB//8AcTYC0BQgACgC1BQiGUH//wBLDQEgACgCyBQgGUECdGogFCA7kjgCgIAIIAAgACgC1BRBAWpB//8AcTYC1BQgACgC2BQiGUH//wBLDQEgACgCyBQgGUECdGogFCBHkjgCgIAMIAAgACgC2BRBAWpB//8AcTYC2BQgACgC3BQiGUH//wBLDQEgACgCyBQgGUECdGogFCA4kjgCgIAQIAAgACgC3BRBAWpB//8AcTYC3BQgACgC4BQiGUH//wBLDQEgACgCyBQgGUECdGogFCA5kjgCgIAUIAAgACgC4BRBAWpB//8AcTYC4BQgACgC5BQiGUH//wBLDQEgACgCyBQgGUECdGogFCA+kjgCgIAYIAAgACgC5BRBAWpB//8AcTYC5BQgACgC6BQiGUH//wBLDQEgACgCyBQgGUECdGogFCBEkjgCgIAcIAAgACgC6BRBAWpB//8AcTYC6BQgACgC7BQiGUH//wBLDQEgACgCyBQgGUECdGogFCA9kjgCgIAgIAAgACgC7BRBAWpB//8AcTYC7BQgACgC8BQiGUH//wBLDQEgACgCyBQgGUECdGogFCBDkjgCgIAkIAAgACgC8BRBAWpB//8AcTYC8BQgACgC9BQiGUH//wBLDQEgACgCyBQgGUECdGogFCBFkjgCgIAoIAAgACgC9BRBAWpB//8AcTYC9BQgACgC+BQiGUH//wBLDQEgACgCyBQgGUECdGogFCBckjgCgIAsIAAgACgC+BRBAWpB//8AcTYC+BQgACgC/BQiGUH//wBLDQEgACgCyBQgGUECdGogFCBekjgCgIAwIAAgACgC/BRBAWpB//8AcTYC/BQgACgCgBUiGUH//wBLDQEgACgCyBQgGUECdGogFCBfkjgCgIA0IAAgACgCgBVBAWpB//8AcTYCgBUgACgChBUiGUH//wBLDQEgACgCyBQgGUECdGogFCBmkjgCgIA4IAAgACgChBVBAWpB//8AcTYChBUgACgCiBUiGUH//wBLDQEgJIsiJCA8ICQgPF4bITwgACgCyBQgGUECdGogFCBlkjgCgIA8IAAgACgCiBVBAWpB//8AcTYCiBUgHEEBaiIcQYABRw0ACyAAIDw4AtSNBEMAAAAAIRRBACEZA0AgACAZaiIdQdi0AWohDyAPIA8qAgAiJBCYgYCAADgCACAdQdy0AWohDyAPIA8qAgAiJxCYgYCAADgCACAniyInICSLIiQgFCAkIBReGyIUICcgFF4bIRQgGUEIaiIZQYAIRw0ACyAAIBQ4AtCNBCAAKALEFCIZKwMQIRUgGSoCoGAhFCAZKQMIIRAgGSkDACERIAAgGS0ArGA2AqC9AiAAIBUgESAQfbogFLuiIAAqAsykAbtEAAAAAAAATkCiIhajoL0iED4CpL0CIAAgEEIgiD4CqL0CIAAgGSoCoGBDAAB6RJT8ATYCrL0CIBkrA8BgIRUgGSoC0MABIRQgGSkDuGAhECAZKQOwYCERIAAgGS0A3MABNgKwvQIgACAVIBEgEH26IBS7oiAWo6C9IhA+ArS9AiAAIBBCIIg+Ari9AiAAIBkqAtDAAUMAAHpElPwBNgK8vQIgGSsD8MABIRUgGSoCgKECIRQgGSkD6MABIRAgGSkD4MABIREgACAZLQCMoQI2AsC9AiAAIBUgESAQfbogFLuiIBajoL0iED4CxL0CIAAgEEIgiD4CyL0CIAAgGSoCgKECQwAAekSU/AE2Asy9AiAZKwOgoQIhFSAZKgKwgQMhFCAZKQOYoQIhECAZKQOQoQIhESAAIBktALyBAzYC0L0CIAAgFSARIBB9uiAUu6IgFqOgvSIQPgLUvQIgACAQQiCIPgLYvQIgACAZKgKwgQNDAAB6RJT8ATYC3L0CIBkrA9CBAyEVIBkqAuDhAyEUIBkpA8iBAyEQIBkpA8CBAyERIAAgGS0A7OEDNgLgvQIgACAVIBEgEH26IBS7oiAWo6C9IhA+AuS9AiAAIBBCIIg+Aui9AiAAIBkqAuDhA0MAAHpElPwBNgLsvQIgGSsDgOIDIRUgGSoCkMIEIRQgGSkD+OEDIRAgGSkD8OEDIREgACAZLQCcwgQ2AvC9AiAAIBUgESAQfbogFLuiIBajoL0iED4C9L0CIAAgEEIgiD4C+L0CIAAgGSoCkMIEQwAAekSU/AE2Avy9AiAZKwOwwgQhFSAZKgLAogUhFCAZKQOowgQhECAZKQOgwgQhESAAIBktAMyiBTYCgL4CIAAgFSARIBB9uiAUu6IgFqOgvSIQPgKEvgIgACAQQiCIPgKIvgIgACAZKgLAogVDAAB6RJT8ATYCjL4CIBkrA+CiBSEVIBkqAvCCBiEUIBkpA9iiBSEQIBkpA9CiBSERIAAgGS0A/IIGNgKQvgIgACAVIBEgEH26IBS7oiAWo6C9IhA+ApS+AiAAIBBCIIg+Api+AiAAIBkqAvCCBkMAAHpElPwBNgKcvgIgAUHQPGokgICAgAAgIQ8LIBlBgIABQbCLwIAAEPeAgIAAAAsgGUGACEHg+MCAABD3gICAAAAL3SQKE38CfQJ/An0BfwR9AX8BfQV/AX0jgICAgABBoAprIgwkgICAgAACQEGAAkUNACAMQSBqIAJBgAL8CgAACwJAAkAgAC0AoAEiDUUNACALIApqIQ4gAEHQAGohDyAEIApBAnQiEGohESAALQCiASISQQVsIRMgCkGAASAKQYABSxsiFCAKayEVIAxBoAZqIBBqIRYgDEGgAmogEGohFyAMQaAGaiAQaiEYQQAhGQNAIBlBEEYNAgJAAkACQAJAAkACQAJAAkACQAJAAkACQCASRQ0AQQAhGgNAAkACQAJAAkAgGkHQAEYNACAZIAAgGmoiG0ECai0AAEcNAyAbQQFqLQAAIhxBB0sNBiAbQQRqLQAAIh1BwABPDQcgG0EDai0AACIeQcAATw0IIAQgHEEJdGoqAvwDIAIgHUECdGoqAgCUIR8gDEEgaiAeQQJ0aiIcKgIAISAgGy0AAEUNASAgIB9DIJhsPZQQpYGAgACUIR8MAgtBEEEQQZD3wIAAEPeAgIAAAAsgHyAgkiEfCyAcIB84AgALIBMgGkEFaiIaRw0ACwsgDyAZQQVsaiIbLQAEIRogGy0AAA4ICgkIBwYFBAMKCyAcQQhBwPfAgAAQ94CAgAAACyAdQcAAQdD3wIAAEPeAgIAAAAsgHkHAAEHg98CAABD3gICAAAALAkACQAJAAkACQAJAAkACQAJAIBpBwABLDQACQCAbLQADIhtBCE8NACAaQcAARg0CIBpBP0YNAyAaQT5PDQQCQAJAAkAgGkE9Rg0AIAEgGUEcbGohHiAMQSBqIBpBAnQiHGoiGioCAPwBIh0gCUkNAUEAISFBBCEiDAILQQNBA0Hw8MCAABD3gICAAAALIAggHUEMbGoiHSgCCCEhIB0oAgQhIgsgHi0AAEEERw0QIAogDk8NECAaKgIEISMgGioCDCEkIAMgHGoiJSoCDCEfICUqAgQhIAJAAkAgIQ0AIBEgG0EJdGohGyAVIRogCyEcA0AgHyAGICQgH5OUkiEfICAgBiAjICCTlJIhICAaRQ0CIBtBADYCACAaQX9qIRogG0EEaiEbIBxBf2oiHA0ADAkLCyAhsyEmIB4qAgQhJyAaKgII/AFFDQYgESAbQQl0aiEbIAshHSAVIRoDQCAGICQgH5OUISggBiAjICCTlCEpAkAgJyAmYEUNACAnICcgJpWOICaUkyEnCyAfICiSIR8gICApkiEgQwAAAAAhKAJAICdDAAAAAF0NAAJAICf8ASIcQQFqIiogIUkNACAcICFPDQEgIiAcQQJ0aioCACEoDAELIBwgIU8NCyAiIBxBAnRqKgIAIiggJyAcs5MgIiAqQQJ0aioCACAok5SSISgLIBpFDQsgHiAgICeSIic4AgQgGyAfICiUOAIAIBpBf2ohGiAbQQRqIRsgHUF/aiIdDQAMCAsLICUgIDgCBCAlIB84AgwgFEGAAUGA8cCAABD3gICAAAALIBtBCEHw9sCAABD3gICAAAALIBpBwABBwABBgPfAgAAQ+4CAgAAAC0EAQQBBwPDAgAAQ94CAgAAAC0EBQQFB0PDAgAAQ94CAgAAAC0ECQQJB4PDAgAAQ94CAgAAACyARIBtBCXRqIRsgCyEdIAohGgNAIB8gBiAkIB+TlJIhHyAgIAYgIyAgk5SSISACQAJAICcgJmBFDQAgGkH/AEsNBCAbQQA2AgAMAQtDAAAAACEoAkAgJ0MAAAAAXQ0AAkAgJ/wBIhxBAWoiKiAhSQ0AIBwgIU8NASAiIBxBAnRqKgIAISgMAQsgHCAhTw0FICIgHEECdGoqAgAiKCAnIByzkyAiICpBAnRqKgIAICiTlJIhKAsCQCAaQf8ATQ0AIBohFAwGCyAeICcgIJIiJzgCBCAbIB8gKJQ4AgALIBpBAWohGiAbQQRqIRsgHUF/aiIdDQALCyAlICA4AgQgJSAfOAIMDAkLICUgIDgCBCAlIB84AgwgGkGAAUGQ8cCAABD3gICAAAALICUgIDgCBCAlIB84AgwgHCAhQfD4wIAAEPeAgIAAAAsgJSAgOAIEICUgHzgCDCAUQYABQaDxwIAAEPeAgIAAAAsCQAJAIBpBwABLDQACQCAbLQADIhtBCE8NACAaQcAARg0CIAogDk8NCCAMQSBqIBpBAnRqKgIAIR8gESAbQQl0aiEbIBUhGiALIRwCQANAIBpFDQEgGyAfOAIAIBpBf2ohGiAbQQRqIRsgHEF/aiIcRQ0KDAALCyAUQYABQcDxwIAAEPeAgIAAAAsgG0EIQdD2wIAAEPeAgIAAAAsgGkHAAEHAAEHg9sCAABD7gICAAAALQQBBAEGw8cCAABD3gICAAAALAkAgGy0AASIeQQhJDQAgHkEIQZD2wIAAEPeAgIAAAAsgGy0AAyEcIBstAAIhGwJAQYAERSIdDQAgDEGgAmogBCAeQQl0akGABPwKAAALAkACQAJAIBtBCE8NAAJAIB0NACAMQaAGaiAEIBtBCXRqQYAE/AoAAAsgGkHAAEsNASAcQQhJDQIgHEEIQbD2wIAAEPeAgIAAAAsgG0EIQaD2wIAAEPeAgIAAAAsgGkHAAEHAAEHA9sCAABD7gICAAAALAkAgGkHAAEYNACAKIA5PDQVDAACAP0MAAAAAIAxBIGogGkECdCIaaioCACIfIB9DAAAAAF0bIh8gH0MAAIA/XhshJyARIBxBCXRqIRsgAyAaaiIhKgIAIR8gFSEaIAshHiAXIRwgGCEdAkADQCAfIAYgJyAfk5SSIR8gGkUNASAbQwAAgD9DAACAP0MAAAAAIB8gH0MAAAAAXRsiICAgQwAAgD9eGyIgkyAcKgIAlCAgIB0qAgCUkjgCACAaQX9qIRogHEEEaiEcIB1BBGohHSAbQQRqIRsgHkF/aiIeDQALICEgHzgCAAwGCyAhIB84AgAgFEGAAUGw98CAABD3gICAAAALQQBBAEGg98CAABD3gICAAAALAkACQAJAIBstAAEiHCAbLQADIhtGDQAgDEEYaiAEIBwgGxCSgICAAAJAIBpBwABLDQAgGkHAAEYNAiAKIA5PDQcgDEEgaiAaQQJ0IhpqKgIAISAgDCgCGCAQaiEbIAwoAhwgEGohHCADIBpqIh4qAgAhHyAVIRogCyEdAkADQCAfIAYgICAfk5SSIR8gGkUNASAcIB8gGyoCAJQ4AgAgGkF/aiEaIBtBBGohGyAcQQRqIRwgHUF/aiIdDQALIB4gHzgCAAwICyAeIB84AgAgFEGAAUHQ+MCAABD3gICAAAALIBpBwABBwABB4PXAgAAQ+4CAgAAACyAcQQhJDQEgHEEIQfD1wIAAEPeAgIAAAAtBAEEAQcD4wIAAEPeAgIAAAAsCQEGABEUNACAMQaAGaiAEIBxBCXRqQYAE/AoAAAsCQAJAAkAgGkHAAEsNACAaQcAARg0BIAogDk8NBiAMQSBqIBpBAnQiGmoqAgAhICARIBtBCXRqIRsgAyAaaiIeKgIAIR8gFSEaIAshHSAWIRwDQCAfIAYgICAfk5SSIR8gGkUNAyAbIB8gHCoCAJQ4AgAgGkF/aiEaIBxBBGohHCAbQQRqIRsgHUF/aiIdDQALIB4gHzgCAAwGCyAaQcAAQcAAQYD2wIAAEPuAgIAAAAtBAEEAQcD4wIAAEPeAgIAAAAsgHiAfOAIAIBRBgAFB0PjAgAAQ94CAgAAACyAbLQADIRwCQAJAIBstAAEiG0H/AUYNAAJAIBsgHEYNACAMQRBqIAQgGyAcEJKAgIAAAkAgGkHAAEsNACABIBlBHGxqIAxBIGogGkECdGpBwAAgGmsgDCgCECAMKAIUIAUgCiALEJCAgIAADAYLIBpBwABBwABBkPXAgAAQ+4CAgAAACyAcQQhJDQEgG0EIQaD1wIAAEPeAgIAAAAsCQCAaQcAASw0AAkAgHEEITw0AIAEgGUEcbGogDEEgaiAaQQJ0akHAACAaa0EAIAQgHEEJdGogBSAKIAsQkICAgAAMBQsgHEEIQcD1wIAAEPeAgIAAAAsgGkHAAEHAAEHQ9cCAABD7gICAAAALAkBBgARFDQAgDEGgBmogBCAbQQl0akGABPwKAAALAkAgGkHAAEsNACABIBlBHGxqIAxBIGogGkECdGpBwAAgGmsgDEGgBmogBCAcQQl0aiAFIAogCxCQgICAAAwDCyAaQcAAQcAAQbD1wIAAEPuAgIAAAAsCQCAbLQABIhwgGy0AAyIbRg0AIAxBCGogBCAcIBsQkoCAgAACQCAaQcAASw0AIAEgGUEcbGogDEEgaiAaQQJ0IhtqQcAAIBprIhogAyAbaiAaIAwoAgggDCgCDCAFIAYgCiALEI+AgIAADAMLIBpBwABBwABB4PTAgAAQ+4CAgAAACwJAIBxBCEkNACAcQQhB8PTAgAAQ94CAgAAACwJAQYAERQ0AIAxBoAZqIAQgHEEJdGpBgAT8CgAACwJAIBpBwABLDQAgASAZQRxsaiAMQSBqIBpBAnQiHGpBwAAgGmsiGiADIBxqIBogDEGgBmogBCAbQQl0aiAFIAYgCiALEI+AgIAADAILIBpBwABBwABBgPXAgAAQ+4CAgAAACwJAAkACQAJAAkAgGkHAAEsNAAJAIBstAAMiG0EITw0AIBpBwABGDQIgGkE/Rg0DIBpBPk8NBCAaQT1GDQUgASAZQRxsaiIdLQAAQQFHDQYgCiAOTw0GIAxBIGogGkECdCIcaiIaKgIAISQgGioCBPwBIh5BACAeQX9qQQRJGyEeIBoqAgwhKEMAAIA/QwAAAAAgGioCCCIfIB9DAAAAAF0bIh8gH0MAAIA/XhtDAAB8QpQiHyAf/AEiGrOTISsgGkEBaiIhQT8gIUE/SRsiIUELdCEsIAcgIUENdGohLSAaQQt0ISIgESAbQQl0aiEbIAMgHGoiLioCDCEgIC4qAgAhJiAdKgIEIR8gCyEcIBUhGgJAAkACQAJAA0AgICAGICggIJOUkiEgICYgBiAkICaTlJIiJiAFlSEnAkACQAJAAkACQAJAIB4OBQQDAgEABAsgH0MA4P9ElCIj/AEiISAiaiIqQf//B0sNBiAhQQFqQf8PcSIvICJyISUgIkH//wdLDQcgISAsaiIwQf//B0sNCCAHICpBAnRqKgIAIikgIyAhs5MiIyAHICVBAnRqKgIAICmTlJIiKSArIAcgMEECdGoqAgAiMSAjIC0gL0ECdGoqAgAgMZOUkiApk5SSISMMBAsgH0MAAAC/kotDAACAQJRDAACAv5IhIwwDC0MAAIA/QwAAgL8gH0MAAAA/XRshKQJAAkAgHyAnXQ0AQwAAAAAhIyAfQwAAgD8gJ5NeRQ0BIB9DAACAv5IgJ5UiIyAjlCAjICOSkkMAAIA/kiEjDAELIB8gJ5UiIyAjkiAjICOUk0MAAIC/kiEjCyApICOSISkCQAJAIB9DAAAAP5IiIyAjj5MgI5giIyAnXQ0AQwAAAAAhMSAjQwAAgD8gJ5NeRQ0BICkgI0MAAIC/kiAnlSIjICOUICMgI5KSQwAAgD+SkyEjDAQLICMgJ5UiIyAjkiAjICOUk0MAAIC/kiExCyApIDGTISMMAgsgHyAfkkMAAIC/kiEjAkACQCAfICddDQBDAAAAACEpIB9DAACAPyAnk15FDQEgIyAfQwAAgL+SICeVIikgKZQgKSApkpJDAACAP5KTISMMAwsgHyAnlSIpICmSICkgKZSTQwAAgL+SISkLICMgKZMhIwwBCyAfQ9sPyUCUEJSBgIAAISMLIBpFDQQgGyAgICOUOAIAIB0gHyAnkiIfQwAAgL+SIB8gH0MAAIA/YBsiHzgCBCAaQX9qIRogG0EEaiEbIBxBf2oiHA0ACyAuICY4AgAgLiAgOAIMDAoLIC4gJjgCACAuICA4AgwgKkGAgAhBoInAgAAQ94CAgAAACyAuICY4AgAgLiAgOAIMICVBgIAIQbCJwIAAEPeAgIAAAAsgLiAmOAIAIC4gIDgCDCAwQYCACEHAicCAABD3gICAAAALIC4gJjgCACAuICA4AgwgFEGAAUGg88CAABD3gICAAAALIBtBCEHA9MCAABD3gICAAAALIBpBwABBwABB0PTAgAAQ+4CAgAAAC0EAQQBB4PLAgAAQ94CAgAAAC0EBQQFB8PLAgAAQ94CAgAAAC0ECQQJBgPPAgAAQ94CAgAAAC0EDQQNBkPPAgAAQ94CAgAAACyAZQQFqIhkgDUcNAAsLIAxBoApqJICAgIAADwtBEEEQQbD0wIAAEPeAgIAAAAuPBAIGfwd9I4CAgIAAQYAIayIEJICAgIAAIARBBGohBUH8AyEGQQAhBwJAQfwDRSIIDQAgBUEAQfwD/AsACyAEQYAEakEEaiEJAkAgCA0AIAlBAEH8A/wLAAsgBCABKgIAIgogASoCgAQiC5JDAAAAP5QgACoCgAUiDCACKgIAIg0gAioCgAQiDpNDAAAAP5QiD5QgACoChAkiECAKIAuTQwAAAD+UIgqUk5M4AgAgBCAOIA2SQwAAAD+UIA8gEJQgDCAKlJKSOAKABANAIAUgB2ogASAHakEEaioCACIKIAEgBmoqAgAiC5JDAAAAP5QgACAHaiIIQYQFaioCACIMIAIgB2pBBGoqAgAiDSACIAZqKgIAIg6SQwAAAD+UIg+UIAhBiAlqKgIAIhAgCiALk0MAAAA/lCIKlJOTOAIAIAkgB2ogDSAOk0MAAAA/lCAPIBCUIAwgCpSSkjgCACAGQXxqIQYgB0EEaiIHQfwDRw0ACyAAIAQgBEGABGpBARCOgICAAEGAfCEHA0AgAyAEIAdqIgZBgARqKgIAQwAAADyUOAIAIANBBGogBEGABGogB2oiAUGABGoqAgBDAAAAPJQ4AgAgA0EIaiAGQYQEaioCAEMAAAA8lDgCACADQQxqIAFBhARqKgIAQwAAADyUOAIAIANBEGohAyAHQQhqIgcNAAsgBEGACGokgICAgAALgQcCEn8HfSAAQYAEaiEEIAEhBSACIQZBACEHA0ACQCAHIAQgB2otAAAiCE8NAAJAIAjAQQBIDQAgBSgCACEJIAUgASAIQQJ0IghqIgooAgA2AgAgBigCACELIAYgAiAIaiIIKAIANgIAIAogCTYCACAIIAs2AgAMAQsgCEGAAUHA78CAABD3gICAAAALIAVBBGohBSAGQQRqIQYgB0EBaiIHQYABRw0ACwJAAkACQAJAIAMNAEEAIQxBAiENA0ACQCANQX9qQQd2QQFxQYABIA1odiIOaiIPRQ0AIA5BAnQhECANQQJ0IREgAiANQQF2IhJBAnQiE2ohCyABIBNqIQMgAiEUIAEhFQNAIA9Bf2ohD0EAIQcgACEIIBIhBUEAIQYDQCAHQT9LDQYgBUGAAU8NByADIAZqIgQgFSAGaiIJKgIAIhYgCCoCACIXIAQqAgAiGJQgCEGAAmoqAgAiGSALIAZqIgQqAgAiGpSTIhuTOAIAIAQgFCAGaiIKKgIAIhwgFyAalCAZIBiUkiIXkzgCACAJIBYgG5I4AgAgCiAXIBySOAIAIAggEGohCCAHIA5qIQcgBUEBaiEFIBMgBkEEaiIGRw0ACyALIBFqIQsgAyARaiEDIBIgDWohEiAUIBFqIRQgFSARaiEVIA8NAAsLIA1BAXQhDSAMQQFqIgxBB0cNAAwCCwtBACEMQQIhDQNAAkAgDUF/akEHdkEBcUGAASANaHYiDmoiD0UNACAOQQJ0IRAgDUECdCERIAIgDUEBdiISQQJ0IhNqIQsgASATaiEDIAEhFCACIRUDQCAPQX9qIQ9BACEHIAAhCCASIQVBACEGA0AgB0E/Sw0FIAVB/wBLDQYgAyAGaiIEIBQgBmoiCSoCACIWIAgqAgAiFyAEKgIAIhiUIAhBgAJqKgIAIhkgCyAGaiIEKgIAIhqUkiIbkzgCACAEIBUgBmoiCioCACIcIBcgGpQgGSAYlJMiF5M4AgAgCSAWIBuSOAIAIAogFyAckjgCACAIIBBqIQggByAOaiEHIAVBAWohBSATIAZBBGoiBkcNAAsgCyARaiELIAMgEWohAyASIA1qIRIgFCARaiEUIBUgEWohFSAPDQALCyANQQF0IQ0gDEEBaiIMQQdHDQALCw8LIAdBwABBoO/AgAAQ94CAgAAACyAFQYABQbDvwIAAEPeAgIAAAAvWCQUBfwJ9AX8PfQF+I4CAgIAAQSBrIgskgICAgAACQAJAIAJFDQAgASoCAEMAAKBBEKSBgIAAIQwCQAJAAkAgAkEDTQ0AIAEqAgwhDQJAAkAgAC0AAEECRw0AIAEqAgj8ASICQQAgAkF/akEDSRshDiAAKgIYIQ8gACoCFCEQIAAqAhAhESAAKgIMIRIgACoCCCETIAAqAgQhFCABKgIEQ83MzD0QpIGAgAAhFQwBCyABKgII/AEiAkEAIAJBf2pBA0kbIQ4gASoCBEPNzMw9EKSBgIAAIRVDAAAAACESQwAAAAAhEUMAAAAAIRBDAAAAACEPQwAAAAAhE0MAAAAAIRQLAkACQAJAAkAgCSAKIAlqTw0AIARFDQYgAyoCACEWIARBBEkNBUMAAIA/QwAAAAAgDSANQwAAAABdGyINIA1DAACAP14bIRcgAyoCDCENIAdDSOH6PpQiGEMAAKBBYEUNCEMAAIA/IBWVIQ8gBSAJQQJ0IgJqIQEgBiACaiECA0AgGEMAAKBBIBYgCCAMIBaTlJIiFkMAAKBBEKSBgIAAIhUgFUMAAKBBXRsiFSAVIBheG0PbD0lAlCAHlRCmgYCAACIVIBVDAACAPyAVIA8gFZKUQwAAgD+SlSISlCIRlCEQAkACQEMAAIA/QwAAAAAgDSAIIBcgDZOUkiINIA1DAAAAAF0bIhUgFUMAAIA/XhsiFUMAAIA/YEUNACAJQf8ASw0EIBMgFCARlJIgECABKgIAIhkgE5MiFZSSIhogGpIgE5MhEyAUIBKUIBEgFZSSIhUgFZIgFJMhFAJAAkACQCAODgQCAQQAAgsgGSAPIBWUkyEVDAMLIBkgDyAVlJMgGpMhFQwCCyAaIRUMAQsCQCAVQwAAAABfRQ0AIAlB/wBLDQUgASoCACEVDAELIAlB/wBLDQUgEyAUIBGUkiAQIAEqAgAiGSATkyIalJIiGyAbkiEcIBQgEpQgESAalJIiGiAakiEdAkACQAJAAkAgDg4EAgEDAAILIBkgDyAalJMhGgwCCyAZIA8gGpSTIBuTIRoMAQsgGyEaCyAcIBOTIRMgHSAUkyEUIBkgFSAaIBmTlJIhFQsgAiAVOAIAIAlBAWohCSABQQRqIQEgAkEEaiECIApBf2oiCg0ACyADIBY4AgAgAyANOAIMCyAAIA84AhggACAQOAIUIAAgETgCECAAIBI4AgwgACATOAIIIAAgFDgCBCAAQQI6AAAgC0EgaiSAgICAAA8LIAMgFjgCACADIA04AgwgCUGAAUGw8MCAABD3gICAAAALIAMgFjgCACADIA04AgwgCUGAAUGg8MCAABD3gICAAAALIAMgFjgCACADIA04AgwgCUGAAUGQ8MCAABD3gICAAAALQQMgAkHg78CAABD3gICAAAALIAMgFiAIIAwgFpOUkjgCAEEDIARBgPDAgAAQ94CAgAAAC0EAQQBB8O/AgAAQ94CAgAAAC0EAQQBB0O/AgAAQ94CAgAAACyADIBYgCCAMIBaTlJI4AgAgAyANIAggFyANk5SSOAIMIAtBgICAjQQ2AgggCyAYOAIMIAtBgYCAgACtQiCGIh4gC0EMaq2ENwMYIAsgHiALQQhqrYQ3AxBBz4HAgAAgC0EQakGA+cCAABD2gICAAAAL/gYCAn8JfSOAgICAAEEwayIIJICAgIAAAkACQCAALQAAQQNGDQBBACEJQwAAAAAhCkMAAAAAIQtDAAAAACEMQwAAAAAhDQwBCyAAKgIQIQ0gACoCDCEKIAAqAgghCyAAKgIEIQwgAC0AASEJCwJAAkACQAJAAkACQAJAAkAgAkUNACABKgIAQ28SgzoQpIGAgAAhDiACQQFGDQEgASoCBENvEoM6EKSBgIAAIQ8gAkECTQ0CIAJBA0YNAyABKgIIIRAgASoCDENvEoM6EKSBgIAAIREgAkEETQ0EIAJBBUYNBSACQQZNDQYgASoCECESIAggCToALCAIQwAAgD9DAACAvyASIBJDAACAv10bIhIgEkMAAIA/Xhs4AiAgCCAROAIcIAhDAACAP0MAAAAAIBAgEEMAAAAAXRsiECAQQwAAgD9eGzgCGCAIIA84AhQgCCAOOAIQIAggDTgCDCAIIAo4AgggCCALOAIEIAggDDgCACAIQwAAgD9DAACAvyABKgIYIhAgEEMAAIC/XRsiECAQQwAAgD9eGzgCKCAIQwAAgD9DAACAvyABKgIUIhAgEEMAAIC/XRsiECAQQwAAgD9eGzgCJCAHIAZqIQJDAACAPyAFlSESAkACQCADRQ0AIAYgAk8NCSADIAZBAnQiAmohASAEIAJqIQMgBkGAASAGQYABSxsiCSAGayECA0AgCCASEJGAgIAAIRAgAkUNAiADIBAgASoCAJQ4AgAgAUEEaiEBIANBBGohAyACQX9qIQIgB0F/aiIHDQAMCgsLIAYgAk8NCCAEIAZBAnRqIQEgBkGAASAGQYABSxsiAyAGayECAkADQCAIIBIQkYCAgAAhECACRQ0BIAEgEDgCACABQQRqIQEgAkF/aiECIAdBf2oiB0UNCgwACwsgA0GAAUHA8sCAABD3gICAAAALIAlBgAFB0PLAgAAQ94CAgAAAC0EAQQBB0PHAgAAQ94CAgAAAC0EBQQFB4PHAgAAQ94CAgAAAC0ECQQJB8PHAgAAQ94CAgAAAC0EDQQNBgPLAgAAQ94CAgAAAC0EEQQRBkPLAgAAQ94CAgAAAC0EFQQVBoPLAgAAQ94CAgAAAC0EGQQZBsPLAgAAQ94CAgAAACyAAIAgpAgg3AgwgACAIKQIANwIEIAAgCC0ALDoAASAAQQM6AAAgCEEwaiSAgICAAAuWBQEEfQJAAkACQAJAAkACQAJAIAAtACwOBQECAwAEAQsgACAAKgIYIgE4AgAgAQ8LIABBADYCAAwDCyAAIAEgACoCBJIiATgCBEMAAIA/IQICQCAAKgIQIgNDAAAAAF5FDQAgASADlUMAAIA/EJaBgIAAIQILQwAAgD8gACoCCCIDkyEEIAIhAQJAIAAqAiBDAADAQJQiBYtDCtcjPF0NACAFEKWBgIAAIQEgAiAFlBClgYCAAEMAAIC/kiABQwAAgL+SlSEBCyAAIAMgBCABlJIiATgCACACQwAAgD9gRQ0DIABBAjoALCAAQoCAgPwDNwIAQwAAgD8PCyAAIAEgACoCBJIiATgCBEMAAIA/IQICQCAAKgIUIgNDAAAAAF5FDQAgASADlUMAAIA/EJaBgIAAIQILIAAqAhgiA0MAAIC/kiEEIAIhAQJAIAAqAiRDAADAQJQiBYtDCtcjPF0NACAFEKWBgIAAIQEgAiAFlBClgYCAAEMAAIC/kiABQwAAgL+SlSEBCyAAIAQgAZRDAACAP5IiATgCACACQwAAgD9gRQ0CIAAgAzgCAAJAIANDF7fROF8NACAAQQM6ACwgAw8LIABBBDoALCAAIAM4AgwgAEEANgIEIAMPCyAAIAEgACoCBJIiATgCBEMAAIA/IQICQCAAKgIcIgNDAAAAAF5FDQAgASADlUMAAIA/EJaBgIAAIQILIAAqAgwhAyACIQECQCAAKgIoQwAAwECUIgSLQwrXIzxdDQAgBBClgYCAACEBIAIgBJQQpYGAgABDAACAv5IgAUMAAIC/kpUhAQsgACADQwAAgD8gAZOUIgE4AgAgAkMAAIA/YEUNASAAQQA6ACwgAEEANgIAC0MAAAAAIQELIAELsgEAAkACQAJAAkACQCACIANJDQAgAkEJTw0DIAJBCEYNASADIAJJDQQgAyACQZD4wIAAEPeAgIAAAAsgA0EJSQ0BQZD5wIAAQRNBoPjAgAAQ9oCAgAAAC0EAQQBBgPjAgAAQ94CAgAAACyADQQhHDQFBAEEAQbD4wIAAEPeAgIAAAAtBkPnAgABBE0Hw98CAABD2gICAAAALIAAgASADQQl0ajYCBCAAIAEgAkEJdGo2AgALSAEBfwJAAkAgAEH/AUsNACAAQQAoAtiXwYAAIgFPDQFBACgC1JfBgAAgAEEMbGpBADYCCAsPCyAAIAFBnPnAgAAQ94CAgAAACwsAQQAoAuylxYAACwsAQQAoAvilxYAACwsAQQAoAvClxYAACwsAQQAoAvSlxYAACwsAQQAqAqSlxYAAC04BAX8jgICAgABBsI4EayIBJICAgIAAIAFBBGogABCJgICAAAJAQayOBEUNAEHQl8GAACABQQRqQayOBPwKAAALIAFBsI4EaiSAgICAAAsLAEEAKAKYvMKAAAscAQF/QQAoAvCXxYAAIQBBAEEANgLwl8WAACAACwsAQQAqAqClxYAACw4AQdCXwYAAEIuAgIAACw4AQdCXwYAAEICAgIAACxIAQdCXwYAAIAAgARCBgICAAAvFAQACQCAAQT9LDQAgAbxB/////wdxQf////sHSg0AIAK8Qf////8HcUH////7B0oNACADvEH/////B3FB////+wdKDQBBACgCjKzBgAAgAEGUKGxqQwAAgD9DAAAAACABIAFDAAAAAF0bIgEgAUMAAIA/XhtDAACAP0MAAAAAIAIgAkMAAAAAXRsiASABQwAAgD9eGxCkgYCAAEMAAIA/QwAAAAAgAyADQwAAAABdGyIBIAFDAACAP14bEKSBgIAAOALMJwsLyAEBAX0CQCAAQT9LDQBBACgCjKzBgAAgAEGUKGxqQwAAgD9DAAAAACABIAFDAAAAAF0bIgEgAUMAAIA/XhsiAUMAAIA/IAGTIgVDAACAP0MAAAAAIAIgAkMAAAAAXRsiAiACQwAAgD9eG5SSIAEgBUMAAIA/QwAAAAAgAyADQwAAAABdGyIDIANDAACAP14blJIQpIGAgAAgASAFQwAAgD9DAAAAACAEIARDAAAAAF0bIgQgBEMAAIA/XhuUkhCkgYCAADgCzCcLC78NAQJ/AkAgAEE/Sw0AQQAoAoyswYAAIABBlChsaiEAAkAgAUUNACAAQX82AsAnQYACRQ0AIABBgCJqIABBgCBqQYAC/AoAAAsgAC0AjCgiAkEPSw0AIAJBowFsLQD8mMGAACICRQ0AIAAtAIAkIQMCQAJAAkAgAUUNACADQf8BcUEDRg0BDAILAkAgA0H/AXFBA0cNACAAQQA2AogkIABBBDoAgSQgACAAKgKEJDgCkCQLIAJBAUYNAgJAIAAtAJwkQQNHDQAgAEEANgKkJCAAQQQ6AJ0kIAAgACoCoCQ4AqwkCyACQQJGDQICQCAALQC4JEEDRw0AIABBADYCwCQgAEEEOgC5JCAAIAAqArwkOALIJAsgAkEDRg0CAkAgAC0A1CRBA0cNACAAQQA2AtwkIABBBDoA1SQgACAAKgLYJDgC5CQLIAJBBEYNAgJAIAAtAPAkQQNHDQAgAEEANgL4JCAAQQQ6APEkIAAgACoC9CQ4AoAlCyACQQVGDQICQCAALQCMJUEDRw0AIABBADYClCUgAEEEOgCNJSAAIAAqApAlOAKcJQsgAkEGRg0CAkAgAC0AqCVBA0cNACAAQQA2ArAlIABBBDoAqSUgACAAKgKsJTgCuCULIAJBB0YNAgJAIAAtAMQlQQNHDQAgAEEANgLMJSAAQQQ6AMUlIAAgACoCyCU4AtQlCyACQQhGDQICQCAALQDgJUEDRw0AIABBADYC6CUgAEEEOgDhJSAAIAAqAuQlOALwJQsgAkEJRg0CAkAgAC0A/CVBA0cNACAAQQA2AoQmIABBBDoA/SUgACAAKgKAJjgCjCYLIAJBCkYNAgJAIAAtAJgmQQNHDQAgAEEANgKgJiAAQQQ6AJkmIAAgACoCnCY4AqgmCyACQQtGDQICQCAALQC0JkEDRw0AIABBADYCvCYgAEEEOgC1JiAAIAAqArgmOALEJgsgAkEMRg0CAkAgAC0A0CZBA0cNACAAQQA2AtgmIABBBDoA0SYgACAAKgLUJjgC4CYLIAJBDUYNAgJAIAAtAOwmQQNHDQAgAEEANgL0JiAAQQQ6AO0mIAAgACoC8CY4AvwmCyACQQ5GDQICQCAALQCIJ0EDRw0AIABBADYCkCcgAEEEOgCJJyAAIAAqAownOAKYJwsgAkEPRg0CAkAgAC0ApCdBA0cNACAAQQA2AqwnIABBBDoApScgACAAKgKoJzgCtCcLIAJBEEYNAkEQQRBBkO7AgAAQ94CAgAAACyAAQQA2AogkIABBAToAgSQgACAAKgKEJDgCjCQLIAJBAUYNAAJAIAAtAJwkQQNHDQAgAEEANgKkJCAAQQE6AJ0kIAAgACoCoCQ4AqgkCyACQQJGDQACQCAALQC4JEEDRw0AIABBADYCwCQgAEEBOgC5JCAAIAAqArwkOALEJAsgAkEDRg0AAkAgAC0A1CRBA0cNACAAQQA2AtwkIABBAToA1SQgACAAKgLYJDgC4CQLIAJBBEYNAAJAIAAtAPAkQQNHDQAgAEEANgL4JCAAQQE6APEkIAAgACoC9CQ4AvwkCyACQQVGDQACQCAALQCMJUEDRw0AIABBADYClCUgAEEBOgCNJSAAIAAqApAlOAKYJQsgAkEGRg0AAkAgAC0AqCVBA0cNACAAQQA2ArAlIABBAToAqSUgACAAKgKsJTgCtCULIAJBB0YNAAJAIAAtAMQlQQNHDQAgAEEANgLMJSAAQQE6AMUlIAAgACoCyCU4AtAlCyACQQhGDQACQCAALQDgJUEDRw0AIABBADYC6CUgAEEBOgDhJSAAIAAqAuQlOALsJQsgAkEJRg0AAkAgAC0A/CVBA0cNACAAQQA2AoQmIABBAToA/SUgACAAKgKAJjgCiCYLIAJBCkYNAAJAIAAtAJgmQQNHDQAgAEEANgKgJiAAQQE6AJkmIAAgACoCnCY4AqQmCyACQQtGDQACQCAALQC0JkEDRw0AIABBADYCvCYgAEEBOgC1JiAAIAAqArgmOALAJgsgAkEMRg0AAkAgAC0A0CZBA0cNACAAQQA2AtgmIABBAToA0SYgACAAKgLUJjgC3CYLIAJBDUYNAAJAIAAtAOwmQQNHDQAgAEEANgL0JiAAQQE6AO0mIAAgACoC8CY4AvgmCyACQQ5GDQACQCAALQCIJ0EDRw0AIABBADYCkCcgAEEBOgCJJyAAIAAqAownOAKUJwsgAkEPRg0AAkAgAC0ApCdBA0cNACAAQQA2AqwnIABBAToApScgACAAKgKoJzgCsCcLIAJBEEYNAEEQQRBBoO7AgAAQ94CAgAAACwsiAAJAIABBP0sNAEEAKAKMrMGAACAAQZQobGogATYCwCcLC8IEAAJAIABBD0sNACAAQaMBbCIAQQA6AP6YwYAAIAAgAjoA/ZjBgAAgACABOgD8mMGAACAAQv+BgIDw/z83APSYwYAAIABCgID8/4+AgIB/NwDsmMGAACAAQv//g4CA4P//ADcA5JjBgAAgAEKAgID4/x83ANyYwYAAIABCgP7/h4CAQDcA1JjBgAAgAEL/gYCA8P8/NwDMmMGAACAAQoCA/P+PgICAfzcAxJjBgAAgAEL//4OAgOD//wA3ALyYwYAAIABCgICA+P8fNwC0mMGAACAAQoD+/4eAgEA3AKyYwYAAIABBADYA3pfBgAAgAEH/AToA4pfBgAAgAEEANgDjl8GAACAAQf8BOgDnl8GAACAAQQA2AOiXwYAAIABB/wE6AOyXwYAAIABBADYA7ZfBgAAgAEH/AToA8ZfBgAAgAEEANgDyl8GAACAAQf8BOgD2l8GAACAAQQA2APeXwYAAIABB/wE6APuXwYAAIABBADYA/JfBgAAgAEH/AToAgJjBgAAgAEEANgCBmMGAACAAQf8BOgCFmMGAACAAQQA2AIaYwYAAIABB/wE6AIqYwYAAIABBADYAi5jBgAAgAEH/AToAj5jBgAAgAEEANgCQmMGAACAAQf8BOgCUmMGAACAAQQA2AJWYwYAAIABB/wE6AJmYwYAAIABBADYAmpjBgAAgAEH/AToAnpjBgAAgAEEANgCfmMGAACAAQf8BOgCjmMGAACAAQYD+AzsA3JfBgAAgAEKAgICA8B83AKSYwYAACwtvAQJ/AkAgASAAckEPSw0AIABBowFsIgdB3JfBgABqIgggAUEFbGoiACADOgACIAAgAjoAASAAIAZB/wFxQQFGOgAAIAAgBToABCAAIAQ6AAMgBy0A/pjBgAAgAUH/AXFLDQAgCCABQQFqOgCiAQsLXgACQCABIAByQQ9LDQAgAEGjAWwgAUEFbGoiACAGOgCwmMGAACAAIAU6AK+YwYAAIAAgBDoArpjBgAAgACADOgCtmMGAACAAIAJBACACQf8BcUEISRs6AKyYwYAACwsrAAJAIAEgAHJBP0sNAEEAKAKMrMGAACAAQZQobGogAUECdGogAjgCgCALCxwAQQAgAEHAACAAQcAASRtBASAAGzYCqKXFgAALUwACQCAAQT9LDQAgAbxB/////wdxQf////sHSg0AQQAoAoyswYAAIABBlChsakMAAIA/QwAAAAAgASABQwAAAABdGyIBIAFDAACAP14bOAL4JwsLEgBB0JfBgAAgACABEIWAgIAAC08AQQAgAzgC/LvCgABBACACQ83MzD0QpIGAgAA4ApS8woAAQQAgAUPNzMw9EKSBgIAAOAKQvMKAAEEAIABDzczMPRCkgYCAADgCjLzCgAALgQEAAkAgAEE/Sw0AQQAoAoyswYAAIABBlChsaiIAIAY4AvAnIAAgBTgC7CcgACAEOALoJyAAIAMgBRCWgYCAACIFOALkJyAAIAI4AuAnIAAgATgC3CcgAC0AjyhBAUcNACAAQQA6AI8oIAAgBTgC2CcgACACOALUJyAAIAE4AtAnCwsSAEHQl8GAACAAIAEQh4CAgAALJQACQCAAQT9LDQBBACgCjKzBgAAgAEGUKGxqIAFBAEc6AJAoCwslAAJAIABBP0sNAEEAKAKMrMGAACAAQZQobGogAUEARzoAjigLCwgAQYClxYAAC8IBAAJAIABBP0sNAEEAKAKMrMGAACAAQZQobGohAAJAAkAgAUUNACAALQCNKA0BAkBBgAJFDQAgAEGAImogAEGAIGpBgAL8CgAACyAAQQE6AI8oIABCADcC0CcgACAAKgLsJzgC2CcgACgC/CcQgoCAgAAgAEEAOgCQKCAAQoCAgIBwNwL8JyAAQgA3AvQnIABBgICA/AM2AswnIABCgICAgICAgMA/NwLEJwwBCyAAQX82AsAnCyAAIAFBAEc6AI0oCwucBQECfwJAIABBP00NAEEADwsCQAJAQQAoAoyswYAAIABBlChsaiIALQCNKEEBRw0AIAAtAIwoIgFBD0sNACABQaMBbC0A/JjBgAAiAUUNAQJAAkAgAC0AgCRBA0cNACAALQCBJA0BCyABQQFGDQICQCAALQCcJEEDRw0AIAAtAJ0kDQELIAFBAkYNAgJAIAAtALgkQQNHDQAgAC0AuSQNAQsgAUEDRg0CAkAgAC0A1CRBA0cNACAALQDVJA0BCyABQQRGDQICQCAALQDwJEEDRw0AIAAtAPEkDQELIAFBBUYNAgJAIAAtAIwlQQNHDQAgAC0AjSUNAQsgAUEGRg0CAkAgAC0AqCVBA0cNACAALQCpJQ0BCyABQQdGDQICQCAALQDEJUEDRw0AIAAtAMUlDQELIAFBCEYNAgJAIAAtAOAlQQNHDQAgAC0A4SUNAQsgAUEJRg0CAkAgAC0A/CVBA0cNACAALQD9JQ0BCyABQQpGDQICQCAALQCYJkEDRw0AIAAtAJkmDQELIAFBC0YNAgJAIAAtALQmQQNHDQAgAC0AtSYNAQsgAUEMRg0CAkAgAC0A0CZBA0cNACAALQDRJg0BCyABQQ1GDQICQCAALQDsJkEDRw0AIAAtAO0mDQELIAFBDkYNAgJAIAAtAIgnQQNHDQAgAC0AiScNAQsgAUEPRg0CAkAgAC0ApCdBA0cNACAALQClJw0BCyABQRBGDQJBEEEQQdCJwIAAEPeAgIAAAAsgAEF/NgKAKAtBAA8LAkAgACgCgCgiAUF/Sg0AQQAhAQJAIAAoAvwnIgJFDQAgAigCnAQhAQsgACABQRAgAUEQShtBACAALQCOKBsiATYCgCgLAkAgAQ0AQQEPCyAAIAFBf2o2AoAoQQALNwACQCAAQQdLDQBBACgClKzBgAAgAEGw4ABsIgBqQQA2AqRgQQAoApSswYAAIABqQQA2AqhgCwsjAAJAIABBB0sNAEEAKAKUrMGAACAAQbDgAGxqQQA6AKxgCwsjAAJAIABBB0sNAEEAKAKUrMGAACAAQbDgAGxqQQE6AKxgCwsoAEHQl8GAACAAIAEgAiADIAQgBSAGIAcgCCAJIAogCyAMEIiAgIAACwgAQfDUw4AAC9kKAgV/AXwCQCAAQQdLDQBBACgClKzBgAAgAEGw4ABsaiICIAE5AxAgAiACKQMANwMIIAJB6ABqIQNBACACKAKkYCIEayEFQX8hAAJAAkADQAJAIAUgAGoiBkF/Rw0AIAQhAAwDCwJAIABB/wFGDQAgA0FQaisDACABZg0CAkAgBkF+Rw0AIAQhAAwECyAAQQJqIQAgAysDACEHIANB4ABqIQMgByABZkUNAQwDCwtBgAJBgAJBgIrAgAAQ94CAgAAACyAAQQFqIQALIAIgADYCqGAgBEUNACACQcQAaiEDQQAhAANAAkACQCAAQYACRg0AIAMtAAAiBkHAAE8NAUEAKAKMrMGAACAGQZQobCIFaiIGLQCNKEEBRw0BIAYtAIwoIgJBD0sNASACQaMBbC0A/JjBgAAiAkUNAQJAIAYtAIAkQQNHDQAgBkGAJGoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBAUYNAQJAQQAoAoyswYAAIAVqIgYtAJwkQQNHDQAgBkGcJGoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBAkYNAQJAQQAoAoyswYAAIAVqIgYtALgkQQNHDQAgBkG4JGoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBA0YNAQJAQQAoAoyswYAAIAVqIgYtANQkQQNHDQAgBkHUJGoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBBEYNAQJAQQAoAoyswYAAIAVqIgYtAPAkQQNHDQAgBkHwJGoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBBUYNAQJAQQAoAoyswYAAIAVqIgYtAIwlQQNHDQAgBkGMJWoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBBkYNAQJAQQAoAoyswYAAIAVqIgYtAKglQQNHDQAgBkGoJWoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBB0YNAQJAQQAoAoyswYAAIAVqIgYtAMQlQQNHDQAgBkHEJWoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBCEYNAQJAQQAoAoyswYAAIAVqIgYtAOAlQQNHDQAgBkHgJWoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBCUYNAQJAQQAoAoyswYAAIAVqIgYtAPwlQQNHDQAgBkH8JWoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBCkYNAQJAQQAoAoyswYAAIAVqIgYtAJgmQQNHDQAgBkGYJmoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBC0YNAQJAQQAoAoyswYAAIAVqIgYtALQmQQNHDQAgBkG0JmoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBDEYNAQJAQQAoAoyswYAAIAVqIgYtANAmQQNHDQAgBkHQJmoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBDUYNAQJAQQAoAoyswYAAIAVqIgYtAOwmQQNHDQAgBkHsJmoiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBDkYNAQJAQQAoAoyswYAAIAVqIgYtAIgnQQNHDQAgBkGIJ2oiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBD0YNAQJAQQAoAoyswYAAIAVqIgYtAKQnQQNHDQAgBkGkJ2oiBkEANgIIIAZBBDoAASAGIAYqAgQ4AhALIAJBEEYNAUEQQRBBoIrAgAAQ94CAgAAAC0GAAkGAAkGQisCAABD3gICAAAALIANBMGohAyAEIABBAWoiAEcNAAsLC3ICAn0CfgJAIABBB0sNAEEAKAKUrMGAACAAQbDgAGxqIgAqAqBgIQJBACoCnLzCgAAhAyAAIAE4AqBgIAApAwghBCAAIAApAwAiBTcDCCAAIAArAxAgBSAEfbogAruiIAO7RAAAAAAAAE5AoqOgOQMQCwsjAAJAIABBB0sNAEEAKAKUrMGAACAAQbDgAGxqIAE5A5hgCwtIAAJAIABBB0sNAEEAKAKUrMGAACAAQbDgAGxqIgBBADYCqGAgAEEAOgCsYCAAQgA3AwAgAEEIakIANwMAIABBEGpCADcDAAsLDQAgACABEMOAgIAADwsPACAAIAEgAhDHgICAAA8LEQAgACABIAIgAxDJgICAAA8LDQAgACABEM6AgIAADwsDAA8LCQAQxoCAgAAACw4AIAAgARDBgICAABoACx8AAkAgAUEJSQ0AIAEgABDEgICAAA8LIAAQxYCAgAAL+wIBBX9BACECAkAgAUHN/3sgAEEQIABBEEsbIgBrTw0AIABBECABQQtqQXhxIAFBC0kbIgNqQQxqEMWAgIAAIgFFDQAgAUF4aiECAkACQCAAQX9qIgQgAXENACACIQAMAQsgAUF8aiIFKAIAIgZBeHEgBCABakEAIABrcUF4aiIBQQAgACABIAJrQRBLG2oiACACayIBayEEAkAgBkEDcUUNACAAIAQgACgCBEEBcXJBAnI2AgQgACAEaiIEIAQoAgRBAXI2AgQgBSABIAUoAgBBAXFyQQJyNgIAIAIgAWoiBCAEKAIEQQFyNgIEIAIgARDLgICAAAwBCyACKAIAIQIgACAENgIEIAAgAiABajYCAAsCQCAAKAIEIgFBA3FFDQAgAUF4cSICIANBEGpNDQAgACADIAFBAXFyQQJyNgIEIAAgA2oiASACIANrIgNBA3I2AgQgACACaiICIAIoAgRBAXI2AgQgASADEMuAgIAACyAAQQhqIQILIAIL7CcCCX8BfiOAgICAAEEQayIBJICAgIAAAkACQAJAAkACQAJAIABB9QFJDQACQCAAQcz/e00NAEEAIQAMBgsgAEELaiICQXhxIQNBACgCmKnFgAAiBEUNBEEfIQUCQCAAQfT//wdLDQAgA0EmIAJBCHZnIgBrdkEBcSAAQQF0a0E+aiEFC0EAIANrIQICQCAFQQJ0QfylxYAAaigCACIGDQBBACEHQQAhAAwCC0EAIQcgA0EAQRkgBUEBdmsgBUEfRht0IQhBACEAA0ACQCAGIgYoAgRBeHEiCSADSQ0AIAkgA2siCSACTw0AIAYhByAJIQIgCQ0AQQAhAiAGIQAgBiEHDAQLIAYoAhQiCSAAIAkgBiAIQR12QQRxaigCECIGRxsgACAJGyEAIAhBAXQhCCAGRQ0CDAALCwJAAkACQAJAAkACQEEAKAKUqcWAACIGQRAgAEELakH4A3EgAEELSRsiA0EDdiICdiIAQQNxRQ0AIABBf3NBAXEgAmoiCEEDdCIDQYynxYAAaiIAIANBlKfFgABqKAIAIgIoAggiB0YNASAHIAA2AgwgACAHNgIIDAILIANBACgCnKnFgABNDQggAA0CQQAoApipxYAAIgBFDQggAGhBAnRB/KXFgABqKAIAIgYoAgRBeHEgA2shAiAGIQcDQAJAIAcoAhAiAA0AIAcoAhQiAA0AIAYoAhghBQJAAkACQCAGKAIMIgAgBkcNACAGQRRBECAGKAIUIgAbaigCACIHDQFBACEADAILIAYoAggiByAANgIMIAAgBzYCCAwBCyAGQRRqIAZBEGogABshCANAIAghCSAHIgBBFGogAEEQaiAAKAIUIgcbIQggAEEUQRAgBxtqKAIAIgcNAAsgCUEANgIACyAFRQ0GAkACQCAGIAYoAhxBAnRB/KXFgABqIgcoAgBGDQACQCAFKAIQIAZGDQAgBSAANgIUIAANAgwJCyAFIAA2AhAgAA0BDAgLIAcgADYCACAARQ0GCyAAIAU2AhgCQCAGKAIQIgdFDQAgACAHNgIQIAcgADYCGAsgBigCFCIHRQ0GIAAgBzYCFCAHIAA2AhgMBgsgACgCBEF4cSADayIHIAIgByACSSIHGyECIAAgBiAHGyEGIAAhBwwACwtBACAGQX4gCHdxNgKUqcWAAAsgAkEIaiEAIAIgA0EDcjYCBCACIANqIgMgAygCBEEBcjYCBAwHCwJAAkAgACACdEECIAJ0IgBBACAAa3JxaCIJQQN0IgJBjKfFgABqIgcgAkGUp8WAAGooAgAiACgCCCIIRg0AIAggBzYCDCAHIAg2AggMAQtBACAGQX4gCXdxNgKUqcWAAAsgACADQQNyNgIEIAAgA2oiBiACIANrIgdBAXI2AgQgACACaiAHNgIAAkBBACgCnKnFgAAiAkUNAEEAKAKkqcWAACEDAkACQEEAKAKUqcWAACIIQQEgAkEDdnQiCXENAEEAIAggCXI2ApSpxYAAIAJBeHFBjKfFgABqIgIhCAwBCyACQXhxIgJBjKfFgABqIQggAkGUp8WAAGooAgAhAgsgCCADNgIIIAIgAzYCDCADIAg2AgwgAyACNgIICyAAQQhqIQBBACAGNgKkqcWAAEEAIAc2ApypxYAADAYLQQBBACgCmKnFgABBfiAGKAIcd3E2ApipxYAACwJAAkACQCACQRBJDQAgBiADQQNyNgIEIAYgA2oiByACQQFyNgIEIAcgAmogAjYCAEEAKAKcqcWAACIIRQ0BQQAoAqSpxYAAIQACQAJAQQAoApSpxYAAIglBASAIQQN2dCIFcQ0AQQAgCSAFcjYClKnFgAAgCEF4cUGMp8WAAGoiCCEJDAELIAhBeHEiCEGMp8WAAGohCSAIQZSnxYAAaigCACEICyAJIAA2AgggCCAANgIMIAAgCTYCDCAAIAg2AggMAQsgBiACIANqIgBBA3I2AgQgBiAAaiIAIAAoAgRBAXI2AgQMAQtBACAHNgKkqcWAAEEAIAI2ApypxYAACyAGQQhqIgBFDQMMBAsCQCAAIAdyDQBBACEHQQIgBXQiAEEAIABrciAEcSIARQ0DIABoQQJ0QfylxYAAaigCACEACyAARQ0BCwNAIAAoAgRBeHEiBiADayIIIAIgCCACSSIJGyEFIAYgA0khCCAAIAcgCRshCQJAIAAoAhAiBg0AIAAoAhQhBgsgAiAFIAgbIQIgByAJIAgbIQcgBiEAIAYNAAsLIAdFDQACQEEAKAKcqcWAACIAIANJDQAgAiAAIANrTw0BCyAHKAIYIQUCQAJAAkAgBygCDCIAIAdHDQAgB0EUQRAgBygCFCIAG2ooAgAiBg0BQQAhAAwCCyAHKAIIIgYgADYCDCAAIAY2AggMAQsgB0EUaiAHQRBqIAAbIQgDQCAIIQkgBiIAQRRqIABBEGogACgCFCIGGyEIIABBFEEQIAYbaigCACIGDQALIAlBADYCAAsCQCAFRQ0AAkACQAJAIAcgBygCHEECdEH8pcWAAGoiBigCAEYNAAJAIAUoAhAgB0YNACAFIAA2AhQgAA0CDAQLIAUgADYCECAADQEMAwsgBiAANgIAIABFDQELIAAgBTYCGAJAIAcoAhAiBkUNACAAIAY2AhAgBiAANgIYCyAHKAIUIgZFDQEgACAGNgIUIAYgADYCGAwBC0EAQQAoApipxYAAQX4gBygCHHdxNgKYqcWAAAsCQAJAIAJBEEkNACAHIANBA3I2AgQgByADaiIAIAJBAXI2AgQgACACaiACNgIAAkAgAkGAAkkNACAAIAIQ5ICAgAAMAgsCQAJAQQAoApSpxYAAIgZBASACQQN2dCIIcQ0AQQAgBiAIcjYClKnFgAAgAkH4AXFBjKfFgABqIgIhBgwBCyACQfgBcSICQYynxYAAaiEGIAJBlKfFgABqKAIAIQILIAYgADYCCCACIAA2AgwgACAGNgIMIAAgAjYCCAwBCyAHIAIgA2oiAEEDcjYCBCAHIABqIgAgACgCBEEBcjYCBAsgB0EIaiIADQELAkACQAJAAkACQAJAQQAoApypxYAAIgAgA08NAAJAQQAoAqCpxYAAIgAgA0sNACABQQRqQcCpxYAAIANBr4AEakGAgHxxEOqAgIAAAkAgASgCBCIGDQBBACEADAgLIAEoAgwhBUEAQQAoAqypxYAAIAEoAggiCWoiADYCrKnFgABBACAAQQAoArCpxYAAIgIgACACSxs2ArCpxYAAAkACQAJAQQAoAqipxYAAIgJFDQBB/KbFgAAhAANAIAYgACgCACIHIAAoAgQiCGpGDQIgACgCCCIADQAMAwsLAkACQEEAKAK4qcWAACIARQ0AIAYgAE8NAQtBACAGNgK4qcWAAAtBAEH/HzYCvKnFgABBACAFNgKIp8WAAEEAIAk2AoCnxYAAQQAgBjYC/KbFgABBAEGMp8WAADYCmKfFgABBAEGUp8WAADYCoKfFgABBAEGMp8WAADYClKfFgABBAEGcp8WAADYCqKfFgABBAEGUp8WAADYCnKfFgABBAEGkp8WAADYCsKfFgABBAEGcp8WAADYCpKfFgABBAEGsp8WAADYCuKfFgABBAEGkp8WAADYCrKfFgABBAEG0p8WAADYCwKfFgABBAEGsp8WAADYCtKfFgABBAEG8p8WAADYCyKfFgABBAEG0p8WAADYCvKfFgABBAEHEp8WAADYC0KfFgABBAEG8p8WAADYCxKfFgABBAEHMp8WAADYC2KfFgABBAEHEp8WAADYCzKfFgABBAEHMp8WAADYC1KfFgABBAEHUp8WAADYC4KfFgABBAEHUp8WAADYC3KfFgABBAEHcp8WAADYC6KfFgABBAEHcp8WAADYC5KfFgABBAEHkp8WAADYC8KfFgABBAEHkp8WAADYC7KfFgABBAEHsp8WAADYC+KfFgABBAEHsp8WAADYC9KfFgABBAEH0p8WAADYCgKjFgABBAEH0p8WAADYC/KfFgABBAEH8p8WAADYCiKjFgABBAEH8p8WAADYChKjFgABBAEGEqMWAADYCkKjFgABBAEGEqMWAADYCjKjFgABBAEGMqMWAADYCmKjFgABBAEGUqMWAADYCoKjFgABBAEGMqMWAADYClKjFgABBAEGcqMWAADYCqKjFgABBAEGUqMWAADYCnKjFgABBAEGkqMWAADYCsKjFgABBAEGcqMWAADYCpKjFgABBAEGsqMWAADYCuKjFgABBAEGkqMWAADYCrKjFgABBAEG0qMWAADYCwKjFgABBAEGsqMWAADYCtKjFgABBAEG8qMWAADYCyKjFgABBAEG0qMWAADYCvKjFgABBAEHEqMWAADYC0KjFgABBAEG8qMWAADYCxKjFgABBAEHMqMWAADYC2KjFgABBAEHEqMWAADYCzKjFgABBAEHUqMWAADYC4KjFgABBAEHMqMWAADYC1KjFgABBAEHcqMWAADYC6KjFgABBAEHUqMWAADYC3KjFgABBAEHkqMWAADYC8KjFgABBAEHcqMWAADYC5KjFgABBAEHsqMWAADYC+KjFgABBAEHkqMWAADYC7KjFgABBAEH0qMWAADYCgKnFgABBAEHsqMWAADYC9KjFgABBAEH8qMWAADYCiKnFgABBAEH0qMWAADYC/KjFgABBAEGEqcWAADYCkKnFgABBAEH8qMWAADYChKnFgABBACAGQQ9qQXhxIgBBeGoiAjYCqKnFgABBAEGEqcWAADYCjKnFgABBACAGIABrIAlBWGoiAGpBCGoiBzYCoKnF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AkAgAkH//7//B0sNACABQQhqIAAQm4GAgAAgASsDGCEDIAErAwgiBCAEoiIAIACiIQUgASgCEEEDcQ4EAgMEAQILIAAgAKEhAAwFC0QAAAAAAADwPyAARAAAAAAAAOA/oiIGoSIHRAAAAAAAAPA/IAehIAahIAAgACAAIABEkBXLGaAB+j6iRHdRwRZswVa/oKJETFVVVVVVpT+goiAFIAWiIAAgAETUOIi+6fqovaJExLG0vZ7uIT6gokStUpyAT36SvqCioKIgBCADoqGgoJohAAwECyAEIAQgAKIiBkRJVVVVVVXFP6IgACADRAAAAAAAAOA/oiAGIAAgBaIgAER81c9aOtnlPaJE65wriublWr6goiAAIABEff6xV+Mdxz6iRNVhwRmgASq/oKJEpvgQERERgT+goKKhoiADoaChIQAMAwtEAAAAAAAA8D8gAEQAAAAAAADgP6IiBqEiB0QAAAAAAADwPyAHoSAGoSAAIAAgACAARJAVyxmgAfo+okR3UcEWbMFWv6CiRExVVVVVVaU/oKIgBSAFoiAAIABE1DiIvun6qL2iRMSxtL2e7iE+oKJErVKcgE9+kr6goqCiIAQgA6KhoKAhAAwCCyAEIAQgAKIiBkRJVVVVVVXFP6IgACADRAAAAAAAAOA/oiAGIAAgBaIgAER81c9aOtnlPaJE65wriublWr6goiAAIABEff6xV+Mdxz6iRNVhwRmgASq/oKJEpvgQERERgT+goKKhoiADoaChmiEADAELAkAgAkGAgMDyA0kNACAAIAAgACAAoiIEoiAEIAQgBCAEoqIgBER81c9aOtnlPaJE65wriublWr6goiAEIAREff6xV+Mdxz6iRNVhwRmgASq/oKJEpvgQERERgT+goKJESVVVVVVVxb+goqAhAAwBCwJAIAJBgIDAAEkNACABIABEAAAAAAAAcEegOQMIIAErAwgaDAELIAEgAEQAAAAAAABwOKI5AwggASsDCBoLIAFBIGokgICAgAAgAAuvBAIEfwN9I4CAgIAAQRBrIQEgALwiAkEfdiEDAkACQAJAAkACQAJAAkAgAkH/////B3EiBEHQ2LqVBEkNAAJAIARBgICA/AdNDQAgAA8LAkAgBEGX5MWVBEsNACACQX9KDQIgAUMAAICAIACVOAIIIAEqAggaDAILAkAgAkF/Sg0AIAFDAACA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NmQzYmQxL2xpYnJhcnkvY29yZS9zcmMvbnVtL2ZsdDJkZWMvc3RyYXRlZ3kvZHJhZ29uLnJzAC9ydXN0Yy9lNDA4OTQ3YmZkMjAwYWY0MmRiMzIyZGFmMGZhZGZlN2UyNmQzYmQxL2xpYnJhcnkvY29yZS9zcmMvbnVtL2JpZ251bS5ycwAvcnVzdGMvZTQwODk0N2JmZDIwMGFmNDJkYjMyMmRhZjBmYWRmZTdlMjZkM2JkMS9saWJyYXJ5L2NvcmUvc3JjL2ZtdC9udW0ucnMAc3JjXGdyYXBoLnJzAHNyY1xzYW1wbGUucnMAL3J1c3RjL2U0MDg5NDdiZmQyMDBhZjQyZGIzMjJkYWYwZmFkZmU3ZTI2ZDNiZDEvbGlicmFyeS9hbGxvYy9zcmMvcmF3X3ZlYy9tb2QucnMAL3J1c3RjL2U0MDg5NDdiZmQyMDBhZjQyZGIzMjJkYWYwZmFkZmU3ZTI2ZDNiZDEvbGlicmFyeS9jb3JlL3NyYy9udW0vZmx0MmRlYy9tb2QucnMAL3J1c3QvZGVwcy9kbG1hbGxvYy0wLjIuMTEvc3JjL2RsbWFsbG9jLnJzAHNyY1xsaWIucnMAL3J1c3RjL2U0MDg5NDdiZmQyMDBhZjQyZGIzMjJkYWYwZmFkZmU3ZTI2ZDNiZDEvbGlicmFyeS9jb3JlL3NyYy9udW0vZjMyLnJzAAAALgIQABEAAABPAAAADgAAAC4CEAARAAAAUAAAAAwAAAAuAhAAEQAAAFEAAAAOAAAARwQQAAoAAAD9AgAAOQAAAEcEEAAKAAAAKQMAABUAAABHBBAACgAAAF4EAAARAAAARwQQAAoAAADTAAAADAAAAEcEEAAKAAAAHAQAABYAAABHBBAACgAAACIEAAAZAAAARwQQAAoAAAD4AQAADQAAAEcEEAAKAAAA/wEAABoAAABHBBAACgAAAO0BAAAdAAAARwQQAAoAAADvAQAAHAAAAEcEEAAKAAAA8wEAAA0AAABHBBAACgAAAOoBAAAtAAAARwQQAAoAAADeAQAAFAAAAEcEEAAKAAAA2AEAAA0AAABHBBAACgAAAKgGAAARAAAARwQQAAoAAABMBAAAEQAAAEcEEAAKAAAAQAQAAB4AAABHBBAACgAAABwFAABFAAAARwQQAAoAAAAvBQAAHQAAAEcEEAAKAAAAFQYAAB0AAABHBBAACgAAALMFAAAdAAAARwQQAAoAAABCBQAAHwAAAEcEEAAKAAAANwUAAB8AAABHBBAACgAAAPAEAABFAAAARwQQAAoAAADjBAAAHwAAAEcEEAAKAAAAcgMAAB4AAABHBBAACgAAAAMEAAAJAAAARwQQAAoAAAABBAAAHwAAAEcEEAAKAAAAAQQAAA0AAABHBBAACgAAAPoDAAAQAAAARwQQAAoAAAC3BAAAMwAAAEcEEAAKAAAAfQQAADMAAABHBBAACgAAAJoEAAAzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPBCAAAAAAAAAAAAAAAARwQQAAoAAABNAgAAEQAAAEcEEAAKAAAASwIAABEAAABOAhAAEgAAACwAAAAsAAAATgIQABIA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", "" + import.meta.url);
})), Uf = /* @__PURE__ */ n({ WebBackend: () => Wf }), Wf, Gf = t((() => {
	zf(), Hf(), Wf = class {
		_audioCtx = null;
		_workletNode = null;
		_resumeListener = null;
		_stateListener = null;
		_visibilityListener = null;
		_deviceListener = null;
		_wasSuspended = !1;
		_queue = [];
		_irPool = [];
		_lastHeartbeat = 0;
		_heartbeatTimer = null;
		get running() {
			return this._audioCtx !== null && this._audioCtx.state === "running";
		}
		reconnect() {
			!this._workletNode || !this._audioCtx || (this._workletNode.disconnect(), this._workletNode.connect(this._audioCtx.destination));
		}
		async init(e) {
			if (this._audioCtx = new AudioContext(), this._audioCtx.state === "suspended") {
				let e = () => {
					this._audioCtx.resume(), document.removeEventListener("pointerdown", e), document.removeEventListener("keydown", e), this._resumeListener = null;
				};
				document.addEventListener("pointerdown", e), document.addEventListener("keydown", e), this._resumeListener = e;
			}
			let t = await Bf(), n = Lf();
			await this._audioCtx.audioWorklet.addModule(n), URL.revokeObjectURL(n), this._workletNode = new AudioWorkletNode(this._audioCtx, "synth-processor", { outputChannelCount: [2] }), this._workletNode.connect(this._audioCtx.destination), this._workletNode.port.postMessage({
				type: "init",
				bytes: t
			}), this._wasSuspended = this._audioCtx.state !== "running", this._stateListener = () => {
				this._audioCtx.state === "running" && this._wasSuspended && (this._workletNode?.port.postMessage({ type: "reset" }), this.reconnect()), this._wasSuspended = this._audioCtx.state !== "running";
			}, this._audioCtx.addEventListener("statechange", this._stateListener), this._visibilityListener = () => {
				document.visibilityState === "visible" && this._audioCtx && (this._audioCtx.resume(), this.reconnect());
			}, document.addEventListener("visibilitychange", this._visibilityListener), this._deviceListener = () => this.reconnect(), navigator.mediaDevices?.addEventListener("devicechange", this._deviceListener), this._workletNode.onprocessorerror = (e) => {
				console.error("audio worklet crashed:", e);
			}, this._workletNode.port.onmessage = (t) => {
				if (t.data.type === "voice_idle") e.onVoiceIdle(t.data.voiceId);
				else if (t.data.type === "transport_beats") for (let n of t.data.beats) e.onTransportBeat(n.tid, n.beatLo, n.beatHi);
				else if (t.data.type === "overflow") console.warn(`audio: ${t.data.count} events dropped (transport buffer full)`);
				else if (t.data.type === "heartbeat") {
					this._lastHeartbeat = performance.now();
					let e = t.data;
					e.outputPeak !== void 0 && e.outputPeak < 0 && console.error("audio: NaN detected in output"), e.dropped > 0 && console.error(`audio: ${e.dropped} blocks dropped`);
				} else t.data.type === "error" && console.error(`audio worklet error: ${t.data.message}`);
			}, this._lastHeartbeat = performance.now(), this._heartbeatTimer = setInterval(() => {
				if (!this._audioCtx || this._audioCtx.state !== "running") return;
				let e = performance.now() - this._lastHeartbeat;
				e > 3e3 && (console.warn(`audio: worklet heartbeat lost (${(e / 1e3).toFixed(0)}s), reconnecting`), this.reconnect(), this._lastHeartbeat = performance.now());
			}, 2e3);
		}
		dispose() {
			this.flush(), this._heartbeatTimer &&= (clearInterval(this._heartbeatTimer), null), this._resumeListener &&= (document.removeEventListener("pointerdown", this._resumeListener), document.removeEventListener("keydown", this._resumeListener), null), this._stateListener && this._audioCtx && (this._audioCtx.removeEventListener("statechange", this._stateListener), this._stateListener = null), this._visibilityListener &&= (document.removeEventListener("visibilitychange", this._visibilityListener), null), this._deviceListener &&= (navigator.mediaDevices?.removeEventListener("devicechange", this._deviceListener), null), this._workletNode &&= (this._workletNode.disconnect(), null), this._audioCtx &&= (this._audioCtx.close(), null);
		}
		send(e) {
			if (this._workletNode && !(e.type === "params" && e.changes.length === 0)) {
				if (e.type === "spatial") {
					if (e.len === 0) return;
					this._queue.push({
						type: "spatial",
						data: e.data.slice(0, e.len)
					});
					return;
				}
				if (e.type === "reflectionIR") {
					let t = this._irPool.pop();
					(!t || t.length < e.irLen) && (t = new Float32Array(e.irLen)), t.set(e.ir.subarray(0, e.irLen)), this._queue.push({
						type: "reflectionIR",
						voiceId: e.voiceId,
						ir: t,
						irLen: e.irLen
					});
					return;
				}
				this._queue.push(e);
			}
		}
		pollReadback() {}
		flush() {
			if (!(!this._workletNode || this._queue.length === 0)) {
				for (let e = 0; e < this._queue.length; e++) this._queue[e].type === "reflectionIR" && this._irPool.push(this._queue[e].ir);
				this._workletNode.port.postMessage({
					type: "batch",
					commands: this._queue
				}), this._queue.length = 0;
			}
		}
	};
})), Kf = 64, qf = 8, Jf = {
	azimuth: 0,
	elevation: 0,
	distance: 0
};
function Yf(e, t, n, r, i, a, o, s, c, l, u, d) {
	let f = e * r + t * i + n * a, p = e * o + t * s + n * c, m = e * l + t * u + n * d, h = Math.sqrt(e * e + t * t + n * n), g = Math.atan2(f, m), _ = h > .001 ? Math.asin(Math.max(-1, Math.min(1, p / h))) : 0;
	return Jf.azimuth = g, Jf.elevation = _, Jf.distance = h, Jf;
}
var Xf = I("audio"), Zf = I("sound-voices");
function Qf() {
	let e = [];
	for (let t = Kf - 1; t >= 0; t--) e.push(t);
	let t = [];
	for (let e = qf - 1; e >= 0; e--) t.push(e);
	return {
		backend: null,
		voiceFree: e,
		voices: Array(Kf).fill(null),
		registeredVersions: /* @__PURE__ */ new Map(),
		registeredSampleVersions: /* @__PURE__ */ new Map(),
		spatialBatch: new Float32Array(Kf * 7),
		spatialLen: 0,
		acousticBatch: new Float32Array(Kf * 5),
		acousticLen: 0,
		transportFree: t,
		transportBeats: /* @__PURE__ */ new Map(),
		seekTimes: /* @__PURE__ */ new Map(),
		idleCallbacks: /* @__PURE__ */ new Map(),
		beatDecoder: /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8)),
		warnedVoiceFull: !1,
		warnedSpatialFull: !1,
		voiceGen: Array(Kf).fill(0),
		idleWatchGen: /* @__PURE__ */ new Map()
	};
}
async function $f(e) {
	if (e.backend) return;
	e.voiceFree.length = 0;
	for (let t = Kf - 1; t >= 0; t--) e.voiceFree.push(t);
	e.voices.fill(null), e.registeredVersions.clear(), e.registeredSampleVersions.clear(), e.idleCallbacks.clear(), e.warnedVoiceFull = !1, e.warnedSpatialFull = !1, e.voiceGen.fill(0), e.idleWatchGen.clear(), e.transportFree.length = 0;
	for (let t = qf - 1; t >= 0; t--) e.transportFree.push(t);
	e.transportBeats.clear();
	let { WebBackend: t } = await Promise.resolve().then(() => (Gf(), Uf));
	e.backend = new t(), await e.backend.init({
		onVoiceIdle(t) {
			ip(e, t);
		},
		onTransportBeat(t, n, r) {
			ap(e, t, n, r);
		}
	});
}
function ep(e) {
	return e.backend !== null;
}
function tp(e) {
	return e.backend?.running ?? !1;
}
function np(e) {
	e.backend?.pollReadback(), Pf(e), e.backend?.flush();
}
function rp(e) {
	e.backend?.dispose(), e.backend = null, e.idleCallbacks.clear(), e.transportBeats.clear(), e.seekTimes.clear();
}
function ip(e, t) {
	let n = e.idleWatchGen.get(t);
	if (n !== void 0 && n !== e.voiceGen[t]) {
		e.idleCallbacks.delete(t), e.idleWatchGen.delete(t);
		return;
	}
	e.idleWatchGen.delete(t);
	let r = e.idleCallbacks.get(t);
	if (r) {
		e.idleCallbacks.delete(t), r();
		return;
	}
	e.voices[t] && (fp(e, t), e.voiceFree.push(t));
}
function ap(e, t, n, r) {
	let i = performance.now(), a = e.seekTimes.get(t);
	if (a !== void 0) {
		if (i - a < 10) return;
		e.seekTimes.delete(t);
	}
	e.beatDecoder.setUint32(0, n, !0), e.beatDecoder.setUint32(4, r, !0), e.transportBeats.set(t, e.beatDecoder.getFloat64(0, !0));
}
function op(e, t, n) {
	if (!e.backend) return;
	let r = e.voices[t];
	r && r.gate === n || (e.backend.send({
		type: "gate",
		voiceId: t,
		value: n
	}), r && (r.gate = n));
}
function sp(e, t, n, r) {
	e.backend && e.backend.send({
		type: "params",
		changes: [[
			t,
			n,
			r
		]]
	});
}
function cp(e, t, n) {
	if (!e.backend || e.registeredVersions.get(t) === n.version) return;
	e.backend.send({
		type: "set_instrument",
		id: t,
		nodeCount: n.nodes.length,
		outputBuf: n.outputBuf,
		nodes: n.nodes,
		modulations: n.modulations
	}), e.registeredVersions.set(t, n.version);
	let r = Mf(t);
	for (let n = 0; n < e.voices.length; n++) {
		let i = e.voices[n];
		i && i.instrumentId === t && (e.backend.send({
			type: "set_voice_instrument",
			voiceId: n,
			instrumentId: t
		}), i.gate = -1, up(e, n, r));
	}
}
function lp(e, t, n) {
	if (!e.backend) return;
	e.backend.send({
		type: "set_voice_instrument",
		voiceId: t,
		instrumentId: n
	});
	let r = e.voices[t];
	r && (r.instrumentId = n, r.gate = -1);
}
function up(e, t, n) {
	if (!e.backend || n.length === 0) return;
	let r = n.map(([e, n]) => [
		t,
		e,
		n
	]);
	e.backend.send({
		type: "params",
		changes: r
	});
}
function dp(e, t) {
	e.backend?.send({
		type: "voice_active",
		voiceId: t,
		active: !0
	});
}
function fp(e, t) {
	e.backend?.send({
		type: "voice_active",
		voiceId: t,
		active: !1
	}), e.voices[t] = null;
}
function pp(e) {
	if (e.voiceFree.length === 0) return e.warnedVoiceFull ||= (console.warn("audio: voice pool full (64)"), !0), -1;
	let t = e.voiceFree.pop();
	return e.voiceGen[t]++, e.voices[t] = {
		instrumentId: -1,
		gate: -1
	}, dp(e, t), t;
}
function mp(e, t) {
	e.voices[t] && (fp(e, t), e.idleCallbacks.delete(t), e.voiceFree.push(t), e.warnedVoiceFull = !1);
}
function hp(e, t) {
	return e.voiceGen[t];
}
function gp(e, t, n) {
	e.idleCallbacks.set(t, n), e.idleWatchGen.set(t, e.voiceGen[t]), e.backend?.send({
		type: "watch_idle",
		voiceId: t
	});
}
function _p(e, t, n, r, i, a, o, s) {
	if (e.spatialLen + 7 > e.spatialBatch.length) {
		e.warnedSpatialFull ||= (console.warn("audio: spatial batch full"), !0);
		return;
	}
	e.spatialBatch[e.spatialLen++] = t, e.spatialBatch[e.spatialLen++] = n, e.spatialBatch[e.spatialLen++] = r, e.spatialBatch[e.spatialLen++] = i, e.spatialBatch[e.spatialLen++] = a, e.spatialBatch[e.spatialLen++] = o, e.spatialBatch[e.spatialLen++] = s;
}
function vp(e) {
	!e.backend || e.spatialLen === 0 || (e.backend.send({
		type: "spatial",
		data: e.spatialBatch,
		len: e.spatialLen
	}), e.spatialLen = 0);
}
function yp(e, t, n) {
	e.backend?.send({
		type: "voice_spatial",
		voiceId: t,
		spatial: n
	});
}
function bp(e, t) {
	e.backend?.send({
		type: "voice_one_shot",
		voiceId: t
	});
}
function xp(e, t, n) {
	let r = kf.get(n);
	r && (cp(e, n, r), lp(e, t, n), up(e, t, Mf(n)));
}
//#endregion
//#region ../../shallot/packages/shallot/src/standard/audio/index.ts
var Sp = N(Float32Array, 5, 0), Z = {
	instrument: F(Sp, 5, 0),
	loop: F(Sp, 5, 1),
	volume: F(Sp, 5, 2),
	pitch: F(Sp, 5, 3),
	spatial: F(Sp, 5, 4)
};
P(Z, {
	defaults: () => ({
		loop: 0,
		volume: 1,
		pitch: 0,
		spatial: 0
	}),
	parse: { instrument: (e) => kf.getByName(e) }
});
var Cp = {};
P(Cp, { requires: [V] });
function wp(e, t, n) {
	let r = -1, i = Infinity;
	for (let [n, a] of t.voices) {
		let t = hp(e, a.slot);
		t < i && (i = t, r = n);
	}
	r < 0 || (console.warn("audio: voice pool full, evicting oldest voice"), mp(e, t.voices.get(r).slot), t.voices.delete(r), t.systemRemovals.add(r), n.entityExists(r) && (n.hasComponent(r, Z) && n.removeComponent(r, Z), n.removeEntity(r)));
}
function Tp(e, t, n, r) {
	let i = pp(t);
	if (i === -1 && (wp(t, n, r), i = pp(t), i === -1)) return !1;
	let a = Z.instrument[e];
	xp(t, i, a), yp(t, i, Z.spatial[e] === 1), op(t, i, 1);
	let o = kf.get(a), s = -1, c = 1, l = [];
	if (o) {
		let e = jf(a);
		if (o.volumeParam && (s = o.paramLayout.get(o.volumeParam) ?? -1, e && (c = e.get(o.volumeParam) ?? 1)), o.pitchParams) for (let t of o.pitchParams) {
			let n = o.paramLayout.get(t) ?? -1;
			if (n >= 0) {
				let r = e?.get(t) ?? 440, i = t.slice(0, t.indexOf(".")), a = e?.get(`${i}.octave`) ?? 0, o = e?.get(`${i}.semitone`) ?? 0, s = e?.get(`${i}.fine`) ?? 0;
				l.push({
					offset: n,
					baseFreq: r,
					octave: a,
					semitone: o,
					fine: s
				});
			}
		}
	}
	return n.voices.set(e, {
		slot: i,
		volumeOffset: s,
		baseVolume: c,
		pitchEntries: l
	}), Z.loop[e] === 0 && (bp(t, i), gp(t, i, () => {
		mp(t, i), n.voices.delete(e), n.systemRemovals.add(e), r.entityExists(e) && (r.hasComponent(e, Z) && r.removeComponent(e, Z), r.removeEntity(e));
	})), !0;
}
Xt([
	Li,
	Wr,
	fn,
	Mr,
	Zs,
	xf,
	{
		name: "Audio",
		systems: [{
			group: "simulation",
			update(e) {
				let t = Xf.from(e);
				if (!t || !ep(t)) return;
				np(t);
				let n = Zf.from(e);
				if (!n) return;
				if (!tp(t)) {
					for (let t of n.pending) {
						if (!e.hasComponent(t, Z)) {
							n.pending.delete(t);
							continue;
						}
						Z.loop[t] === 0 && (n.pending.delete(t), n.systemRemovals.add(t), e.entityExists(t) && (e.hasComponent(t, Z) && e.removeComponent(t, Z), e.removeEntity(t)));
					}
					return;
				}
				for (let r of n.pending) {
					if (!e.hasComponent(r, Z)) {
						n.pending.delete(r);
						continue;
					}
					if (Tp(r, t, n, e)) n.pending.delete(r);
					else break;
				}
				for (let [e, r] of n.voices) {
					if (r.volumeOffset >= 0) {
						let n = Z.volume[e];
						sp(t, r.slot, r.volumeOffset, n * n * r.baseVolume);
					}
					for (let n of r.pitchEntries) {
						let i = If(n.baseFreq, n.octave, Z.pitch[e] + n.semitone, n.fine);
						sp(t, r.slot, n.offset, i);
					}
				}
				let r = e.only([Cp, Fi]);
				if (r >= 0) {
					let i = Fi.data, a = r * 16, o = i[a + 12], s = i[a + 13], c = i[a + 14], l = i[a], u = i[a + 1], d = i[a + 2], f = i[a + 4], p = i[a + 5], m = i[a + 6], h = i[a + 8], g = i[a + 9], _ = i[a + 10];
					for (let [r, a] of n.voices) {
						if (Z.spatial[r] !== 1 || !e.hasComponent(r, Fi)) continue;
						let n = r * 16, { azimuth: v, elevation: y, distance: b } = Yf(i[n + 12] - o, i[n + 13] - s, i[n + 14] - c, l, u, d, f, p, m, h, g, _);
						_p(t, a.slot, v, y, b, 3, 100, 1);
					}
					vp(t);
				}
			},
			dispose(e) {
				let t = Xf.from(e), n = Zf.from(e);
				if (t && n) {
					for (let [, e] of n.voices) op(t, e.slot, 0), mp(t, e.slot);
					n.voices.clear(), n.pending.clear(), n.systemRemovals.clear();
				}
				t && rp(t);
			}
		}],
		components: {
			Sound: Z,
			Listener: Cp
		},
		async initialize(e) {
			let t = Qf();
			e.setResource(Xf, t);
			let n = {
				voices: /* @__PURE__ */ new Map(),
				pending: /* @__PURE__ */ new Set(),
				systemRemovals: /* @__PURE__ */ new Set()
			};
			e.setResource(Zf, n), e.observe(c(Z), (e) => {
				n.pending.add(e);
			}), e.observe(l(Z), (e) => {
				if (n.systemRemovals.has(e)) {
					n.systemRemovals.delete(e);
					return;
				}
				n.pending.delete(e);
				let r = n.voices.get(e);
				r && (n.voices.delete(e), op(t, r.slot, 0), gp(t, r.slot, () => {
					mp(t, r.slot);
				}));
			});
			try {
				await $f(t);
			} catch {
				t.backend = null;
			}
		}
	},
	Ru,
	Gu
]), Zt(Of);
//#endregion
//#region ../../shallot/packages/shallot/src/extras/raytracing/bvh/structs.ts
var Ep = "\nstruct BVHNode {\n    c0_minX: f32, c0_minY: f32, c0_minZ: f32, child0: u32,\n    c0_maxX: f32, c0_maxY: f32, c0_maxZ: f32, _pad0: u32,\n    c1_minX: f32, c1_minY: f32, c1_minZ: f32, child1: u32,\n    c1_maxX: f32, c1_maxY: f32, c1_maxZ: f32, _pad1: u32,\n    c2_minX: f32, c2_minY: f32, c2_minZ: f32, child2: u32,\n    c2_maxX: f32, c2_maxY: f32, c2_maxZ: f32, _pad2: u32,\n    c3_minX: f32, c3_minY: f32, c3_minZ: f32, child3: u32,\n    c3_maxX: f32, c3_maxY: f32, c3_maxZ: f32, _pad3: u32,\n}", Dp = 1e-7, Op = 1e-10, kp = "\nstruct BLASNode {\n    minX: f32, minY: f32, minZ: f32, leftChild: u32,\n    maxX: f32, maxY: f32, maxZ: f32, rightChild: u32,\n}", Ap = "\nstruct BLASTriangle {\n    v0: vec3<f32>, _pad0: u32,\n    e1: vec3<f32>, _pad1: u32,\n    e2: vec3<f32>, _pad2: u32,\n    n0_enc: u32, n1_enc: u32, n2_enc: u32, _pad3: u32,\n}", jp = "\nstruct Ray {\n    origin: vec3<f32>,\n    direction: vec3<f32>,\n}", Mp = "\nstruct HitResult {\n    hit: bool,\n    t: f32,\n    entityId: u32,\n    u: f32,\n    v: f32,\n    normal: vec3<f32>,\n    worldPos: vec3<f32>,\n}", Np = "\nfn octDecode(enc: u32) -> vec3<f32> {\n    let x = f32(enc & 0xFFFFu) / 65535.0 * 2.0 - 1.0;\n    let y = f32(enc >> 16u) / 65535.0 * 2.0 - 1.0;\n    let z = 1.0 - abs(x) - abs(y);\n    var n: vec3<f32>;\n    if (z < 0.0) {\n        let signX = select(-1.0, 1.0, x >= 0.0);\n        let signY = select(-1.0, 1.0, y >= 0.0);\n        n = vec3<f32>((1.0 - abs(y)) * signX, (1.0 - abs(x)) * signY, z);\n    } else {\n        n = vec3<f32>(x, y, z);\n    }\n    return normalize(n);\n}", Pp = 256;
`${Ln}${Pp}`, `${Un}${Ep}${Wn}${Gn}${Pp}`;
//#endregion
//#region ../../shallot/packages/shallot/src/extras/raytracing/bvh/refit.ts
var Fp = 64;
`${Ap}${Fp}`, `${Ap}${Wn}${Fp}`, `${Un}`, `${Gn}${Op}`;
//#endregion
//#region ../../shallot/packages/shallot/src/extras/raytracing/bvh/traverse.ts
var Ip = `
${Ep}

${Wn}
${Gn}
const INVALID_NODE: u32 = 0xFFFFFFFFu;
const MAX_STACK_DEPTH: u32 = 24u;

${Np}
`, Lp = `
${kp}
${Ap}
`;
`${Op}`, I("bvh"), `${jp}${Mp}${Oa}${Aa}${Ip}${Lp}${Dp}`, P({
	width: [],
	height: []
}, { defaults: () => ({
	width: 0,
	height: 480
}) });
//#endregion
//#region ../../shallot/packages/shallot/src/extras/orbit/index.ts
var Rp = Math.PI * 2, zp = Math.PI / 2, Bp = Math.PI / 180, Q = {
	yaw: [],
	pitch: [],
	distance: [],
	size: [],
	minPitch: [],
	maxPitch: [],
	minDistance: [],
	maxDistance: [],
	minSize: [],
	maxSize: [],
	smoothness: [],
	sensitivity: [],
	zoomSpeed: [],
	orbitButton: [],
	panButton: [],
	panX: [],
	panY: [],
	panZ: [],
	flySpeed: [],
	flyActive: [],
	suppress: []
};
P(Q, {
	requires: [V],
	defaults: () => ({
		yaw: Math.PI / 6,
		pitch: Math.PI / 9,
		distance: 10,
		size: 5,
		minPitch: -zp + .01,
		maxPitch: zp - .01,
		minDistance: 1,
		maxDistance: 30,
		minSize: .5,
		maxSize: 50,
		smoothness: .3,
		sensitivity: .005,
		zoomSpeed: .025,
		orbitButton: 0,
		panButton: 2,
		panX: 0,
		panY: 0,
		panZ: 0,
		flySpeed: 5,
		flyActive: 0,
		suppress: 0
	})
});
var $ = {
	yaw: [],
	pitch: [],
	distance: [],
	size: []
};
function Vp(e, t) {
	return 1 - (1 - Math.max(0, Math.min(1, e))) ** (t * 60);
}
function Hp(e) {
	return (e % Rp + Rp) % Rp;
}
function Up(e, t) {
	let n = Hp(t - e);
	return n > Math.PI ? n - Rp : n;
}
function Wp(e, t) {
	return t === 0 ? e.left : t === 1 ? e.middle : e.right;
}
function Gp(e) {
	return e.isKeyDown("KeyW") || e.isKeyDown("KeyS") || e.isKeyDown("KeyA") || e.isKeyDown("KeyD") || e.isKeyDown("KeyQ") || e.isKeyDown("KeyE");
}
var Kp = {
	name: "Orbit",
	systems: [{
		group: "simulation",
		annotations: { mode: "always" },
		update(e) {
			let t = Nr.from(e), n = e.time.deltaTime;
			for (let t of e.query([Q, h($)])) e.addComponent(t, $), $.yaw[t] = Q.yaw[t], $.pitch[t] = Q.pitch[t], $.distance[t] = Q.distance[t], $.size[t] = Q.size[t];
			for (let t of e.query([h(Q), $])) e.removeComponent(t, $);
			for (let r of e.query([
				Q,
				$,
				V
			])) {
				let i = Q.sensitivity[r], a = Q.zoomSpeed[r], o = Q.minPitch[r], s = Q.maxPitch[r], c = Q.smoothness[r], l = e.hasComponent(r, U), u = l && U.mode[r] === ea.Orthographic, d = e.getFirstRelationTarget(r, ha) >= 0, f = d && !!t && Gp(t);
				if (!Q.suppress[r] && d && t && Wp(t.mouse, Q.orbitButton[r]) && (Q.yaw[r] -= t.mouse.deltaX * i, Q.pitch[r] = Me(Q.pitch[r] + t.mouse.deltaY * i, o, s)), !f && d && t && Wp(t.mouse, Q.panButton[r])) {
					let e = $.yaw[r], n = $.pitch[r], i = Q.distance[r], a = Math.cos(e), o = Math.sin(e), s = Math.cos(n), c = Math.sin(n), d = a, f = -o, p = -c * o, m = s, h = -c * a, g;
					if (u) g = U.size[r] * 2 / t.mouse.canvasHeight;
					else {
						let e = l ? U.fov[r] * Bp : 60 * Bp;
						g = 2 * i * Math.tan(e * .5) / t.mouse.canvasHeight;
					}
					let _ = t.mouse.deltaX * g, v = t.mouse.deltaY * g;
					Q.panX[r] += v * p - _ * d, Q.panY[r] += v * m, Q.panZ[r] += v * h - _ * f;
				}
				if (d && t && t.mouse.scroll !== 0) if (u) {
					let e = Q.size[r], n = Math.max(.1, e * .08), i = t.mouse.scroll * a * n;
					Q.size[r] = Me(e + i, Q.minSize[r], Q.maxSize[r]);
				} else {
					let e = Q.distance[r], n = Math.max(.3, e * .08), i = t.mouse.scroll * a * n;
					Q.distance[r] = Me(e + i, Q.minDistance[r], Q.maxDistance[r]);
				}
				let p = Vp(c, n);
				if ($.yaw[r] += Up($.yaw[r], Q.yaw[r]) * p, $.pitch[r] += (Q.pitch[r] - $.pitch[r]) * p, $.distance[r] += (Q.distance[r] - $.distance[r]) * p, u && ($.size[r] += (Q.size[r] - $.size[r]) * p, U.size[r] = $.size[r]), f) {
					Q.flyActive[r] = 1;
					let e = Q.flySpeed[r] * n, i = $.yaw[r], a = -$.pitch[r], o = Math.cos(i), s = Math.sin(i), c = Math.cos(a), l = Math.sin(a), u = 0, d = 0, f = 0;
					t.isKeyDown("KeyW") && --d, t.isKeyDown("KeyS") && (d += 1), t.isKeyDown("KeyA") && --u, t.isKeyDown("KeyD") && (u += 1), t.isKeyDown("KeyQ") && --f, t.isKeyDown("KeyE") && (f += 1), V.posX[r] += (d * s * c + u * o) * e, V.posY[r] += (f - d * l) * e, V.posZ[r] += (d * o * c - u * s) * e;
					let p = i * .5, m = a * .5, h = Math.sin(p), g = Math.cos(p), _ = Math.sin(m), v = Math.cos(m);
					V.quatX[r] = g * _, V.quatY[r] = h * v, V.quatZ[r] = -h * _, V.quatW[r] = g * v;
				} else {
					if (Q.flyActive[r]) {
						Q.flyActive[r] = 0;
						let t = $.yaw[r], n = $.pitch[r], i = $.distance[r], a = 0, o = 0, s = 0, c = e.getFirstRelationTarget(r, pe);
						c >= 0 && e.hasComponent(c, V) && (a = V.posX[c], o = V.posY[c], s = V.posZ[c]), Q.panX[r] = V.posX[r] - i * Math.cos(n) * Math.sin(t) - a, Q.panY[r] = V.posY[r] - i * Math.sin(n) - o, Q.panZ[r] = V.posZ[r] - i * Math.cos(n) * Math.cos(t) - s;
					}
					let t = Q.panX[r], n = Q.panY[r], i = Q.panZ[r], a = e.getFirstRelationTarget(r, pe);
					a >= 0 && e.hasComponent(a, V) && (t += V.posX[a], n += V.posY[a], i += V.posZ[a]);
					let o = $.yaw[r], s = $.pitch[r], c = $.distance[r], l = t + c * Math.cos(s) * Math.sin(o), u = n + c * Math.sin(s), d = i + c * Math.cos(s) * Math.cos(o);
					V.posX[r] = l, V.posY[r] = u, V.posZ[r] = d;
					let f = Ue(l, u, d, t, n, i);
					V.quatX[r] = f.x, V.quatY[r] = f.y, V.quatZ[r] = f.z, V.quatW[r] = f.w;
				}
			}
		}
	}],
	components: { Orbit: Q },
	relations: [pe],
	dependencies: [Wr]
}, qp = N(Float32Array, 12, 0), Jp = {
	offsetX: F(qp, 12, 0),
	offsetY: F(qp, 12, 1),
	offsetZ: F(qp, 12, 2),
	thickness: F(qp, 12, 3),
	visible: F(qp, 12, 4),
	overdraw: F(qp, 12, 5),
	opacity: F(qp, 12, 7),
	color: ht(qp, 12, 8),
	colorR: F(qp, 12, 8),
	colorG: F(qp, 12, 9),
	colorB: F(qp, 12, 10)
};
P(Jp, {
	requires: [V],
	defaults: () => ({
		offsetX: 1,
		offsetY: 0,
		offsetZ: 0,
		thickness: 2,
		visible: 1,
		opacity: 1,
		color: 16777215
	}),
	format: { color: S }
}), `${Oa}`, I("lines"), N(Uint32Array, 1, 0), N(Uint32Array, 1, 0);
//#endregion
//#region ../../shallot/packages/shallot/src/extras/arrows/index.ts
var Yp = N(Float32Array, 4, 0);
P({
	start: F(Yp, 4, 0),
	end: F(Yp, 4, 1),
	size: F(Yp, 4, 2)
}, {
	requires: [Jp],
	defaults: () => ({
		start: 0,
		end: 1,
		size: 1
	})
}), `${Oa}`, I("arrows"), N(Uint32Array, 2, 0);
var Xp = We(64), Zp = N(Float32Array, 12, 0), Qp = N(Uint32Array, 1, 0), $p = /* @__PURE__ */ new Map();
function em() {
	return new Proxy({}, {
		get(e, t) {
			let n = Number(t);
			if (!Number.isNaN(n)) return $p.get(n);
		},
		set(e, t, n) {
			let r = Number(t);
			return Number.isNaN(r) ? !1 : (n == null ? $p.delete(r) : $p.set(r, n), !0);
		}
	});
}
P({
	content: em(),
	font: F(Qp, 1, 0),
	fontSize: F(Zp, 12, 0),
	opacity: F(Zp, 12, 1),
	visible: F(Zp, 12, 2),
	anchorX: F(Zp, 12, 3),
	anchorY: F(Zp, 12, 4),
	color: ht(Zp, 12, 8),
	colorR: F(Zp, 12, 8),
	colorG: F(Zp, 12, 9),
	colorB: F(Zp, 12, 10)
}, {
	requires: [V],
	defaults: () => ({
		font: 0,
		fontSize: 1,
		opacity: 1,
		visible: 1,
		anchorX: 0,
		anchorY: 0,
		color: 16777215
	}),
	parse: { font: Xp.getByName },
	format: { color: S }
}), `${Oa}`, I("glyphs"), P({
	azimuth: [],
	elevation: [],
	skyColor: [],
	horizonColor: []
}, { defaults: () => ({
	azimuth: 37,
	elevation: 45,
	skyColor: 0,
	horizonColor: 0
}) });
//#endregion
//#region ../../shallot/packages/shallot/src/extras/tween/easing.ts
var tm = {
	linear: 0,
	"ease-in-quad": 1,
	"ease-out-quad": 2,
	"ease-in-out-quad": 3,
	"ease-in-cubic": 4,
	"ease-out-cubic": 5,
	"ease-in-out-cubic": 6,
	"ease-in-quart": 7,
	"ease-out-quart": 8,
	"ease-in-out-quart": 9,
	"ease-in-quint": 10,
	"ease-out-quint": 11,
	"ease-in-out-quint": 12,
	"ease-in-sine": 13,
	"ease-out-sine": 14,
	"ease-in-out-sine": 15,
	"ease-in-expo": 16,
	"ease-out-expo": 17,
	"ease-in-out-expo": 18,
	"ease-in-circ": 19,
	"ease-out-circ": 20,
	"ease-in-out-circ": 21,
	"ease-in-back": 22,
	"ease-out-back": 23,
	"ease-in-out-back": 24,
	"ease-in-elastic": 25,
	"ease-out-elastic": 26,
	"ease-in-out-elastic": 27,
	"ease-in-bounce": 28,
	"ease-out-bounce": 29,
	"ease-in-out-bounce": 30
};
function nm(e) {
	return tm[e] ?? 0;
}
P({ duration: [] }, { defaults: () => ({ duration: .5 }) });
var rm = {
	Idle: 0,
	Playing: 1,
	Complete: 2
};
P({
	state: [],
	elapsed: [],
	duration: []
}, {
	defaults: () => ({
		state: rm.Idle,
		elapsed: 0,
		duration: 0
	}),
	enums: { state: rm }
}), P({ loop: [] }, { defaults: () => ({ loop: 0 }) });
//#endregion
//#region ../../shallot/packages/shallot/src/extras/tween/tween.ts
var im = {
	Idle: 0,
	Playing: 1,
	Complete: 2
}, am = /* @__PURE__ */ new Map();
function om() {
	return new Proxy({}, {
		get(e, t) {
			let n = Number(t);
			if (!Number.isNaN(n)) return am.get(n);
		},
		set(e, t, n) {
			let r = Number(t);
			return Number.isNaN(r) ? !1 : (n == null ? am.delete(r) : am.set(r, n), !0);
		}
	});
}
P({
	state: [],
	to: [],
	duration: [],
	elapsed: [],
	easing: [],
	field: om()
}, {
	defaults: () => ({
		state: im.Idle,
		to: 0,
		duration: 1,
		elapsed: 0,
		easing: 0
	}),
	parse: { easing: nm },
	enums: { state: im }
}), P({ grid: [] }, { defaults: () => ({ grid: 1 }) }), `${Oa}`, I("outline"), `${Yi}`, P({
	step: [],
	target: []
}, { defaults: () => ({
	step: 0,
	target: 0
}) }), P({
	from: [],
	to: []
}, { defaults: () => ({
	from: 0,
	to: 0
}) });
//#endregion
//#region ../../shallot/packages/shallot/src/extras/acoustics/material.ts
var sm = N(Float32Array, 8, 0);
function cm(e, t, n, r, i, a, o) {
	return {
		absorptionLow: e,
		absorptionMid: t,
		absorptionHigh: n,
		scattering: r,
		transmissionLow: i,
		transmissionMid: a,
		transmissionHigh: o
	};
}
var lm = [
	cm(.1, .2, .3, .05, .1, .05, .03),
	cm(.03, .04, .07, .05, .015, .015, .015),
	cm(.05, .07, .08, .05, .015, .002, .001),
	cm(.01, .02, .02, .05, .06, .044, .011),
	cm(.6, .7, .8, .05, .031, .012, .008),
	cm(.24, .69, .73, .05, .02, .005, .003),
	cm(.06, .03, .02, .05, .06, .044, .011),
	cm(.12, .06, .04, .05, .056, .056, .004),
	cm(.11, .07, .06, .05, .07, .014, .005),
	cm(.2, .07, .06, .05, .2, .025, .01),
	cm(.13, .2, .24, .05, .015, .002, .001)
], um = {
	Generic: 0,
	Brick: 1,
	Concrete: 2,
	Ceramic: 3,
	Gravel: 4,
	Carpet: 5,
	Glass: 6,
	Plaster: 7,
	Wood: 8,
	Metal: 9,
	Rock: 10
};
function dm(e, t) {
	let n = lm[t];
	if (!n) return;
	let r = sm.chunks[e >>> 12], i = (e & qe) * 8;
	r[i] = n.absorptionLow, r[i + 1] = n.absorptionMid, r[i + 2] = n.absorptionHigh, r[i + 3] = n.scattering, r[i + 4] = n.transmissionLow, r[i + 5] = n.transmissionMid, r[i + 6] = n.transmissionHigh, r[i + 7] = t;
}
P({
	preset: new Proxy([], {
		set(e, t, n) {
			if (typeof t == "string") {
				let e = Number(t);
				e >= 0 && dm(e, n);
			}
			return Reflect.set(e, t, n);
		},
		get(e, t) {
			if (typeof t == "string") {
				let e = Number(t);
				if (e >= 0) return sm.chunks[e >>> 12][(e & qe) * 8 + 7];
			}
			return Reflect.get(e, t);
		}
	}),
	absorptionLow: F(sm, 8, 0),
	absorptionMid: F(sm, 8, 1),
	absorptionHigh: F(sm, 8, 2),
	scattering: F(sm, 8, 3),
	transmissionLow: F(sm, 8, 4),
	transmissionMid: F(sm, 8, 5),
	transmissionHigh: F(sm, 8, 6)
}, {
	defaults: () => ({ preset: um.Generic }),
	enums: { preset: um }
});
var fm = 44100, pm = Math.floor(.01 * fm), mm = 8 * pm;
new Float32Array(mm);
var hm = [];
{
	for (let e = 0; e < 3; e++) {
		let t = new Float32Array(mm), n = 305419896 + e * 2654435769;
		for (let e = 0; e < mm; e++) n ^= n << 13, n ^= n >>> 17, n ^= n << 5, t[e] = (n >>> 0) / 4294967295 * 2 - 1;
		hm.push(t);
	}
	let e = (e) => 1 - Math.exp(-2 * Math.PI * e / fm), t = e(800), n = e(8e3);
	for (let e = 0; e < 3; e++) {
		let r = hm[e], i = 0, a = 0;
		for (let o = 0; o < r.length; o++) {
			let s = r[o];
			i += t * (s - i), a += n * (s - a), e === 0 ? r[o] = i : e === 1 ? r[o] = a - i : r[o] = s - a;
		}
	}
}
1 / pm, `${bl}${Un}${Wn}${Kn}${Gn}${Sl}${Cl}`, `${bl}${Un}${Wn}${Kn}${Gn}${Sl}${Cl}`, P({}, {}), I("acoustics-occlusion"), I("acoustics-reflection"), P({
	intensity: [],
	threshold: [],
	radius: []
}, { defaults: () => ({
	intensity: .2,
	threshold: .8,
	radius: .5
}) }), P({
	intensity: [],
	ghosts: [],
	dispersal: [],
	haloRadius: [],
	chromatic: [],
	starburst: []
}, { defaults: () => ({
	intensity: .1,
	ghosts: 4,
	dispersal: .3,
	haloRadius: .6,
	chromatic: .01,
	starburst: .1
}) }), P({
	intensity: [],
	samples: [],
	decay: [],
	density: []
}, { defaults: () => ({
	intensity: .2,
	samples: 32,
	decay: .97,
	density: 1
}) }), I("readback");
//#endregion
//#region src/main.ts
var gm = null, _m = !1, vm = -1;
function ym(e) {
	if (vm >= 0 && e.entityExists(vm)) return vm;
	for (let t of e.query([U])) return vm = t, t;
	return -1;
}
function bm(e) {
	if (typeof e == "number") return e & 16777215;
	let t = e.trim();
	if (t.startsWith("#")) return parseInt(t.slice(1), 16) & 16777215;
	if (t.startsWith("0x")) return parseInt(t.slice(2), 16) & 16777215;
	let n = xm[t.toLowerCase()];
	return n === void 0 ? 16777215 : n;
}
var xm = {
	white: 16777215,
	black: 0,
	red: 16711680,
	green: 65280,
	blue: 255,
	yellow: 16776960,
	cyan: 65535,
	magenta: 16711935,
	gray: 8421504,
	grey: 8421504,
	orange: 16753920,
	purple: 8388736,
	pink: 16761035,
	tomato: 16737095,
	deepskyblue: 49151,
	hotpink: 16738740,
	limegreen: 3329330,
	gold: 16766720,
	saddlebrown: 9127187,
	crimson: 14423100
};
function Sm(e) {
	if (e.length === 1) {
		let t = e.toUpperCase();
		if (t >= "A" && t <= "Z") return "Key" + t;
		if (t >= "0" && t <= "9") return "Digit" + t;
	}
	let t = e.toLowerCase();
	return t === "space" || t === " " ? "Space" : t === "enter" ? "Enter" : t === "shift" ? "ShiftLeft" : t === "left" ? "ArrowLeft" : t === "right" ? "ArrowRight" : t === "up" ? "ArrowUp" : t === "down" ? "ArrowDown" : e;
}
function Cm(e, t) {
	let n = {
		pos: [
			"posX",
			"posY",
			"posZ"
		],
		rot: [
			"rotX",
			"rotY",
			"rotZ"
		],
		scale: [
			"scaleX",
			"scaleY",
			"scaleZ"
		]
	}[t];
	return {
		get x() {
			return V[n[0]][e];
		},
		set x(t) {
			V[n[0]][e] = t;
		},
		get y() {
			return V[n[1]][e];
		},
		set y(t) {
			V[n[1]][e] = t;
		},
		get z() {
			return V[n[2]][e];
		},
		set z(t) {
			V[n[2]][e] = t;
		}
	};
}
var wm = class {
	eid;
	constructor() {
		if (!gm) throw Error("shPlay not ready — create entities inside setup() or draw()");
		this.eid = gm.addEntity(), gm.addComponent(this.eid, V);
	}
	get position() {
		return Cm(this.eid, "pos");
	}
	get rotation() {
		return Cm(this.eid, "rot");
	}
	get scale() {
		return Cm(this.eid, "scale");
	}
}, Tm = class extends wm {
	constructor(e, t, n, r) {
		super(), gm.addComponent(this.eid, K), V.posX[this.eid] = e, V.posY[this.eid] = t, V.posZ[this.eid] = n, K.shape[this.eid] = r, K.color[this.eid] = 16777215;
	}
	set color(e) {
		K.color[this.eid] = bm(e);
	}
	get color() {
		return K.color[this.eid];
	}
	set size(e) {
		K.sizeX[this.eid] = e, K.sizeY[this.eid] = e, K.sizeZ[this.eid] = e;
	}
}, Em = class extends Tm {
	constructor(e = 0, t = 0, n = 0) {
		super(e, t, n, 0);
	}
}, Dm = class extends Tm {
	constructor(e = 0, t = 0, n = 0) {
		super(e, t, n, 1);
	}
}, Om = class extends Tm {
	constructor(e = 0, t = 0, n = 0) {
		super(e, t, n, 3);
	}
}, km = {
	pressing(e) {
		let t = gm?.getResource(Nr);
		return t ? t.isKeyDown(Sm(e)) : !1;
	},
	presses(e) {
		let t = gm?.getResource(Nr);
		return t ? t.isKeyPressed(Sm(e)) : !1;
	},
	releases(e) {
		let t = gm?.getResource(Nr);
		return t ? t.isKeyReleased(Sm(e)) : !1;
	}
};
function Am(e) {
	if (!gm) return;
	let t = ym(gm);
	t < 0 || (U.clearColor[t] = bm(e));
}
function jm(e) {
	let t = e.addEntity();
	e.addComponent(t, V), e.addComponent(t, U), e.addComponent(t, ta), e.addComponent(t, Q), Q.distance[t] = 8, Q.pitch[t] = Math.PI / 8, vm = t;
	let n = e.addEntity();
	e.addComponent(n, V), e.addComponent(n, Ri);
	let r = e.addEntity();
	e.addComponent(r, V), e.addComponent(r, H), H.directionX[r] = -.5, H.directionY[r] = -.7, H.directionZ[r] = -.5;
}
var Mm = 0, Nm = {
	name: "ShPlay",
	systems: [{
		group: "simulation",
		update(e) {
			if (gm = e, Mm++, !_m) {
				_m = !0, jm(e);
				let t = window;
				if (typeof t.setup == "function") try {
					t.setup();
				} catch (e) {
					console.error("setup() error:", e);
				}
			}
			let t = window;
			if (typeof t.draw == "function") try {
				t.draw();
			} catch (e) {
				console.error("draw() error:", e);
			}
		}
	}]
};
async function Pm() {
	await $t({ plugins: [Kp, Nm] });
}
var Fm = window;
Fm.Cube = Em, Fm.Sphere = Dm, Fm.Plane = Om, Fm.kb = km, Fm.background = Am, Fm.shplay = {
	boot: Pm,
	_debug: () => ({
		tickCount: Mm,
		hasState: !!gm,
		userSetupRan: _m,
		activeCamera: vm,
		entityCount: gm ? gm.getAllEntities().length : 0
	})
};
//#endregion
export { Pm as boot };

//# sourceMappingURL=shplay.js.map