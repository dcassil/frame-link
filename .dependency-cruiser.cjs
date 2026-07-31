/** @type {import('dependency-cruiser').IConfiguration} */
// Path-based mirror of the eslint-plugin-boundaries layering for frame-link:
//   public : src/index.ts, src/frame-link.ts   (composition root + public barrel)
//   core   : src/core/**
//   types  : src/types/**
//   utils  : src/utils/**
// Allowed edges: public->core,types ; core->types,utils ; types->types ; utils->(leaf).
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies are not allowed in the source graph.",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment: "Local imports must be resolvable.",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-orphans",
      severity: "error",
      comment:
        "Every source module must be reachable from the public entry graph (no dead modules).",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)index\\.ts$",
          "\\.d\\.ts$",
          "(^|/)(__tests__|coverage|dist)(/|$)",
          "\\.spec\\.ts$",
          "\\.test\\.ts$",
        ],
      },
      to: {},
    },
    {
      name: "core-not-to-public",
      severity: "error",
      comment:
        "Boundary: 'core' must never import the public entry (src/index.ts or src/frame-link.ts).",
      from: { path: "^src/core/" },
      to: { path: "^src/(index|frame-link)\\.ts$" },
    },
    {
      name: "types-is-a-leaf",
      severity: "error",
      comment:
        "Boundary: 'types' is a leaf contract layer; it may only import other types.",
      from: { path: "^src/types/" },
      to: { path: "^src/(core|utils)/|^src/(index|frame-link)\\.ts$" },
    },
    {
      name: "utils-is-a-leaf",
      severity: "error",
      comment:
        "Boundary: 'utils' is a pure leaf; it may not import any other layer.",
      from: { path: "^src/utils/" },
      to: { path: "^src/(core|types)/|^src/(index|frame-link)\\.ts$" },
    },
    {
      name: "public-only-core-and-types",
      severity: "error",
      comment:
        "Boundary: the public entry may only reach 'core' and 'types', never 'utils' directly.",
      from: { path: "^src/(index|frame-link)\\.ts$" },
      to: { path: "^src/utils/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "(^|/)(__tests__|coverage|dist)(/|$)|\\.spec\\.ts$|\\.test\\.ts$",
    },
    // Follow type-only edges too, so `export type { ... }` re-exports from the
    // types barrel are counted (otherwise pure-type modules look orphaned).
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    moduleSystems: ["es6", "cjs"],
    reporterOptions: { text: { highlightFocused: true } },
  },
};
