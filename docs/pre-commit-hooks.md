# Pre-commit Hooks Configuration

This project uses Husky to enforce code quality standards before commits and pushes.

## Overview

The following hooks are configured:

### Pre-commit Hook (`.husky/pre-commit`)
Runs before each commit to ensure code quality:

1. **Code Formatting** - Checks and auto-formats code using Biome
2. **Linting** - Runs ESLint to catch code issues
3. **Type Checking** - Ensures TypeScript types are correct
4. **Unit Tests** - Runs unit tests to prevent broken code

If any check fails, the commit will be blocked until issues are fixed.

### Pre-push Hook (`.husky/pre-push`)
Runs before pushing to remote:
- Executes all tests (unit, integration, e2e)
- Runs security audit

### Commit Message Hook (`.husky/commit-msg`)
Enforces conventional commit format using commitlint.

## Conventional Commit Format

All commit messages must follow the conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Allowed Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes that don't modify src or test files
- `revert`: Revert a previous commit

### Examples:
```bash
# Good commit messages
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login redirect issue"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for auth service"

# Bad commit messages (will be rejected)
git commit -m "Fixed stuff"
git commit -m "WIP"
git commit -m "Updated files"
```

## Bypassing Hooks (Emergency Only)

If you need to bypass hooks in an emergency:

```bash
# Bypass pre-commit hook
git commit --no-verify -m "fix: emergency hotfix"

# Bypass pre-push hook
git push --no-verify
```

**Note:** Use this sparingly and only when absolutely necessary.

## Setup Instructions

The hooks are already configured. If you need to reinstall:

```bash
# Install dependencies (includes husky)
npm install

# Husky will automatically set up hooks via the prepare script
```

## Troubleshooting

### Hook not running
```bash
# Ensure husky is installed
npx husky

# Check hook permissions
chmod +x .husky/*
```

### Format check failing
```bash
# Run formatter manually
npm run format
```

### Lint errors
```bash
# Fix auto-fixable issues
npm run lint:fix
```

### Type errors
```bash
# Check TypeScript errors
npm run type-check
```

## Benefits

1. **Consistent Code Quality** - All code follows the same standards
2. **Fewer Bugs** - Tests run before code is committed
3. **Clean Git History** - Meaningful, consistent commit messages
4. **Security** - Prevents committing code with known vulnerabilities
5. **Team Efficiency** - Less time spent on code reviews for style issues