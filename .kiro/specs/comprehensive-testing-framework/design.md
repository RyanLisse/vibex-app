# Design Document

## Overview

The comprehensive testing framework design implements a multi-layered testing architecture for Next.js applications using modern tools and best practices. The framework integrates Vitest for unit testing, Storybook for component development and testing, Playwright and Stagehand for end-to-end testing, Biome.js for code quality, and automated CI/CD pipelines. The design follows vertical slicing architecture principles and supports Test-Driven Development workflows.

## Architecture

### Testing Layers Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Testing Layer                        │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │   Playwright    │  │        Stagehand AI             │   │
│  │  (Traditional)  │  │    (AI-Powered Testing)         │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                Integration Testing Layer                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Storybook Component Tests                  │ │
│  │         (Component + Interaction Testing)               │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Unit Testing Layer                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Vitest                               │ │
│  │        (Functions, Hooks, Components)                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure Design

```
project-root/
├── .github/workflows/          # CI/CD pipeline configurations
│   └── ci.yml                  # Main CI/CD workflow
├── .husky/                     # Git hooks for quality gates
│   ├── commit-msg              # Conventional commit validation
│   ├── pre-commit              # Quality checks before commit
│   └── pre-push                # Test execution before push
├── .qlty/                      # Qlty CLI configuration
│   └── qlty.toml               # Quality analysis settings
├── .storybook/                 # Storybook configuration
│   ├── main.ts                 # Main Storybook config
│   ├── preview.ts              # Global decorators and parameters
│   └── vitest.setup.ts         # Storybook-Vitest integration
├── .vscode/                    # VS Code workspace settings
│   ├── settings.json           # Editor configuration
│   └── extensions.json         # Recommended extensions
├── e2e/                        # End-to-end test suites
│   ├── fixtures/               # Test data and utilities
│   ├── page-objects/           # Page object models
│   ├── playwright/             # Traditional Playwright tests
│   └── stagehand/              # AI-powered Stagehand tests
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── stagehand/          # Stagehand integration example
│   │   │   ├── main.ts         # Server actions for Stagehand
│   │   │   ├── client.tsx      # Client-side Stagehand interface
│   │   │   └── page.tsx        # Stagehand demo page
│   │   └── api/                # API routes with Zod validation
│   ├── features/               # Feature-based organization
│   │   ├── auth/               # Authentication feature
│   │   │   ├── components/     # Auth-specific components
│   │   │   ├── hooks/          # Auth-specific hooks
│   │   │   ├── services/       # Auth business logic
│   │   │   ├── schemas/        # Zod validation schemas
│   │   │   ├── types/          # TypeScript types
│   │   │   └── utils/          # Auth utilities
│   │   └── [other-features]/   # Additional features
│   ├── shared/                 # Shared utilities and components
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # Shared custom hooks
│   │   ├── schemas/            # Common Zod schemas
│   │   └── utils/              # Utility functions
│   └── test/                   # Test setup and utilities
│       └── setup.ts            # Global test configuration
├── .env.local                  # Environment variables
├── biome.json                  # Biome.js configuration
├── commitlint.config.js        # Conventional commit rules
├── playwright.config.ts        # Playwright E2E configuration
├── vitest.config.ts            # Vitest unit test configuration
├── vitest.workspace.ts         # Multi-project Vitest setup
└── package.json                # Dependencies and scripts
```

## Components and Interfaces

### 1. Testing Framework Core

#### Vitest Configuration Component

- **Purpose**: Configure unit testing environment
- **Responsibilities**:
  - Set up jsdom environment for React components
  - Configure test coverage reporting
  - Integrate with Storybook testing
  - Provide path aliases and globals
- **Interface**: `vitest.config.ts` configuration file

#### Storybook Integration Component

- **Purpose**: Component development and testing platform
- **Responsibilities**:
  - Provide component isolation and documentation
  - Enable interaction testing with @storybook/test
  - Generate visual regression tests
  - Support accessibility testing
- **Interface**: `.storybook/main.ts` and story files

#### Playwright Test Runner Component

- **Purpose**: End-to-end testing execution
- **Responsibilities**:
  - Cross-browser testing (Chrome, Firefox, Safari)
  - Visual regression testing
  - Performance testing
  - Test reporting and artifacts
- **Interface**: `playwright.config.ts` and test files

#### Stagehand AI Testing Component

- **Purpose**: AI-powered dynamic testing
- **Responsibilities**:
  - Natural language test interactions
  - Dynamic content validation
  - Complex form testing
  - Schema-based data extraction
- **Interface**: Custom fixtures and test utilities

### 2. Code Quality System

#### Biome.js Formatter/Linter Component

- **Purpose**: Code formatting and linting
- **Responsibilities**:
  - Consistent code formatting
  - ESLint-compatible linting rules
  - Import organization
  - TypeScript-aware analysis
