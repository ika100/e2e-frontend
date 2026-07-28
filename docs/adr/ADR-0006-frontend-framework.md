# ADR-0006: React + Vite + TypeScript as Frontend Framework

- **Status:** Accepted
- **Date:** 2025-01-28
- **Deciders:** Platform Agent
- **Related:** RFC-0001

## Context

The platform description specifies "React + Vite + TypeScript SPA". This ADR ratifies
that choice and records the reasoning for future reference.

## Decision

We will build the frontend as a **React 18** SPA with **Vite 5** as the build tool and
**TypeScript 5** (strict mode) as the language. Styling will use **CSS Modules** (native
Vite support, zero runtime). Unit and component tests will use **Vitest** + **React
Testing Library**. E2E tests will use **Playwright**.

## Alternatives Considered

- **Vue 3 + Vite** — smaller learning curve for template-based devs; rejected because the
  platform explicitly mandates React.
- **Next.js** — adds SSR complexity that is not required; the SPA is purely static output.
- **Jest** for testing — requires additional transform config for Vite; Vitest shares the
  Vite config natively, so there is no duplication.

## Consequences

**Positive**
- React 18 with concurrent features covers all UI requirements without extra libraries.
- Vite's fast HMR dramatically improves DX; production builds are optimised with tree-
  shaking and code splitting.
- TypeScript strict mode catches type errors at compile time, especially important for
  parsing back-end API responses.
- Vitest shares the Vite config, reducing test-environment maintenance.

**Negative / trade-offs**
- React ecosystem can be opinionated about state management at scale; for this small SPA,
  `useState` + `useEffect` is sufficient, avoiding library sprawl.
- CSS Modules require importing class names as objects — a minor verbosity increase.

**Neutral / follow-ups**
- Add `paths` aliases in `tsconfig.json` for `@/` → `src/` to avoid deep relative imports.
- Configure `vite.config.ts` with Vitest config in the same file.
