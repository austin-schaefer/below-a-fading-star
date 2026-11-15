// The world's own record of which module made which root objects: name -> Set of the objects the module
// added to the scene through its ctx. Filled where a module is built (perf.js forModule, called by main.js);
// read by shadows.js (the living casters), v12/far.js (the stand-ins) and perf.js (its switches and memory
// counts) as ctx.modules. Insertion order is build order. Only modules built through forModule are here;
// what no module made (terrain, sky, the player) is in none of them.
export function createModuleRegistry() {
  const roots = new Map();
  return {
    // the root objects of `name`, created empty on first use
    of(name) { let s = roots.get(name); if (!s) { s = new Set(); roots.set(name, s); } return s; },
    add(name, ...objs) { const s = this.of(name); for (const o of objs) s.add(o); },
    has: (name) => roots.has(name),
    names: () => [...roots.keys()],
    [Symbol.iterator]: () => roots.entries(), // [name, Set<Object3D>]
  };
}