- **Interface**: `biome.json` configuration

#### Qlty CLI Quality Gate Component

- **Purpose**: Comprehensive code quality analysis
- **Responsibilities**:
  - Multi-tool quality aggregation
  - Security vulnerability scanning
  - Code complexity analysis
  - Quality trend tracking
- **Interface**: `.qlty/qlty.toml` configuration

#### Git Hooks Integration Component

- **Purpose**: Automated quality enforcement
- **Responsibilities**:
  - Pre-commit quality checks
  - Commit message validation
  - Pre-push test execution
  - Conventional commit enforcement
- **Interface**: Husky hook scripts

### 3. CI/CD Pipeline System

#### GitHub Actions Workflow Component

- **Purpose**: Automated testing and deployment
- **Responsibilities**:
  - Parallel test execution (unit, component, E2E)
  - Quality gate enforcement
  - Automated releases
  - Artifact management
- **Interface**: `.github/workflows/ci.yml`

#### Semantic Release Component

- **Purpose**: Automated version management
- **Responsibilities**:
  - Conventional commit analysis
  - Automatic version bumping
  - Changelog generation
  - GitHub release creation
- **Interface**: `.releaserc.json` configuration

## Data Models

### Test Configuration Model

```typescript
interface TestConfig {
  environment: "jsdom" | "node";
  setupFiles: string[];
  coverage: CoverageConfig;
  globals: boolean;
}

interface CoverageConfig {
  reporter: string[];
  exclude: string[];
  threshold?: {
    global: {
      branches: number;
      functions: number;
      lines: number;
      statements: number;
    };
  };
}
```

### Storybook Story Model

```typescript
interface StoryConfig {
  title: string;
  component: React.ComponentType;
  parameters: StoryParameters;
  tags: string[];
  argTypes: ArgTypes;
}

interface StoryParameters {
  layout: "centered" | "fullscreen" | "padded";
  docs?: DocsConfig;
  a11y?: AccessibilityConfig;
}
```

### Playwright Test Model

```typescript
interface PlaywrightConfig {
  testDir: string;
  projects: BrowserProject[];
  use: PlaywrightOptions;
  webServer: WebServerConfig;
  reporter: ReporterConfig[];
}

interface BrowserProject {
  name: string;
  use: BrowserOptions;
}
```

### Quality Gate Model

```typescript
interface QualityConfig {
  plugins: Record<string, PluginConfig>;
  sources: Record<string, string>;
  exclude: Record<string, boolean>;
}

interface PluginConfig {
  enabled: boolean;
  mode?: "new_only" | "all";
}
```

### Zod Schema Models

```typescript
// Button component schema example
export const ButtonVariantSchema = z.enum(["primary", "secondary", "outline"]);
export const ButtonSizeSchema = z.enum(["sm", "md", "lg"]);

export const ButtonPropsSchema = z.object({
  variant: ButtonVariantSchema.optional().default("primary"),
  size: ButtonSizeSchema.optional().default("md"),
  children: z.any(),
  className: z.string().optional(),
  disabled: z.boolean().optional(),
  onClick: z.function().optional(),
});

// API validation schemas
const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional().default(false),
});

const LoginResponseSchema = z.object({
  success: z.boolean(),
  user: z
    .object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      role: z.enum(["user", "admin"]),
    })
    .optional(),
  token: z.string().optional(),
  error: z.string().optional(),
});

// Stagehand data extraction schemas
const PageDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  headings: z.array(z.string()),
  links: z.array(
    z.object({
      text: z.string(),
      href: z.string().url(),
    }),
  ),
});
```

### Package.json Scripts Model

```typescript
interface PackageScripts {
  // Development
  dev: "next dev";
  build: "next build";
  start: "next start";

  // Storybook
  storybook: "storybook dev -p 6006";
  "build-storybook": "storybook build";

  // Testing
  test: "vitest";
  "test:ui": "vitest --ui";
  "test:coverage": "vitest run --coverage";
  "test-storybook": "vitest --project=storybook";
  "test:e2e": "playwright test";
  "test:e2e:ui": "playwright test --ui";

  // Code Quality
  lint: "biome lint --write .";
  format: "biome format --write .";
  check: "biome check --apply .";
  "quality:check": "qlty check --sample=10";
  "quality:fix": "qlty fmt --all";
  "type-check": "tsc --noEmit";

  // Git and Release
  commit: "cz";
  release: "semantic-release";
  prepare: "husky install";

  // Git Worktrees
  "worktree:list": "git worktree list";
  "worktree:prune": "git worktree prune";
}
```

## Error Handling

### Test Execution Error Handling

