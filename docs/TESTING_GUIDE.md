Got it. I’ll verify compatibility and usage updates for all the listed tools in your 2025 guide — including Storybook addons, Biome, Vitest, Playwright, Tailwind, Husky, semantic-release, Commitizen, Qlty CLI, and Zod — and then integrate them into a fully updated version of your markdown guide.

I’ll get back to you shortly with the revised file.


# Modern JavaScript Development & Testing Guide (July 2025)

> **Purpose**
> An opinionated reference for boot‑strapping and maintaining a **Next.js 15 / React 19** codebase in 2025.
> Everything is production‑ready, CI‑friendly, and tuned for **Bun**, **Vitest 3**, **Playwright 1.53**, **Storybook 9**, **Biome 2**, and **Tailwind 4**.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Configuration Files](#configuration-files)
5. [Testing Strategy](#testing-strategy)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Git Worktrees Workflow](#git-worktrees-workflow)
8. [Best Practices](#best-practices)
9. [Appendix — Reference Versions](#appendix--reference-versions)

---

## Architecture Overview

| Layer                     | Tooling (2025)                                                                             | Highlights                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Runtime / Package Mgr** | **Bun 1.2**                                                                                | 30× faster installs; \~90% Node API parity                                                                           |
| **Framework**             | **Next.js 15.4**                                                                           | Async server `cookies()/headers()`; React Server Components                                                          |
| **UI Library**            | **React 19.1**                                                                             | New `use()` hook, Server Actions, Optimistic UI updates                                                              |
| **Styling**               | **Tailwind 4.1**                                                                           | Oxide engine (Rust) → \~5× full build, 100× incremental speedups; CSS-first config                                   |
| **Lint & Format**         | **Biome 2.1**                                                                              | Type-aware TS lint **without** `tsc`; GritQL (GraphQL) plugin support                                                |
| **Testing**               | **Vitest 3.2** (unit/integration) • **Playwright 1.53** (e2e) • **Storybook 9** (UI tests) | Unified component+unit testing via Vitest; Playwright trace viewer & HTML reporter; Storybook test widget in-browser |
| **Types**                 | **TypeScript 5.8** → *7.0 (Go)* (beta)                                                     | Node ESM interoperability (`require()` in modules); upcoming **10×** compiler speedup in TS 7 (native)               |
| **Validation**            | **Zod 4**                                                                                  | \~14× faster string parsing, 7× arrays; 100× fewer TS instantiations; **Mini** build \~1.9 kB                        |
| **Automation**            | **Stagehand + Browserbase**                                                                | Natural‑language browser control (AI assistant for flows)                                                            |
| **Workflow**              | **Git Worktrees + Husky 9 + semantic‑release 24**                                          | Parallel feature branches; pre-commit hooks; automated versioning and changelogs                                     |

---

## Quick Start

**Step 1:** Create a new Next.js 15 project (with TypeScript and Tailwind CSS) using **Bun**:

```bash
bunx create-next-app@latest my-app --typescript --tailwind --app --use-bun
cd my-app
```

**Step 2:** Add runtime dependencies (app libraries):

```bash
bun add zod @browserbasehq/sdk
```

**Step 3:** Add development dependencies for testing, Storybook, linting, and release workflow:

```bash
# Testing frameworks (Vitest & Playwright)
bun add -D vitest @vitejs/plugin-react jsdom
bun add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
bun add -D @playwright/test

# Storybook (Next.js with Vite builder) and addons
bun add -D storybook@latest        # CLI tool
# Storybook will prompt; you can also run `bunx storybook@latest init`

# Code quality and CI tools
bun add -D @biomejs/biome          # Biome (linter/formatter)
bun add -D commitizen cz-conventional-changelog
bun add -D semantic-release @semantic-release/git @semantic-release/changelog @semantic-release/github
bun add -D husky @commitlint/cli @commitlint/config-conventional

# Miscellaneous
bun add -D vite-tsconfig-paths     # Vite plugin for TS path aliases
```

**Step 4:** (Optional) Install global developer tools:

```bash
# Qlty CLI (unified code quality tool)
bun add -g qlty

# Commitizen (for interactive commit messages)
bun add -g commitizen

# Install Playwright browsers for end-to-end testing
bunx playwright install --with-deps
```

**Step 5:** Bootstrap Storybook:

```bash
bunx storybook@latest init    # Initialize Storybook (choose @storybook/nextjs-vite)
```

This will configure Storybook for Next.js with the Vite builder. You can now run `bun run storybook` to verify the Storybook UI.

---

## Project Structure

```
my-app/
├─ .storybook/          # Storybook v9 configuration (Vite-based)
├─ .husky/              # Git hooks (pre-commit, commit-msg, etc.)
├─ .qlty/               # Qlty CLI config (e.g. qlty.toml)
├─ .vscode/             # Editor settings and extension recommendations
├─ src/
│  ├─ app/              # Next.js 15 app router (React Server Components)
│  ├─ features/         # Feature-based modules (vertical slices)
│  └─ shared/           # Shared utilities and components
├─ tests/               # Vitest unit & integration tests, Playwright e2e tests
└─ …                    # Additional configs (package.json, CI workflow, etc.)
```

This structure favors **vertical feature slices** (grouping by feature/domain) rather than horizontal layers. The `app/` directory contains Next.js 15 routes (using the App Router, which supports React Server Components). The `features/` directory holds domain-specific modules (each with its own components, hooks, services, types, etc.), while `shared/` holds truly cross-cutting utilities. Tests are organized under `tests/` by type (unit, integration, e2e). Configuration files for tools like Storybook, Vitest, Playwright, Biome, commitlint, etc., live at the root or in dedicated folders as shown.

---

## Configuration Files

<details>
<summary><code>.storybook/main.ts</code> – Storybook configuration</summary>

```typescript
import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-coverage"
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {}
  },
  features: {
    experimentalRSC: true    // enable React Server Components support in stories
  },
  build: {
    test: {
      /** Disable docs addon during test builds to preserve coverage info */
      disabledAddons: ["@storybook/addon-docs"]
    }
  }
};
export default config;
```

</details>

**Storybook Notes:** Storybook 9 introduces a unified **Storybook Test** suite that integrates **Vitest** as the test runner for component stories. The configuration above uses the Next.js Vite framework (`@storybook/nextjs-vite`), which supports Next.js features (routing, Image, etc.) and React Server Components. We enable `experimentalRSC` to allow rendering of React Server Components in Storybook. Storybook’s **Essential** addons (`addon-essentials`) provide core UI features (controls, actions, etc.), and we include additional testing addons: **Interactions** (to simulate user events in stories), **Vitest** (runs all stories as tests in Vitest’s browser mode), **Accessibility (a11y)** to catch WCAG issues, and **Coverage** to generate test coverage reports from story tests. In Storybook 9, many formerly separate addons are streamlined – e.g. **interaction testing** is now built-in and can be run across all stories via the Test runner UI. (We still list `addon-interactions` here for backwards compatibility, though Storybook 9 core covers it.) The `disabledAddons` setting above is important for running Storybook tests in CI: Storybook’s `--test` build mode automatically strips out certain addons like Docs to speed up testing. If you want coverage collection to work in test mode, you explicitly disable the Docs addon instead (as shown), so that coverage instrumentation is preserved. Storybook 9’s test widget in the UI allows running **interaction, accessibility, and visual regression tests** with one click, and shows a coverage summary after running tests.

<details>
<summary><code>vitest.config.ts</code> – Vitest configuration</summary>

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],  // global test setup (e.g. polyfills, mocks)
    globals: true,
    css: true,                         // enable CSS import handling in tests
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**", "dist/**", ".next/**", 
        "coverage/**", "tests/**", "**/*.d.ts",
        "**/*.config.{js,ts}", "**/types.ts",
        "**/.storybook/**", "**/storybook-static/**"
      ],
      thresholds: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } }
    },
    pool: "forks",                     // isolate tests in processes (better with Bun)
    poolOptions: { forks: { singleFork: true } }  // use one forked process for all tests
  }
});
```

</details>

**Vitest Notes:** Vitest 3.x is a blazing-fast Vite-powered test runner that seamlessly runs both unit and integration tests. We configure it with the **jsdom** environment for DOM-based tests (React components, etc.), and include `@vitejs/plugin-react` for JSX transform. The `vite-tsconfig-paths` plugin picks up TypeScript path aliases from `tsconfig.json` so imports like `@/utils` resolve properly. We set `globals: true` to use Vitest’s global `it, expect, vi` without imports. Vitest 3 added support for running tests in a real browser context (“browser mode”) which Storybook leverages – the `addon-vitest` uses Vitest’s browser runner to execute story files. The `css: true` option allows importing CSS or Tailwind classes in component tests without errors. For performance, we use `pool: "forks"` to run tests in isolated subprocesses (rather than worker threads) – this avoids some issues with large test suites and, especially when using Bun as the Node runtime, can be more stable. We also enable `singleFork: true`, which runs all tests in a single child process (still isolated from the main process). This can reduce overhead for smaller projects (one process startup instead of many) and is a pattern Bun’s team has recommended for Vitest compatibility. The coverage configuration uses V8’s built-in coverage engine and outputs text, HTML, and LCOV reports. We exclude non-source files and set a basic **coverage threshold** (e.g. 80%) to enforce test quality. Vitest’s watch mode is instant (thanks to Vite’s HMR), and version 3.2 introduced features like a new Annotations API and scoped test fixtures for better organization. *(Tip: Run `bun run test` (which maps to `vitest`) during development for watch mode, and `bun run test:coverage` in CI to generate the coverage report.)*

<details>
<summary><code>playwright.config.ts</code> – Playwright configuration</summary>

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: [
    ["html", { open: "never" }], 
    ["json", { outputFile: "playwright-report/results.json" }]
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry"  // capture traces for failed tests (first retry)
  },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox",  use: devices["Desktop Firefox"] },
    { name: "webkit",   use: devices["Desktop Safari"] }
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true
  }
});
```

