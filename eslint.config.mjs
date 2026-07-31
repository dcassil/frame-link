import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MODULE BOUNDARY SCHEME (eslint-plugin-boundaries) — frame-link transport core
 * ─────────────────────────────────────────────────────────────────────────────
 * Elements (layers), matched top-down against `src/`:
 *   - public : src/index.ts, src/frame-link.ts   (composition root + public barrel)
 *   - core   : src/core/**                        (connection/handshake/dispatch/transport/state)
 *   - types  : src/types/**                       (wire protocol + registry contracts)
 *   - utils  : src/utils/**                       (pure leaf helpers, e.g. id generation)
 *
 * Allowed edges (everything else disallowed, no cycles):
 *   public -> core, types            (public entry is the only cross-module surface)
 *   core   -> types, utils
 *   types  -> types                  (intra-layer only)
 *   utils  -> (nothing)              (pure leaf)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "dist-test/**",
      "coverage/**",
      "node_modules/**",
      "*.config.js",
      "*.config.cjs",
      "*.config.mjs",
      "babel.config.js",
      ".dependency-cruiser.cjs",
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  // SOURCE CORE: full strict guard-rails (the published package under src/)
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["src/**/*.ts"],
    plugins: {
      boundaries,
      import: importPlugin,
      "@eslint-community/eslint-comments": eslintComments,
    },
    settings: {
      // The rule-name deprecations (element-types / no-private / no-unknown) are
      // gone — those rules were migrated to their v7 equivalents (dependencies /
      // entry-point / no-unknown-dependencies). This flag now silences ONLY the
      // remaining `boundaries/elements` `mode` descriptor notice: v7 replaces
      // `mode: "full"` (full-path match on src/index.ts + src/frame-link.ts) with
      // a `files`-based classification whose semantics differ, so the descriptors
      // are intentionally kept on the working v6 `mode` form. Enforcement is
      // unchanged; only the console notice is suppressed to keep hook/CI output clean.
      "boundaries/legacy-warnings": false,
      "boundaries/dependency-nodes": ["import"],
      "boundaries/elements": [
        { type: "core", mode: "folder", pattern: "src/core" },
        { type: "types", mode: "folder", pattern: "src/types" },
        { type: "utils", mode: "folder", pattern: "src/utils" },
        { type: "public", mode: "full", pattern: ["src/index.ts", "src/frame-link.ts"] },
      ],
      "boundaries/entry-point": "index.ts",
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
    },
    rules: {
      // ═════════════════════════════════════════════════════════════════════
      // MODULE BOUNDARIES
      // ═════════════════════════════════════════════════════════════════════
      // v7 `dependencies` rule (replaces the deprecated `element-types`).
      // Each policy is the 1:1 translation of the old `rules` entry, preserving
      // the same from/allow sets and the same strong per-edge messages. Messages
      // name the concrete layers explicitly rather than relying on `{{from}}`/
      // `{{to}}` interpolation, so the guidance is clear regardless of token
      // rendering. `default: "disallow"` + global message are retained.
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "Boundary violation: this cross-layer import is not an allowed edge. Allowed edges are declared in eslint.config.mjs (public->core,types; core->types,utils; types->types; utils is a pure leaf).",
          policies: [
            {
              from: { element: { type: "public" } },
              allow: { to: { element: { types: { anyOf: ["core", "types"] } } } },
              message:
                "Boundary violation: the public entry may only import the 'core' layer and 'types'; it must not reach into 'utils' or elsewhere.",
            },
            {
              from: { element: { type: "core" } },
              allow: {
                to: { element: { types: { anyOf: ["core", "types", "utils"] } } },
              },
              message:
                "Boundary violation: 'core' may only depend on 'types' and 'utils' (and itself); it must never import the public entry.",
            },
            {
              from: { element: { type: "types" } },
              allow: { to: { element: { type: "types" } } },
              message:
                "Boundary violation: 'types' is a leaf contract layer and may only import other 'types'; it must not import 'core', 'utils', or the public entry.",
            },
            {
              from: { element: { type: "utils" } },
              allow: { to: { element: { type: "utils" } } },
              message:
                "Boundary violation: 'utils' is a pure leaf and may not import any other layer.",
            },
          ],
        },
      ],
      "boundaries/no-unknown-dependencies": "error",
      "boundaries/no-unknown-files": "error",

      // ═════════════════════════════════════════════════════════════════════
      // IMPORTS / DEPTH
      // ═════════════════════════════════════════════════════════════════════
      "import/no-cycle": ["error", { maxDepth: Infinity }],
      // NOTE: `noUselessIndex` is intentionally DISABLED (not the spec's `true`).
      // This package uses `moduleResolution: "NodeNext"` + `verbatimModuleSyntax`,
      // under which ESM relative imports MUST carry an explicit file (`./x/index.js`)
      // and directory imports (`./x`) are a hard TypeScript error (TS2834). Enabling
      // `noUselessIndex` would demand `./x`, which cannot compile or run here — an
      // unresolvable conflict with the module system, not a quality loosening. The
      // rule stays an ERROR so genuinely useless segments (e.g. `../a/../b`) are
      // still caught; only the index-suffix sub-check is turned off.
      "import/no-useless-path-segments": ["error", { noUselessIndex: false }],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../**", "../../../**"],
              message:
                "Deep relative import banned: import from a module's public entry, not across 2+ parent dirs.",
            },
          ],
        },
      ],

      // ═════════════════════════════════════════════════════════════════════
      // ESCAPE HATCHES BANNED
      // ═════════════════════════════════════════════════════════════════════
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@eslint-community/eslint-comments/no-use": ["error", { allow: [] }],

      // ═════════════════════════════════════════════════════════════════════
      // SIZE / COMPLEXITY
      // ═════════════════════════════════════════════════════════════════════
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 12],
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      "max-nested-callbacks": ["error", 3],

      // ═════════════════════════════════════════════════════════════════════
      // TYPE SAFETY (retained from prior strict config)
      // ═════════════════════════════════════════════════════════════════════
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: false,
          allowHigherOrderFunctions: false,
          allowDirectConstAssertionInArrowFunctions: false,
          allowConciseArrowFunctionExpressionsStartingWithVoid: false,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowNullableEnum: false,
          allowAny: false,
        },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
          disallowTypeAnnotations: true,
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // ═════════════════════════════════════════════════════════════════════
      // BASE ESLINT QUALITY
      // ═════════════════════════════════════════════════════════════════════
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      "no-console": "warn",
      "no-debugger": "error",
      curly: ["error", "all"],
      "no-nested-ternary": "error",
      "prefer-template": "error",
      "no-param-reassign": [
        "error",
        { props: true, ignorePropertyModificationsForRegex: ["^state$"] },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  // TEST OVERRIDE
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/__tests__/**",
      "**/testing/**",
    ],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "max-nested-callbacks": "off",
      // Test files live under src but are not part of the architecture graph.
      "boundaries/no-unknown-files": "off",
      "boundaries/dependencies": "off",
      // Test-harness patterns require flexibility not appropriate for production code.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
      "@typescript-eslint/no-unnecessary-type-arguments": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "no-console": "off",
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  // EXAMPLES: sample consumer apps demonstrating the public API. These are not
  // part of the published package (src is the transport core). They deliberately
  // import the public entry via relative path and are held to the base
  // recommended + type-checked set, WITHOUT the module-boundary/deep-relative
  // rules that govern the core's internal architecture.
  // ───────────────────────────────────────────────────────────────────────────
  {
    files: ["examples/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./examples/tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": "off",
    },
  }
);