- **Unit Test Failures**: Provide detailed error messages with stack traces and component state
- **E2E Test Failures**: Capture screenshots, videos, and network logs for debugging
- **Storybook Errors**: Display component errors in isolation with hot reloading
- **CI Pipeline Failures**: Generate detailed reports and prevent deployment

### Quality Gate Error Handling

- **Linting Errors**: Provide auto-fix suggestions where possible
- **Type Errors**: Display clear TypeScript error messages with file locations
- **Security Issues**: Block commits with security vulnerabilities
- **Performance Regressions**: Alert on bundle size increases or performance degradation

### Configuration Error Handling

- **Invalid Configurations**: Validate configuration files and provide helpful error messages
- **Missing Dependencies**: Check for required dependencies and provide installation instructions
- **Environment Issues**: Detect and report environment setup problems
- **Version Conflicts**: Identify and resolve dependency version conflicts

## Testing Strategy

### Unit Testing Strategy

- **Component Testing**: Test React components in isolation with React Testing Library
- **Hook Testing**: Test custom hooks with @testing-library/react-hooks
- **Utility Testing**: Test pure functions and utility modules
- **Service Testing**: Mock external dependencies and test business logic
- **Coverage Goals**: Maintain 80%+ code coverage for critical paths

### Component Testing Strategy

- **Storybook Stories**: Create stories for all UI components
- **Interaction Testing**: Test user interactions within Storybook
- **Visual Regression**: Capture and compare component screenshots
- **Accessibility Testing**: Validate WCAG compliance with @storybook/addon-a11y
- **Responsive Testing**: Test components across different viewport sizes

### Integration Testing Strategy

- **Feature Testing**: Test complete feature workflows
- **API Integration**: Test API endpoints with mock data
- **State Management**: Test state changes and side effects
- **Route Testing**: Test Next.js routing and navigation
- **Authentication Flow**: Test login/logout and protected routes

### End-to-End Testing Strategy

- **Critical User Journeys**: Test primary user workflows
- **Cross-Browser Testing**: Validate functionality across browsers
- **Performance Testing**: Monitor page load times and Core Web Vitals
- **AI-Powered Testing**: Use Stagehand for complex dynamic interactions
- **Mobile Testing**: Test responsive behavior on mobile devices

### Quality Assurance Strategy

- **Automated Quality Gates**: Enforce quality standards in CI/CD
- **Code Review Process**: Require peer review for all changes
- **Security Scanning**: Automated vulnerability detection
- **Performance Monitoring**: Track bundle size and runtime performance
- **Accessibility Compliance**: Automated and manual accessibility testing

## Implementation Phases

### Phase 1: Core Testing Setup

1. Configure Vitest for unit testing
2. Set up React Testing Library
3. Create test utilities and helpers
4. Configure coverage reporting

### Phase 2: Component Development Platform

1. Configure Storybook with Next.js
2. Set up component testing with interactions
3. Configure accessibility testing
4. Create component documentation templates

### Phase 3: End-to-End Testing

1. Configure Playwright for cross-browser testing
2. Set up Stagehand for AI-powered testing
3. Create page object models
4. Implement test fixtures and utilities

### Phase 4: Code Quality Integration

1. Configure Biome.js for linting and formatting
2. Set up Qlty CLI for quality analysis
3. Configure Git hooks with Husky
4. Set up conventional commit validation

### Phase 5: CI/CD Pipeline

1. Create GitHub Actions workflows
2. Configure parallel test execution
3. Set up automated releases with semantic-release
4. Configure artifact management and reporting

### Phase 6: Developer Experience

1. Configure VS Code settings and extensions
2. Create development scripts and utilities
3. Set up TDD workflow documentation
4. Create project templates and generators

## Detailed Configuration Examples

### Environment Variables Configuration

```bash
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Browserbase (for Stagehand)
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id

# Other API keys
DATABASE_URL=your_database_url
```

### Vitest Configuration

```typescript
import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    storybookTest({
      configDir: path.join(__dirname, ".storybook"),
      storybookScript: "npm run storybook -- --ci",
      storybookUrl: "http://localhost:6006",
      tags: {
        include: ["test"],
        exclude: ["experimental", "skip-test"],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    coverage: {
      reporter: ["text", "lcov", "html"],
      exclude: ["node_modules/", ".next/", "*.config.*"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Storybook Configuration

```typescript
import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-coverage",
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  features: {
    experimentalRSC: true,
  },
  build: {
    test: {
      disabledAddons: ["@storybook/addon-docs"],
    },
  },
};
```

### Playwright Configuration

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["junit", { outputFile: "playwright-report/results.xml" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### Biome.js Configuration

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "files": {
    "ignore": [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "public/**",
      "*.d.ts"
    ]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "a11y": {
        "recommended": true,
        "noSvgWithoutTitle": "off"
      },
      "complexity": {
        "recommended": true,
        "noExcessiveCognitiveComplexity": "warn"
      },
      "correctness": {
        "recommended": true,
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "recommended": true,
        "useImportType": "error",
        "useExportType": "error",
        "useConst": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingComma": "es5",
      "semicolons": "always"
    }
  }
}
```