</details>

**Playwright Notes:** Playwright 1.53 is used for end-to-end browser testing. The config above looks for tests in `tests/e2e`, runs them in **parallel**, and defines three **projects** to run tests in Chrome, Firefox, and Safari (WebKit) for cross-browser coverage. We set a base URL pointing to the local dev server, so tests can use relative URLs. The `webServer` section ensures Next.js is running (it will start `bun run dev` and wait for the app to be available on port 3000). We enable Playwright’s trace on the first retry of a test, which provides an interactive trace viewer if a test fails – this is invaluable for debugging flaky tests, and v1.53 improved the trace viewer with step-by-step highlights and a more informative HTML report. The reporter is configured to generate a full HTML report (saved in `playwright-report/`) and a JSON results file. You can adjust the `fullyParallel` flag or use test annotations if tests interfere with each other or require sequential execution. In CI, ensure that Playwright’s browsers are installed (we did `bunx playwright install`). Playwright’s latest version also introduced features like an official VS Code extension for debugging, and continues to refine its test runner performance and APIs. With this setup, you can run all e2e tests via `bun run test:e2e` (which should map to `playwright test`).

<details>
<summary><code>biome.json</code> – Biome (unified linter & formatter) config</summary>

```json
{
  "$schema": "https://biomejs.dev/schemas/2.1.1/schema.json",
  "formatter": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

</details>

**Biome Notes:** **Biome** is an all-in-one code formatter and linter (the successor to Rome). Biome 2.x introduced **type-aware** linting rules for TypeScript that do *not* require running `tsc` under the hood. This means you get some of the benefits of TypeScript ESLint’s type rules, but much faster, since Biome performs its own type analysis in Rust. By enabling `"recommended": true` rules, we get a sensible default lint rule set for code quality. The config above is minimal because Biome works mostly out-of-the-box – we just confirm the formatter and linter are on. (You can customize rules, add **organize imports**, etc., but defaults are often enough.) Biome covers formatting similar to Prettier (so we don’t need Prettier), and includes lint rules analogous to ESLint (so no need for separate ESLint either). In this setup, running `bun run format` would invoke Biome’s formatter and `bun run check` would likely run Biome’s linter (and possibly TypeScript’s `tsc` for type-checking, configured in package scripts). Biome also supports **monorepo** configurations and has plugins (e.g. **GritQL** for GraphQL linting). It’s recommended to integrate Biome with your editor for on-save formatting. The provided VS Code settings (see below) configure Biome as the default formatter and enable format-on-save.

*(Additional config files such as **commitlint.config.js** for commit message linting, **package.json** scripts, and GitHub Actions workflow are provided in the repository appendix.)*

---

## Testing Strategy

The project employs a multi-layered testing approach:

| Layer                            | Tool                       | Goal & Coverage                                                                                         |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Unit / Integration**           | **Vitest 3**               | Fast in-memory tests, TypeScript-native, watch mode for TDD                                             |
| **Component (UI, a11y, states)** | **Storybook 9 Test Suite** | Interactive UI tests (user interactions, visual regressions, accessibility) integrated in Storybook UI  |
| **End‑to‑End (E2E)**             | **Playwright 1.53**        | Full browser tests across Chromium/Firefox/WebKit, with trace viewer debugging                          |
| **Contract / Schema Validation** | **Zod 4**                  | Schema-defined validation for API contracts (shared between client & server)                            |

**Rationale:** Unit tests verify business logic in isolation (e.g. functions, reducers), while integration tests might render React components with minimal dependencies. These run quickly in Vitest. For front-end **components**, Storybook serves as a living spec: every story can have automated tests. Storybook 9 + Vitest allows running **all** component stories as test cases, covering interactions (clicks, form input, etc.), **accessibility** checks via axe-core, and even **visual diffs** (when linked with a service like Chromatic). This gives broad UI coverage “for free” from the stories you write. End-to-end tests with Playwright then cover user flows through the application (login, navigation, etc.) in a real browser context, ensuring everything works together. Finally, using Zod schemas for data validation ensures that assumptions at boundaries (e.g. API responses, form inputs) are enforced and tested. Zod’s fast runtime makes it feasible to validate on both client and server, and the schemas can double as a source of truth for unit tests (e.g. ensuring no unexpected fields).

**Example – TDD for a UI Component:** Suppose we have a simple Button component. We would create a Vitest test like:

```tsx
// src/shared/components/Button.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { Button } from "./Button";

