# Agent Guidelines for frame-link

This document defines guardrails for autonomous agents working in this repository. Agents must follow these rules to maintain code quality, architecture integrity, and project maintainability.

## Rule-Loosening Prohibition

Agents **may NOT** do any of the following without prior explicit human approval:

### ESLint Rules
- Disable, downgrade, or relax any ESLint rule
- Raise thresholds (e.g., `max-lines`, `max-lines-per-function`, `max-depth`, `max-parameters`)
- Use inline `eslint-disable` or `eslint-disable-next-line` comments

### TypeScript Configuration
- Disable or relax any `strict` mode option
- Relax any type-checking option in `tsconfig.json`
- Use `ts-ignore` or `ts-expect-error` comments
- Cast through `any` or `unknown` to bypass a type error

### Required Alternative

When encountering lint or type violations, **fix the underlying code** instead of loosening rules:

- **Oversized modules**: Split the file instead of raising `max-lines` or `max-lines-per-function`
- **Complex functions**: Extract helper functions or refactor logic instead of raising `max-depth` or `max-parameters`
- **Type mismatches**: Correct the code, improve type definitions, or use proper conditional narrowing instead of casting to `any`

This constraint mirrors the core principle of FLINK-T-0001: maintainability caps are preserved by improving code quality, not by circumventing checks.

## Approval Process

Any deviation from these rules **must** be requested first with:
1. A clear statement of the specific rule(s) to be relaxed
2. A justification explaining why the rule cannot be satisfied by improving the code
3. Human approval before proceeding

Exceptions cannot be applied unilaterally.

## Enforcement Mechanism

The pre-commit hook (`.husky/pre-commit`) runs the following gates:

```bash
npm run check && npm test && npm run depcruise
```

Where:
- `npm run check` = `tsc --noEmit && eslint src/ && prettier --check src/**/*.ts`
- `npm run depcruise` = dependency-cruiser validation

These gates **must not be weakened**. Do not:
- Skip any step
- Comment out steps
- Use `|| true` to ignore failures
- Bypass pre-commit hooks

GitHub Actions CI (`.github/workflows/ci.yml`) enforces the same gates at check-in time. Both must pass for code to merge.

## Summary

Build better code, not tighter rules. When a gate fails, fix the code.
