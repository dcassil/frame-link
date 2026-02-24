import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
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
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // ═══════════════════════════════════════════════════════════════════════
      // TYPE SAFETY - Zero tolerance for unsafe operations
      // ═══════════════════════════════════════════════════════════════════════

      // Ban `any` completely
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-enum-comparison": "error",
      "@typescript-eslint/no-unsafe-unary-minus": "error",

      // Enforce unknown over any for catch clauses and other scenarios
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",

      // ═══════════════════════════════════════════════════════════════════════
      // EXPLICIT TYPE DECLARATIONS - Forces intentional API design
      // ═══════════════════════════════════════════════════════════════════════

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
      "@typescript-eslint/typedef": [
        "error",
        {
          arrayDestructuring: false,
          arrowParameter: true,
          memberVariableDeclaration: true,
          objectDestructuring: false,
          parameter: true,
          propertyDeclaration: true,
          variableDeclaration: false,
          variableDeclarationIgnoreFunction: true,
        },
      ],

      // ═══════════════════════════════════════════════════════════════════════
      // STRICT BOOLEAN & NULL CHECKS
      // ═══════════════════════════════════════════════════════════════════════

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
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        {
          allowConstantLoopConditions: false,
          checkTypePredicates: true,
        },
      ],
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        {
          ignoreConditionalTests: false,
          ignoreTernaryTests: false,
          ignoreMixedLogicalExpressions: false,
          ignorePrimitives: {
            boolean: false,
            number: false,
            string: false,
          },
        },
      ],
      "@typescript-eslint/prefer-optional-chain": "error",

      // ═══════════════════════════════════════════════════════════════════════
      // TYPE CONSISTENCY & DEFINITIONS
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
          disallowTypeAnnotations: true,
        },
      ],
      "@typescript-eslint/consistent-type-exports": [
        "error",
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/consistent-indexed-object-style": ["error", "record"],
      "@typescript-eslint/consistent-generic-constructors": [
        "error",
        "constructor",
      ],
      "@typescript-eslint/array-type": ["error", { default: "array-simple" }],

      // ═══════════════════════════════════════════════════════════════════════
      // TYPE ASSERTIONS & CASTS
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "never",
          arrayLiteralTypeAssertions: "never",
        },
      ],
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-unnecessary-type-arguments": "error",
      "@typescript-eslint/no-unnecessary-type-parameters": "error",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/no-unnecessary-type-constraint": "error",

      // ═══════════════════════════════════════════════════════════════════════
      // FUNCTION & METHOD SIGNATURES
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/method-signature-style": ["error", "property"],
      "@typescript-eslint/prefer-function-type": "error",
      "@typescript-eslint/unified-signatures": [
        "error",
        { ignoreDifferentlyNamedParameters: true },
      ],
      "@typescript-eslint/adjacent-overload-signatures": "error",

      // ═══════════════════════════════════════════════════════════════════════
      // PROMISE & ASYNC HANDLING
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          ignoreVoid: false,
          ignoreIIFE: false,
          checkThenables: true,
        },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksConditionals: true,
          checksVoidReturn: {
            arguments: true,
            attributes: true,
            properties: true,
            returns: true,
            variables: true,
          },
          checksSpreads: true,
        },
      ],
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/promise-function-async": [
        "error",
        {
          allowedPromiseNames: [],
          checkArrowFunctions: true,
          checkFunctionDeclarations: true,
          checkFunctionExpressions: true,
          checkMethodDeclarations: true,
        },
      ],
      "no-return-await": "off",
      "@typescript-eslint/return-await": ["error", "always"],

      // ═══════════════════════════════════════════════════════════════════════
      // NAMING CONVENTIONS
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "forbid",
          trailingUnderscore: "forbid",
        },
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE"],
        },
        {
          selector: "variable",
          modifiers: ["const", "exported"],
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
        },
        {
          selector: "function",
          format: ["camelCase"],
        },
        {
          selector: "function",
          modifiers: ["exported"],
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "property",
          format: ["camelCase"],
        },
        {
          selector: "property",
          modifiers: ["readonly"],
          format: ["camelCase", "UPPER_CASE"],
        },
        {
          selector: "classProperty",
          modifiers: ["private"],
          format: ["camelCase"],
          leadingUnderscore: "forbid",
        },
        {
          selector: "classProperty",
          modifiers: ["static", "readonly"],
          format: ["UPPER_CASE", "PascalCase"],
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "typeParameter",
          format: ["PascalCase"],
          prefix: ["T"],
        },
        {
          selector: "interface",
          format: ["PascalCase"],
        },
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },
        {
          selector: "enum",
          format: ["PascalCase"],
        },
        {
          selector: "enumMember",
          format: ["PascalCase", "UPPER_CASE"],
        },
      ],

      // ═══════════════════════════════════════════════════════════════════════
      // RESTRICTED & BANNED TYPES/PATTERNS
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/no-restricted-types": [
        "error",
        {
          types: {
            Object: {
              message: "Use object or a specific type instead",
              fixWith: "object",
            },
            String: {
              message: "Use string instead",
              fixWith: "string",
            },
            Number: {
              message: "Use number instead",
              fixWith: "number",
            },
            Boolean: {
              message: "Use boolean instead",
              fixWith: "boolean",
            },
            Symbol: {
              message: "Use symbol instead",
              fixWith: "symbol",
            },
            BigInt: {
              message: "Use bigint instead",
              fixWith: "bigint",
            },
            Function: {
              message:
                "Use a specific function type like `() => void` instead",
            },
            "{}": {
              message:
                "Use `object`, `Record<string, unknown>`, or a specific interface instead",
            },
          },
        },
      ],
      "@typescript-eslint/no-empty-object-type": [
        "error",
        {
          allowInterfaces: "never",
          allowObjectTypes: "never",
        },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": false,
          minimumDescriptionLength: 10,
        },
      ],
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-var-requires": "error",

      // ═══════════════════════════════════════════════════════════════════════
      // REDUNDANT CODE & TYPE CHECKS
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/no-redundant-type-constituents": "error",
      "@typescript-eslint/no-duplicate-type-constituents": "error",
      "@typescript-eslint/no-duplicate-enum-values": "error",
      "@typescript-eslint/no-useless-empty-export": "error",
      "@typescript-eslint/no-inferrable-types": [
        "error",
        {
          ignoreParameters: false,
          ignoreProperties: false,
        },
      ],

      // ═══════════════════════════════════════════════════════════════════════
      // CLASS DESIGN
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/no-extraneous-class": [
        "error",
        {
          allowConstructorOnly: false,
          allowEmpty: false,
          allowStaticOnly: false,
          allowWithDecorator: false,
        },
      ],
      "@typescript-eslint/no-useless-constructor": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/prefer-readonly-parameter-types": "off", // Often too strict for practical use
      "@typescript-eslint/class-literal-property-style": ["error", "fields"],
      "@typescript-eslint/member-ordering": [
        "error",
        {
          default: [
            "signature",
            "static-field",
            "instance-field",
            "constructor",
            "static-method",
            "instance-method",
          ],
        },
      ],
      "@typescript-eslint/parameter-properties": [
        "error",
        { prefer: "class-property" },
      ],

      // ═══════════════════════════════════════════════════════════════════════
      // CODE QUALITY & PATTERNS
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: false,
        },
      ],
      "@typescript-eslint/no-shadow": [
        "error",
        {
          builtinGlobals: true,
          hoist: "all",
          allow: [],
          ignoreOnInitialization: false,
        },
      ],
      "@typescript-eslint/no-use-before-define": [
        "error",
        {
          functions: true,
          classes: true,
          variables: true,
          allowNamedExports: false,
          enums: true,
          typedefs: true,
          ignoreTypeReferences: false,
        },
      ],
      "@typescript-eslint/no-loop-func": "error",
      "@typescript-eslint/no-magic-numbers": [
        "warn",
        {
          ignore: [-1, 0, 1, 2],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          enforceConst: true,
          detectObjects: true,
        },
      ],
      "@typescript-eslint/no-invalid-void-type": [
        "error",
        {
          allowInGenericTypeArguments: true,
          allowAsThisParameter: false,
        },
      ],

      // ═══════════════════════════════════════════════════════════════════════
      // SWITCH STATEMENTS
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        {
          allowDefaultCaseForExhaustiveSwitch: false,
          requireDefaultForNonUnion: true,
          considerDefaultExhaustiveForUnions: false,
        },
      ],

      // ═══════════════════════════════════════════════════════════════════════
      // MODERN SYNTAX PREFERENCES
      // ═══════════════════════════════════════════════════════════════════════

      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-includes": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      "@typescript-eslint/prefer-regexp-exec": "error",
      "@typescript-eslint/prefer-reduce-type-parameter": "error",
      "@typescript-eslint/prefer-return-this-type": "error",
      "@typescript-eslint/prefer-find": "error",
      "@typescript-eslint/no-array-constructor": "error",
      "@typescript-eslint/no-for-in-array": "error",
      "@typescript-eslint/dot-notation": [
        "error",
        {
          allowKeywords: true,
          allowPrivateClassPropertyAccess: false,
          allowProtectedClassPropertyAccess: false,
          allowIndexSignaturePropertyAccess: false,
        },
      ],
      "@typescript-eslint/prefer-literal-enum-member": [
        "error",
        { allowBitwiseExpressions: true },
      ],

      // ═══════════════════════════════════════════════════════════════════════
      // BASE ESLINT RULES (with TS overrides disabled where appropriate)
      // ═══════════════════════════════════════════════════════════════════════

      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      "no-console": "warn",
      "no-debugger": "error",
      curly: ["error", "all"],
      "no-else-return": ["error", { allowElseIf: false }],
      "no-implicit-coercion": "error",
      "no-lonely-if": "error",
      "no-nested-ternary": "error",
      "no-unneeded-ternary": "error",
      "prefer-template": "error",
      "object-shorthand": ["error", "always"],
      "prefer-destructuring": [
        "error",
        {
          array: true,
          object: true,
        },
        {
          enforceForRenamedProperties: false,
        },
      ],
      "prefer-spread": "error",
      "prefer-rest-params": "error",
      "no-param-reassign": ["error", { props: true }],
      "max-depth": ["error", 3],
      "max-lines-per-function": [
        "warn",
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 10],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration:not([const])",
          message: "Use const enum or union types instead of regular enums",
        },
        {
          selector: "LabeledStatement",
          message: "Labels are a form of GOTO; do not use them",
        },
        {
          selector: "WithStatement",
          message: "`with` is disallowed in strict mode",
        },
      ],
      "no-constructor-return": "error",
      "no-promise-executor-return": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "error",
      "no-unreachable-loop": "error",
      "require-atomic-updates": "error",
      "default-case-last": "error",
      "grouped-accessor-pairs": ["error", "getBeforeSet"],
      "no-caller": "error",
      "no-eval": "error",
      "no-extend-native": "error",
      "no-extra-bind": "error",
      "no-implied-eval": "off", // Using @typescript-eslint version
      "@typescript-eslint/no-implied-eval": "error",
      "no-iterator": "error",
      "no-labels": "error",
      "no-lone-blocks": "error",
      "no-multi-str": "error",
      "no-new": "error",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "no-octal-escape": "error",
      "no-proto": "error",
      "no-return-assign": ["error", "always"],
      "no-script-url": "error",
      "no-sequences": "error",
      "no-throw-literal": "off", // Using @typescript-eslint version
      "@typescript-eslint/only-throw-error": "error",
      "no-unused-expressions": "off", // Using @typescript-eslint version
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: false,
          allowTernary: false,
          allowTaggedTemplates: false,
          enforceForJSX: true,
        },
      ],
      "no-useless-call": "error",
      "no-useless-concat": "error",
      "no-useless-return": "error",
      "prefer-promise-reject-errors": "error",
      radix: "error",
      yoda: "error",
    },
  },
  {
    files: ["**/__tests__/**/*.ts", "**/*.spec.ts", "**/*.test.ts"],
    rules: {
      // Relax some rules for tests
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-magic-numbers": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/typedef": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "no-console": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "*.config.js",
      "*.config.cjs",
      "*.config.mjs",
      "babel.config.js",
    ],
  }
);