it("handles clicks", () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Click me</Button>);
  fireEvent.click(screen.getByRole("button"));
  expect(onClick).toHaveBeenCalled();
});
```

Here Vitest runs a React test (using React Testing Library) to assert that our Button calls the provided handler when clicked. Once this unit test passes, we might also have a Storybook story for Button (with controls for props). In Storybook’s UI, we could use the **Interactions** addon panel to simulate a click on the Button and verify it behaves (this is essentially a Storybook interaction test). We’d also get an automatic a11y report on the Button (e.g. ensuring it has accessible role and label). If we integrate Chromatic or run `test-storybook`, we could catch any visual changes to the Button component across versions. This test layering ensures robust coverage from logic to visuals.

---

## CI/CD Pipeline

> **GitHub Actions** – run quality checks → tests → release, in parallel stages.

A sample **workflow** (YAML) might be:

```yaml
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run type-check          # TypeScript (tsc) type checking
      - run: bun run check               # Lint (Biome) and other checks
      - name: Install Qlty CLI
        run: |
          curl -sSf https://qlty.sh | bash
          echo "$HOME/.local/bin" >> $GITHUB_PATH
      - run: qlty check --all            # Static analysis (all languages):contentReference[oaicite:26]{index=26}

  test:
    needs: quality
    runs-on: ubuntu-latest
    strategy:
      matrix:
        type: [unit, storybook, e2e]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - name: Install Playwright browsers
        if: matrix.type == 'e2e'
        run: bunx playwright install --with-deps
      - name: Run tests
        run: |
          if [ "${{ matrix.type }}" = "unit" ]; then 
            bun run test:coverage 
          elif [ "${{ matrix.type }}" = "storybook" ]; then 
            bun run build-storybook && bun run test-storybook 
          elif [ "${{ matrix.type }}" = "e2e" ]; then 
            bun run build && bun run test:e2e 
          fi

      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.type }}-results
          path: |
            coverage/**
            playwright-report/**
            test-results/**

  release:
    needs: [quality, test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0      # fetch full history for changelog
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run build            # build the app (Next.js build)
      - run: bunx semantic-release    # automatic version bump + CHANGELOG + git tag
```

**Explanation:** The pipeline is split into **three stages**:

* **Quality:** Install dependencies, then run static analysis and linting. We run `bun run type-check` (to catch TypeScript errors) and `bun run check` (which we’ve set up to run Biome lint). We then install **Qlty CLI** and run `qlty check --all`. **Qlty CLI** is a unified quality tool that can run multiple linters, formatters, and security scanners across languages via one command. In this context, Qlty might run extra checks (for example, if we had Python or other files, or perform security linting beyond Biome’s scope). It only analyzes changed files by default, but `--all` ensures a full scan in CI. This stage ensures code meets standards *before* running tests.

* **Test:** Depends on quality. It uses a **matrix** to run three variants in parallel: unit tests, Storybook tests, and end-to-end tests. For each, it sets up Bun and installs deps. If running e2e tests, we ensure Playwright browsers are installed (using `--with-deps` to include dependencies like ffmpeg if needed for video). Then we have a conditional step:

  * **unit**: run `test:coverage` (which in package scripts would call Vitest with coverage collection).
  * **storybook**: build Storybook (static build of all stories) then run `test-storybook`. Here `test-storybook` should execute the Storybook test suite in headless mode. This could be accomplished by running the Vitest-powered tests against the built story files (for example, Storybook provides a `test-storybook` CLI or we can use `vitest --browser` to run tests in an instrumented browser environment). The disabledAddons config we set ensures coverage isn't lost during this build. The output could be a coverage report (the Storybook addon-coverage adds a coverage summary visible in the UI and can output a full report as seen in the screenshot).
  * **e2e**: build the Next.js app for production (`bun run build`) then run Playwright tests (`bun run test:e2e`). We do a production build to more closely resemble real usage (alternatively, we could run against the dev server, but a build catches production-specific issues).

  After tests, we always upload artifacts: e.g. coverage reports, Playwright HTML report, or any junit results. This helps in viewing test results from CI.

* **Release:** Runs only on pushes to `main`. It waits for both quality and test to succeed. It checks out the code with full history (semantic-release needs commit history for determining version bumps and generating changelogs). After installing deps and building the application (to ensure we have a production build artifact if needed for deployment), it runs **semantic-release**. Semantic-release will analyze commit messages (Conventional Commits) and automatically determine if a release should be published (and of what semantic version). We included plugins for updating the git repo, creating a GitHub release, and generating a changelog. **semantic-release 24** requires a recent Node runtime (Node 18+; using Bun is fine since Bun embeds Node v20) and uses the latest Conventional Changelog preset which expects conventional commit messages. If our commit messages follow the format (which we enforce via commitlint/Commitizen), semantic-release will cut a release, tag the repo, and update the CHANGELOG.

Overall, this CI setup ensures that code quality and tests gate the release. Only if all checks pass and the branch is main, a release is published. This makes the process fully automated and maintains high confidence in each release.

*(For self-hosted CI or other platforms, the same general approach applies: run **lint/type-check** → **unit/component/e2e tests** → **release**. Ensure to set up any required secrets (for semantic-release to push tags or publish to package registries, if applicable).)*

---

## Git Worktrees Workflow

Using Git worktrees is recommended for managing multiple parallel feature branches without context-switching your main working copy. This project’s workflow encourages isolating each feature in its own worktree:

```bash
# Create a new worktree for a feature branch (without affecting current HEAD)
git worktree add ../feat-auth feature/auth

# Now you have a new directory "../feat-auth" checked out to branch "feature/auth"
# You can open a second VS Code window for this directory and work on the feature independently.

# ... after committing and pushing feature/auth, and getting it merged ...

# Clean up the worktree once the feature is done:
git worktree remove ../feat-auth   # removes the worktree
git worktree prune                 # cleans up any leftover references
```

With this approach, you can have multiple versions of the repository on disk, each on different branches (e.g. one on `main`, one on `feature/auth`, etc.). This is great for reviewing PRs or continuing new development while waiting for code review on another branch. It also pairs well with our Husky hooks (each worktree has the Git hooks set up by `husky install`). Just remember to prune worktrees to avoid stale references. This technique keeps your flow efficient: no constantly stashing changes or context-switching – each feature is its own isolated workspace.

---

## Best Practices

* **Vertical slice architecture:** Organize code by feature, not by technical layer. Each feature directory contains all relevant components, styles, and logic. This promotes high cohesion and easier code ownership.

* **TDD + Storybook:** Use a **red → green → refactor → document** cycle. Start with failing tests (Vitest or Storybook interaction tests), write just enough code to pass them, refactor for clarity, and then add or update Storybook stories to document the feature. Storybook serves as living documentation and also doubles as a testing tool (via its test suite) during development.

* **Async everywhere:** Embrace async/await and asynchronous patterns in both front-end and back-end code. Next.js 15’s server functions (e.g. `async function Page()` in the app router, `cookies()`/`headers()` etc.) and React Server Components mean much of the code is async by nature. Design components and utilities to handle promises and loading states gracefully. This ensures compatibility with React 18+ features and future proofs for any data-fetching strategy.

* **Type-safe boundaries:** Use **Zod schemas** (or `@sinclair/typebox`, etc.) to define and **share** the shape of data sent between client and server. By importing the same Zod schema on both sides, you validate incoming data (e.g. from an API) and also derive TypeScript types from it. This guarantees that your front-end and back-end agree on data contracts. In tests, you can use schemas to generate valid and invalid data cases, ensuring robust validation. Zod 4’s performance improvements mean runtime validation is usually not a bottleneck, and its mini bundle helps keep client payload small for browser use.

* **Automated migrations:** Keep tooling up-to-date using codemods and CLI upgrades. For example:

  ```bash
  npx storybook@9 migrate --glob="**/*.stories.@(tsx|jsx)"     # e.g. CSF2 to CSF3
  npx storybook@9 upgrade                                      # Storybook v8 → v9 automations
  npx @next/codemod@latest upgrade                             # Next.js 14 → 15 codemods
  ```

  Storybook 9 deprecated older module formats and introduced new features (like tag-based organization); their migration tool can handle most breaking changes. Next.js codemods similarly help update for major changes. Automate these when possible instead of manual fixes.

* **Consistent commits & releases:** Adopt **Conventional Commits** for all commit messages (e.g. “feat(auth): support 2FA login”). Use **Commitizen** for interactive commits to simplify following the format, and **Commitlint** (with husky’s `commit-msg` hook) to reject malformed commits. This ensures that semantic-release can determine version bumps (fix = patch, feat = minor, breaking = major) automatically. For example, our Husky commit-msg hook runs `commitlint --edit $1` to enforce the conventional template. By maintaining this discipline, you get human-readable history and automatic CHANGELOG generation for free. **Commitizen 4** provides a convenient CLI wizard for crafting commit messages, and we’ve added a Yarn/NPM script `"commit": "cz"` so developers can run `npm run commit` to invoke it. This, combined with semantic-release, forms a robust release management pipeline where every merge to main can produce a publishable release with meaningful versioning.

* **Pre-commit automation:** Configure git hooks (via Husky 9) to run quick checks before allowing a commit. For instance, a `pre-commit` hook can run formatting and linting on staged files (`npm run lint && npm run format`) to catch issues early, and a `pre-push` hook can run tests (perhaps a fast subset) to prevent pushing broken code. Our setup in `.husky/` indeed includes:

  * `pre-commit` – runs Biome (`npm run lint`) to lint and format the code (`npm run format`) as a safety net.
  * `commit-msg` – runs commitlint.
  * `pre-push` – runs the test suite (`npm run test`) so that you only push code that passes tests.

  These safeguards automate quality enforcement and save CI cycles. Husky 9 is configured via `husky install` (usually triggered in a postinstall script to set up the hooks). The hooks themselves are simple shell scripts as shown above in the pipeline excerpt.

* **Use Qlty CLI for code quality**: Qlty is a **unified code quality tool** that can run linters, formatters, and static analyzers for **70+ tools across 40+ languages**. In a polyglot project (or even within a JS project, to run specialized tools like dependency auditors, or style linters), Qlty can save time by running only the relevant checks (and only on changed files, unless `--all`). Incorporate Qlty in your workflow (we did in CI) to catch issues like security vulnerabilities (it can run tools like ESLint, Bandit for Python, etc. under the hood) that might be outside the scope of Biome/TS. It’s also useful locally: developers can run `qlty check` before pushing to get a comprehensive quality report.

* **VS Code setup:** Ensure your team shares editor settings to avoid “it works on my machine” issues. We include a `.vscode/settings.json` that, for example, enables format-on-save with Biome, disables other linters/formatters (ESLint/Prettier) to avoid conflicts, and possibly enables the Qlty VS Code extension. The recommended extensions list (`.vscode/extensions.json`) includes Biome (for syntax and formatting), Qlty (if available), Playwright (for test debugging), etc. This ensures anyone opening the project in VS Code gets a consistent, productive setup out of the box.

By following these practices, the project stays maintainable, **fast** (both in dev and CI), and ready to adapt to new tech. The tooling versions chosen here (from Storybook 9 to TS 5.8 to Bun) represent the state-of-the-art as of mid-2025 – each chosen for performance and developer experience. Always monitor release notes for these tools; for example, keep an eye on Next.js 16 (which will bring a new Rust-based bundler), and the progress of TypeScript’s Go-based compiler (TS 7) which promises order-of-magnitude speed improvements. Our setup is designed to be future-proof and easy to upgrade with minimal friction.

---

## Appendix — Reference Versions

| Package       | Version (≥) |
| ------------- | ----------- |
| Next.js       | **15.4.0**  |
| React         | **19.1.0**  |
| Storybook     | **9.0.17**  |
| Vitest        | **3.2.4**   |
| Playwright    | **1.53.0**  |
| Bun (runtime) | **1.2.17**  |
| Biome         | **2.1.1**   |
| Tailwind CSS  | **4.1.0**   |
| TypeScript    | **5.8**     |
| Zod           | **4.0.0**   |

*(All version numbers indicate the minimum version tested with this guide. Newer patch versions in the same major line are generally fine. As of July 2025, these represent the latest stable releases for each tool.)*

© 2025 — Feel free to adapt this template to your team’s needs. Contributions are welcome!
