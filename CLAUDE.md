# Claude Code Configuration for Claude Flow

## 🚨 CRITICAL: PARALLEL EXECUTION AFTER SWARM INIT

**MANDATORY RULE**: Once swarm is initialized with memory, ALL subsequent operations MUST be parallel:

1. **TodoWrite** → Always batch 5-10+ todos in ONE call
2. **Task spawning** → Spawn ALL agents in ONE message
3. **File operations** → Batch ALL reads/writes together
4. **NEVER** operate sequentially after swarm init

## 🚨 CRITICAL: CONCURRENT EXECUTION FOR ALL ACTIONS

**ABSOLUTE RULE**: ALL operations MUST be concurrent/parallel in a single message:

### 🔴 MANDATORY CONCURRENT PATTERNS:

1. **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
2. **Task tool**: ALWAYS spawn ALL agents in ONE message with full instructions
3. **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
4. **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
5. **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**Examples of CORRECT concurrent execution:**

```javascript
// ✅ CORRECT: Everything in ONE message
[Single Message]:
  - TodoWrite { todos: [10+ todos with all statuses/priorities] }
  - Task("Agent 1 with full instructions and hooks")
  - Task("Agent 2 with full instructions and hooks")
  - Task("Agent 3 with full instructions and hooks")
  - Read("file1.js")
  - Read("file2.js")
  - Read("file3.js")
  - Write("output1.js", content)
  - Write("output2.js", content)
  - Bash("npm install")
  - Bash("npm test")
  - Bash("npm run build")
```

**Examples of WRONG sequential execution:**

```javascript
// ❌ WRONG: Multiple messages (NEVER DO THIS)
Message 1: TodoWrite { todos: [single todo] }
Message 2: Task("Agent 1")
Message 3: Task("Agent 2")
Message 4: Read("file1.js")
Message 5: Write("output1.js")
Message 6: Bash("npm install")
// This is 6x slower and breaks coordination!
```

## Use Bun in this Project

**Recommendations for Bun Integration**:

- Use `bun` as the primary runtime
- Leverage `bunx` for package execution
- Take advantage of Bun's native TypeScript support
- Utilize Bun's fast package manager for installations

### Testing Strategy (4 Consolidated Configs):

```bash
# Unit tests (lib, utils, schemas)
bun run test:unit

# Component tests (React components, hooks)
bun run test:components

# Integration tests (API, database, Inngest)
bun run test:integration

# Browser tests (E2E, browser-specific)
bun run test:browser

# Run all tests
bun run test:all

# Type checking
bun run typecheck
```

### Vitest Configuration Structure:

1. **vitest.config.ts** - Unit tests for business logic
2. **vitest.components.config.ts** - React component tests
3. **vitest.integration.config.ts** - API and integration tests
4. **vitest.browser.config.ts** - Browser and E2E tests

### Example Bun Workflow:

```bash
# Install dependencies
bun install

# Run scripts
bun run start
bun run test:all

# Use bunx for package execution
bunx create-next-app@latest
bunx shadcn-ui@latest add button
```

## 🎯 Critical Blocker Prevention Guidelines

### 🚨 NEVER CREATE THESE ISSUES:

**TypeScript Errors:**

- Missing prop types in components (ALWAYS define interfaces)
- Undefined imports/exports (ALWAYS check module resolution)
- Type assertion without validation (use type guards)
- Any type usage (use proper typing)

**Test Failures:**

- Tests without proper mocks (ALWAYS mock external dependencies)
- Hanging test runners (ALWAYS cleanup timers/promises)
- Missing test utilities exports (ALWAYS export test helpers)
- Memory leaks in tests (ALWAYS cleanup resources)

**Build Issues:**

- Circular dependencies (ALWAYS check import chains)
- Missing dependencies (ALWAYS install before use)
- Environment variable mismatches (ALWAYS validate config)
- Asset optimization failures (ALWAYS test production builds)

### 🔧 MANDATORY QUALITY CHECKS:

**Before ANY Code Changes:**

1. Run `bun run typecheck` - MUST pass
2. Run `bun run lint` - MUST pass
3. Run `bun run test` - MUST pass
4. Run `bun run build` - MUST pass

**Component Development:**

- ALWAYS define TypeScript interfaces for props
- ALWAYS add proper error boundaries
- ALWAYS implement proper loading states
- ALWAYS add accessibility attributes
- ALWAYS write unit tests

**Hook Development:**

- ALWAYS use proper cleanup (useEffect returns)
- ALWAYS handle edge cases (null/undefined)
- ALWAYS memoize expensive operations
- ALWAYS add proper TypeScript generics
- ALWAYS test all hook states

### 🎯 SYSTEMATIC ERROR RESOLUTION:

**Error Categorization Priority:**

1. **CRITICAL** - Blocks builds/deployment
2. **HIGH** - Blocks development workflow
3. **MEDIUM** - Reduces code quality
4. **LOW** - Style/optimization issues

**Batch Fix Strategy:**

1. Group similar errors together
2. Fix dependencies before dependents
3. Test after each batch
4. Document patterns for future prevention

### 📋 CODE REVIEW CHECKLIST:

**TypeScript:**

- [ ] All props have proper interfaces
- [ ] No `any` types used
- [ ] Proper error handling
- [ ] Type guards for runtime checks

**React:**

- [ ] Proper component memoization
- [ ] Cleanup in useEffect
- [ ] Error boundaries present
- [ ] Accessibility attributes

**Testing:**

- [ ] Unit tests for all functions
- [ ] Integration tests for workflows
- [ ] Proper mocking strategy
- [ ] Test cleanup implemented

**Performance:**

- [ ] Lazy loading where appropriate
- [ ] Proper bundle splitting
- [ ] Optimized re-renders
- [ ] Memory leak prevention

### 🛠️ AUTOMATION BEST PRACTICES:

**Script Development:**

- ALWAYS add progress reporting
- ALWAYS implement retry logic
- ALWAYS validate inputs
- ALWAYS log operations
- ALWAYS handle errors gracefully

**CI/CD Integration:**

- ALWAYS run quality gates
- ALWAYS test in clean environments
- ALWAYS validate dependencies
- ALWAYS check for security issues
- ALWAYS optimize build times

### 🔍 DEBUGGING STRATEGIES:

**TypeScript Errors:**

1. Check import/export statements
2. Verify interface definitions
3. Validate type compatibility
4. Review generic constraints

**Test Failures:**

1. Check for async operations
2. Verify mock implementations
3. Review test environment setup
4. Check for resource cleanup

**Build Issues:**

1. Verify dependency versions
2. Check configuration files
3. Review environment variables
4. Validate asset paths

### 📊 PERFORMANCE MONITORING:

**Key Metrics to Track:**

- TypeScript compilation time
- Test execution time
- Build duration
- Bundle size
- Memory usage

**Optimization Targets:**

- < 5s TypeScript compilation
- < 30s test suite execution
- < 60s production build
- < 1MB main bundle size
- < 100MB memory usage

---

_Updated with comprehensive blocker prevention guidelines - Follow these rules to maintain code quality and prevent future issues_