## TDD Workflow Implementation

### Example Component Development Process

#### 1. Schema Definition

```typescript
// src/features/ui/schemas/button.schema.ts
import { z } from "zod";

export const ButtonVariantSchema = z.enum(["primary", "secondary", "outline"]);
export const ButtonSizeSchema = z.enum(["sm", "md", "lg"]);

export const ButtonPropsSchema = z.object({
  variant: ButtonVariantSchema.optional().default("primary"),
  size: ButtonSizeSchema.optional().default("md"),
  children: z.any(),
  className: z.string().optional(),
  disabled: z.boolean().optional(),
  onClick: z.function().optional(),
});

export type ButtonProps = z.infer<typeof ButtonPropsSchema>;
```

#### 2. Test-First Development

```typescript
// src/features/ui/components/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Button } from './Button';
import { ButtonPropsSchema } from '../../schemas/button.schema';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('validates props with Zod schema', () => {
    const validProps = {
      variant: 'primary' as const,
      size: 'md' as const,
      children: 'Test Button',
    };

    const result = ButtonPropsSchema.safeParse(validProps);
    expect(result.success).toBe(true);
  });
});
```

#### 3. Component Implementation

```typescript
// src/features/ui/components/Button/Button.tsx
import React from 'react';
import { cn } from '@/shared/utils/cn';
import { ButtonProps, ButtonPropsSchema } from '../../schemas/button.schema';

export const Button: React.FC<ButtonProps> = (props) => {
  const parsedProps = ButtonPropsSchema.parse(props);

  const {
    variant = 'primary',
    size = 'md',
    className,
    children,
    disabled,
    ...restProps
  } = parsedProps;

  const baseStyles = 'font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...restProps}
    >
      {children}
    </button>
  );
};
```

#### 4. Storybook Stories

```typescript
// src/features/ui/components/Button/Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "@storybook/test";
import { Button } from "./Button";

const meta = {
  title: "Features/UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs", "test"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "primary",
  },
};

export const Interactive: Story = {
  args: {
    children: "Click me",
    variant: "primary",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");

    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
  },
};
```

## Git Worktrees Integration

### Parallel Development Workflow

```bash
# Create worktrees for different features
git worktree add ../feature-auth feature/auth
git worktree add ../feature-dashboard feature/dashboard
git worktree add ../bugfix-navigation bugfix/navigation

# Start development servers on different ports
cd ../feature-auth && npm run dev -- --port 3001
cd ../feature-dashboard && npm run dev -- --port 3002
cd ../bugfix-navigation && npm run dev -- --port 3003
```

### Worktree Management Scripts

```json
{
  "scripts": {
    "worktree:list": "git worktree list",
    "worktree:prune": "git worktree prune",
    "worktree:create": "git worktree add",
    "worktree:remove": "git worktree remove"
  }
}
```

## Stagehand AI Testing Integration

### Server Actions Implementation

```typescript
// src/app/stagehand/main.ts
"use server";

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { Browserbase } from "@browserbasehq/sdk";

const PageDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  headings: z.array(z.string()),
  links: z.array(
    z.object({
      text: z.string(),
      href: z.string().url(),
    }),
  ),
});

export async function runStagehand(sessionId?: string) {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    verbose: 1,
    logger: console.log,
    browserbaseSessionID: sessionId,
    disablePino: true,
  });

  await stagehand.init();
  const page = stagehand.page;

  await page.goto("https://docs.stagehand.dev/");
  await page.act("click the quickstart link");

  const pageData = await page.extract({
    instruction:
      "extract the main heading, description, all subheadings, and all links on the page",
    schema: PageDataSchema,
  });

  await stagehand.close();
  return pageData;
}
```

### AI-Powered E2E Tests

```typescript
// e2e/stagehand/dynamic-content.spec.ts
import { test } from "../fixtures/stagehand";
import { z } from "zod";

test.describe("AI-Powered Dynamic Content Testing", () => {
  test("should handle complex form interactions", async ({ stagehand }) => {
    const page = stagehand.page;

    await page.goto("/contact");
    await page.act(
      'fill out the contact form with name "John Doe", email "john@example.com", and message "Testing the form"',
    );

    const formData = await page.extract({
      instruction: "extract all form field values",
      schema: z.object({
        name: z.string(),
        email: z.string().email(),
        message: z.string(),
      }),
    });

    expect(formData.name).toBe("John Doe");
    expect(formData.email).toBe("john@example.com");

    await page.act("submit the form");
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
```
