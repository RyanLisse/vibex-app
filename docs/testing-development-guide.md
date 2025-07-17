# Comprehensive Next.js Testing Framework Implementation Guide (2025)

## Introduction

This guide provides a complete implementation strategy for setting up a modern Next.js project with a comprehensive testing framework, incorporating the latest tools and best practices as of 2025. The guide integrates multiple testing layers, quality tools, and development workflows to create a robust, scalable development environment.

## Project Architecture Overview

This implementation follows a **vertical slicing architecture** pattern, organizing code by features rather than technical layers, combined with **Test-Driven Development (TDD)** workflows and **Git worktrees** for efficient parallel development.

## Complete Project Setup

### Step 1: Initialize Next.js Project with Bun

```bash
# Create new Next.js project with TypeScript and Tailwind using Bun
bunx create-next-app@latest my-app --typescript --tailwind --app --use-bun
cd my-app
```

### Step 2: Install All Dependencies with Bun

```bash
# Core dependencies
bun add zod @browserbasehq/sdk

# Testing frameworks
bun add -D vitest @vitejs/plugin-react jsdom
bun add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
bun add -D @playwright/test
bun add -D @browserbasehq/stagehand

# Storybook
bunx storybook@latest init

# Code quality tools
bun add -D --exact @biomejs/biome
bun add -D commitizen cz-conventional-changelog
bun add -D semantic-release @semantic-release/git @semantic-release/changelog @semantic-release/github
bun add -D husky @commitlint/cli @commitlint/config-conventional

# Additional tools
bun add -D vite-tsconfig-paths
```

### Step 3: Install Global Tools

```bash
# Install Qlty CLI
bun add -g qlty

# Install commitizen globally (recommended)
bun add -g commitizen

# Install Playwright browsers
bunx playwright install
```

## Project Structure

```
my-app/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .husky/
│   ├── commit-msg
│   ├── pre-commit
│   └── pre-push
├── .qlty/
│   └── qlty.toml
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── vitest.setup.ts
├── .vscode/
│   ├── settings.json
│   └── extensions.json
├── e2e/
│   ├── fixtures/
│   ├── page-objects/
│   ├── playwright/
│   └── stagehand/
├── src/
│   ├── app/
│   │   ├── stagehand/
│   │   │   ├── main.ts
│   │   │   ├── client.tsx
│   │   │   └── page.tsx
│   │   └── api/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   └── [other-features]/
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   └── utils/
│   └── test/
│       └── setup.ts
├── .env.local
├── biome.json
├── commitlint.config.js
├── playwright.config.ts
├── vitest.config.ts
├── vitest.workspace.ts
└── package.json
```

## Environment Variables

**.env.local**
```bash
# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Browserbase (for Stagehand)
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id

# Other API keys
DATABASE_URL=your_database_url
```

## Configuration Files

### 1. Storybook Configuration

**.storybook/main.ts**
```typescript
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-coverage',
  ],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  features: {
    experimentalRSC: true,
  },
  build: {
    test: {
      disabledAddons: ['@storybook/addon-docs'],
    },
  },
};

export default config;
```

### 2. Vitest Configuration

**vitest.config.ts**
```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    storybookTest({
      configDir: path.join(__dirname, '.storybook'),
      storybookScript: 'npm run storybook -- --ci',
      storybookUrl: 'http://localhost:6006',
      tags: {
        include: ['test'],
        exclude: ['experimental', 'skip-test'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      exclude: ['node_modules/', '.next/', '*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Playwright Configuration

**playwright.config.ts**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 4. Biome Configuration

**biome.json**
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

### 5. Qlty Configuration

**.qlty/qlty.toml**
```toml
[plugins]
eslint = { enabled = true, mode = "new_only" }
prettier = { enabled = false }
typescript = { enabled = true }
biome = { enabled = true }
complexity = { enabled = true }
semgrep = { enabled = true }

[sources]
default = "https://github.com/qltysh/qlty-source"

[exclude]
"node_modules/**" = true
".next/**" = true
"dist/**" = true
"build/**" = true
"coverage/**" = true
```

### 6. Commitlint Configuration

**commitlint.config.js**
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 72],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ]
    ]
  }
};
```

### 7. Semantic Release Configuration

**.releaserc.json**
```json
{
  "branches": ["main", "master"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        "npmPublish": false
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

### 8. Package.json Scripts

**package.json**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test-storybook": "vitest --project=storybook",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "lint": "biome lint --write .",
    "format": "biome format --write .",
    "check": "biome check --apply .",
    "quality:check": "qlty check --sample=10",
    "quality:fix": "qlty fmt --all",
    "type-check": "tsc --noEmit",
    "commit": "cz",
    "release": "semantic-release",
    "prepare": "husky install",
    "worktree:list": "git worktree list",
    "worktree:prune": "git worktree prune"
  }
}
```

## Stagehand Integration with Next.js

### Setting up Stagehand Server Actions

**src/app/stagehand/main.ts**
```typescript
// 🤘 Welcome to Stagehand!
// This file demonstrates how to use Stagehand with Next.js server actions
"use server";

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { Browserbase } from "@browserbasehq/sdk";

// Define schemas for data extraction
const PageDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  headings: z.array(z.string()),
  links: z.array(z.object({
    text: z.string(),
    href: z.string().url(),
  })),
});

const FormDataSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(10),
  submitted: z.boolean(),
});

/**
 * Run the main Stagehand script
 */
async function main(stagehand: Stagehand) {
  const page = stagehand.page;
  
  // Navigate to the documentation page
  await page.goto("https://docs.stagehand.dev/");
  
  // Use natural language to interact with the page
  await page.act("click the quickstart link");
  
  // Extract structured data with Zod validation
  const pageData = await page.extract({
    instruction: "extract the main heading, description, all subheadings, and all links on the page",
    schema: PageDataSchema,
  });
  
  return pageData;
}

/**
 * Initialize and run the main() function
 */
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
  const result = await main(stagehand);
  await stagehand.close();
  
  return result;
}

/**
 * Start a Browserbase session
 */
export async function startBBSession() {
  const browserbase = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY,
  });
  
  const session = await browserbase.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  });
  
  const debugUrl = await browserbase.sessions.debug(session.id);
  
  return {
    sessionId: session.id,
    debugUrl: debugUrl.debuggerFullscreenUrl,
  };
}

/**
 * Example: Form automation with validation
 */
export async function automateFormSubmission(
  sessionId: string,
  formData: z.infer<typeof FormDataSchema>
) {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    verbose: 1,
    browserbaseSessionID: sessionId,
  });
  
  await stagehand.init();
  const page = stagehand.page;
  
  // Navigate to form page
  await page.goto("/contact");
  
  // Fill form using natural language
  await page.act(`fill out the contact form with name "${formData.name}", email "${formData.email}", and message "${formData.message}"`);
  
  // Submit the form
  await page.act("click the submit button");
  
  // Verify submission
  const result = await page.extract({
    instruction: "check if the form was submitted successfully and extract any success message",
    schema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
    }),
  });
  
  await stagehand.close();
  return result;
}
```

**src/app/stagehand/client.tsx**
```typescript
"use client";

import { useState } from "react";
import { z } from "zod";
import { startBBSession, runStagehand, automateFormSubmission } from "./main";

// Client-side form schema
const ContactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof ContactFormSchema>;

export default function StagehandClient() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleStartSession = async () => {
    setLoading(true);
    try {
      const session = await startBBSession();
      setSessionId(session.sessionId);
      setDebugUrl(session.debugUrl);
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunStagehand = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const data = await runStagehand(sessionId);
      setResult(data);
    } catch (error) {
      console.error("Failed to run Stagehand:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionId) return;

    const formData = new FormData(event.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    };

    // Validate with Zod
    try {
      const validatedData = ContactFormSchema.parse(data);
      setFormErrors({});
      
      setLoading(true);
      const result = await automateFormSubmission(sessionId, {
        ...validatedData,
        submitted: false,
      });
      setResult(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Stagehand Testing Interface</h1>
      
      {!sessionId ? (
        <button
          onClick={handleStartSession}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-md disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Browserbase Session"}
        </button>
      ) : (
        <div className="space-y-8">
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-sm font-mono">Session ID: {sessionId}</p>
            {debugUrl && (
              <a
                href={debugUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Open Debug Session
              </a>
            )}
          </div>

          <div className="space-y-4">
            <button
              onClick={handleRunStagehand}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-md disabled:opacity-50"
            >
              {loading ? "Running..." : "Run Stagehand Test"}
            </button>

            <form onSubmit={handleFormSubmit} className="space-y-4 max-w-md">
              <h2 className="text-xl font-semibold">Test Form Automation</h2>
              
              <div>
                <input
                  name="name"
                  placeholder="Name"
                  className="w-full p-2 border rounded"
                  required
                />
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="w-full p-2 border rounded"
                  required
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <textarea
                  name="message"
                  placeholder="Message"
                  className="w-full p-2 border rounded"
                  rows={4}
                  required
                />
                {formErrors.message && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-3 rounded-md disabled:opacity-50"
              >
                {loading ? "Automating..." : "Automate Form Submission"}
              </button>
            </form>
          </div>

          {result && (
            <div className="bg-gray-100 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**src/app/stagehand/page.tsx**
```typescript
import StagehandClient from "./client";

export default function StagehandPage() {
  return <StagehandClient />;
}
```

## TDD Workflow Implementation

### Example: Creating a Button Component with TDD and Zod Validation

#### Step 1: Define Zod schemas

**src/features/ui/schemas/button.schema.ts**
```typescript
import { z } from 'zod';

export const ButtonVariantSchema = z.enum(['primary', 'secondary', 'outline']);
export const ButtonSizeSchema = z.enum(['sm', 'md', 'lg']);

export const ButtonPropsSchema = z.object({
  variant: ButtonVariantSchema.optional().default('primary'),
  size: ButtonSizeSchema.optional().default('md'),
  children: z.any(),
  className: z.string().optional(),
  disabled: z.boolean().optional(),
  onClick: z.function().optional(),
});

export type ButtonProps = z.infer<typeof ButtonPropsSchema>;
```

#### Step 2: Write the test first

**src/features/ui/components/Button/Button.test.tsx**
```typescript
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

  it('applies variant styles', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('validates props with Zod schema', () => {
    const validProps = {
      variant: 'primary' as const,
      size: 'md' as const,
      children: 'Test Button',
      className: 'custom-class',
      disabled: false,
    };

    const result = ButtonPropsSchema.safeParse(validProps);
    expect(result.success).toBe(true);
  });

  it('rejects invalid variant', () => {
    const invalidProps = {
      variant: 'invalid-variant',
      children: 'Test',
    };

    const result = ButtonPropsSchema.safeParse(invalidProps);
    expect(result.success).toBe(false);
  });
});
```

#### Step 3: Create the component

**src/features/ui/components/Button/Button.tsx**
```typescript
import React from 'react';
import { cn } from '@/shared/utils/cn';
import { ButtonProps, ButtonPropsSchema } from '../../schemas/button.schema';

export const Button: React.FC<ButtonProps> = (props) => {
  // Validate props at runtime (optional, useful for debugging)
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

#### Step 3: Create Storybook stories

**src/features/ui/components/Button/Button.stories.tsx**
```typescript
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from '@storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Features/UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'test'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Interactive: Story = {
  args: {
    children: 'Click me',
    variant: 'primary',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    
    await expect(button).toBeInTheDocument();
    await userEvent.click(button);
  },
};
```

## Git Worktrees Workflow

### Setting up worktrees for parallel development

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

### Managing worktrees

```bash
# List all worktrees
git worktree list

# Remove completed worktree
git worktree remove ../feature-auth

# Clean up stale worktrees
git worktree prune
```

## Zod Schema Implementation

### API Route Validation

**src/app/api/auth/login/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define request/response schemas
const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional().default(false),
});

const LoginResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['user', 'admin']),
  }).optional(),
  token: z.string().optional(),
  error: z.string().optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = LoginRequestSchema.parse(body);
    
    // Perform authentication logic
    const user = await authenticateUser(validatedData);
    
    if (user) {
      const response: LoginResponse = {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token: generateToken(user),
      };
      
      // Validate response before sending
      const validatedResponse = LoginResponseSchema.parse(response);
      return NextResponse.json(validatedResponse);
    } else {
      const response: LoginResponse = {
        success: false,
        error: 'Invalid credentials',
      };
      
      return NextResponse.json(response, { status: 401 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Form Validation Hook

**src/shared/hooks/useZodForm.ts**
```typescript
import { useForm, UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export function useZodForm<TSchema extends z.ZodType>(
  schema: TSchema,
  props?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'>
) {
  return useForm<z.infer<TSchema>>({
    ...props,
    resolver: zodResolver(schema),
  });
}
```

### Complex Form Example

**src/features/user/components/UserRegistrationForm.tsx**
```typescript
import React from 'react';
import { z } from 'zod';
import { useZodForm } from '@/shared/hooks/useZodForm';

// Complex nested schema with refinements
const UserRegistrationSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    dateOfBirth: z.string().refine((date) => {
      const age = new Date().getFullYear() - new Date(date).getFullYear();
      return age >= 18;
    }, 'You must be at least 18 years old'),
  }),
  account: z.object({
    email: z.string().email('Invalid email address'),
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  }),
  preferences: z.object({
    newsletter: z.boolean().default(false),
    notifications: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      push: z.boolean().default(false),
    }),
  }),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
}).refine((data) => data.account.password === data.account.confirmPassword, {
  message: "Passwords don't match",
  path: ['account', 'confirmPassword'],
});

type UserRegistrationData = z.infer<typeof UserRegistrationSchema>;

export function UserRegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useZodForm(UserRegistrationSchema, {
    defaultValues: {
      preferences: {
        newsletter: false,
        notifications: {
          email: true,
          sms: false,
          push: false,
        },
      },
    },
  });

  const onSubmit = async (data: UserRegistrationData) => {
    try {
      // Send validated data to API
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Registration failed');
      
      // Handle success
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Personal Information</h2>
        
        <div>
          <input
            {...register('personalInfo.firstName')}
            placeholder="First Name"
            className="w-full p-2 border rounded"
          />
          {errors.personalInfo?.firstName && (
            <p className="text-red-500 text-sm mt-1">
              {errors.personalInfo.firstName.message}
            </p>
          )}
        </div>

        <div>
          <input
            {...register('personalInfo.lastName')}
            placeholder="Last Name"
            className="w-full p-2 border rounded"
          />
          {errors.personalInfo?.lastName && (
            <p className="text-red-500 text-sm mt-1">
              {errors.personalInfo.lastName.message}
            </p>
          )}
        </div>

        <div>
          <input
            {...register('personalInfo.dateOfBirth')}
            type="date"
            className="w-full p-2 border rounded"
          />
          {errors.personalInfo?.dateOfBirth && (
            <p className="text-red-500 text-sm mt-1">
              {errors.personalInfo.dateOfBirth.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Account Details</h2>
        
        <div>
          <input
            {...register('account.email')}
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded"
          />
          {errors.account?.email && (
            <p className="text-red-500 text-sm mt-1">
              {errors.account.email.message}
            </p>
          )}
        </div>

        <div>
          <input
            {...register('account.username')}
            placeholder="Username"
            className="w-full p-2 border rounded"
          />
          {errors.account?.username && (
            <p className="text-red-500 text-sm mt-1">
              {errors.account.username.message}
            </p>
          )}
        </div>

        <div>
          <input
            {...register('account.password')}
            type="password"
            placeholder="Password"
            className="w-full p-2 border rounded"
          />
          {errors.account?.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.account.password.message}
            </p>
          )}
        </div>

        <div>
          <input
            {...register('account.confirmPassword')}
            type="password"
            placeholder="Confirm Password"
            className="w-full p-2 border rounded"
          />
          {errors.account?.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">
              {errors.account.confirmPassword.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Preferences</h2>
        
        <label className="flex items-center space-x-2">
          <input
            {...register('preferences.newsletter')}
            type="checkbox"
            className="rounded"
          />
          <span>Subscribe to newsletter</span>
        </label>

        <div className="space-y-2">
          <p className="font-medium">Notification Preferences:</p>
          
          <label className="flex items-center space-x-2">
            <input
              {...register('preferences.notifications.email')}
              type="checkbox"
              className="rounded"
            />
            <span>Email notifications</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              {...register('preferences.notifications.sms')}
              type="checkbox"
              className="rounded"
            />
            <span>SMS notifications</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              {...register('preferences.notifications.push')}
              type="checkbox"
              className="rounded"
            />
            <span>Push notifications</span>
          </label>
        </div>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            {...register('termsAccepted')}
            type="checkbox"
            className="rounded"
          />
          <span>I accept the terms and conditions</span>
        </label>
        {errors.termsAccepted && (
          <p className="text-red-500 text-sm mt-1">
            {errors.termsAccepted.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 rounded-md disabled:opacity-50"
      >
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

### Shared Validation Schemas

**src/shared/schemas/common.ts**
```typescript
import { z } from 'zod';

// Common reusable schemas
export const EmailSchema = z.string().email('Invalid email address');

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number');

export const PhoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

export const DateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('asc'),
  sortBy: z.string().optional(),
});

export const IdSchema = z.string().uuid('Invalid ID format');

export const SlugSchema = z.string()
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');
```

### Basic Playwright test

**e2e/playwright/auth.spec.ts**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email"]', 'wrong@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });
});
```

### AI-powered testing with Stagehand

**e2e/stagehand/dynamic-content.spec.ts**
```typescript
import { test } from '../fixtures/stagehand';
import { z } from 'zod';

test.describe('AI-Powered Dynamic Content Testing', () => {
  test('should handle complex form interactions', async ({ stagehand }) => {
    const page = stagehand.page;
    
    await page.goto('/contact');
    
    // Use natural language to interact
    await page.act('fill out the contact form with name "John Doe", email "john@example.com", and message "Testing the form"');
    
    // Extract and validate form data
    const formData = await page.extract({
      instruction: 'extract all form field values',
      schema: z.object({
        name: z.string(),
        email: z.string().email(),
        message: z.string(),
      }),
    });
    
    expect(formData.name).toBe('John Doe');
    expect(formData.email).toBe('john@example.com');
    
    await page.act('submit the form');
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
```

## CI/CD Pipeline

**.github/workflows/ci.yml**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Type check
        run: bun run type-check
      
      - name: Run Biome
        run: bun run check
      
      - name: Install Qlty
        run: |
          curl https://qlty.sh | bash
          echo "$HOME/.local/bin" >> $GITHUB_PATH
      
      - name: Run Qlty check
        run: qlty check --all

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-type: [unit, storybook, e2e]
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Install Playwright browsers
        if: matrix.test-type == 'e2e'
        run: bunx playwright install --with-deps
      
      - name: Run ${{ matrix.test-type }} tests
        run: |
          if [ "${{ matrix.test-type }}" = "unit" ]; then
            bun run test:coverage
          elif [ "${{ matrix.test-type }}" = "storybook" ]; then
            bun run build-storybook
            bun run test-storybook
          elif [ "${{ matrix.test-type }}" = "e2e" ]; then
            bun run build
            bun run test:e2e
          fi
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ${{ matrix.test-type }}-results
          path: |
            coverage/
            playwright-report/
            test-results/

  release:
    needs: [quality, test]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Build application
        run: bun run build
      
      - name: Run semantic release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: bunx semantic-release
```

## Git Hooks Setup

### Initialize Husky

```bash
npx husky install
```

### Create hooks

**.husky/commit-msg**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no-install commitlint --edit "$1"
```

**.husky/pre-commit**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint && npm run format && npm run type-check
```

**.husky/pre-push**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test
```

## VS Code Configuration

**.vscode/settings.json**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "qlty.enableLinting": true,
  "qlty.runOnSave": false,
  "eslint.enable": false,
  "prettier.enable": false
}
```

**.vscode/extensions.json**
```json
{
  "recommendations": [
    "biomejs.biome",
    "qlty.qlty-vscode",
    "ms-playwright.playwright",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

## Development Workflow

### 1. Starting a new feature

```bash
# Create a new worktree for the feature
git worktree add ../feature-user-profile feature/user-profile
cd ../feature-user-profile

# Install dependencies with Bun
bun install

# Start development server
bun run dev -- --port 3001

# Create feature structure
mkdir -p src/features/user-profile/{components,hooks,services,schemas,types,utils}
```

### 2. TDD cycle

1. Write failing tests
2. Implement minimal code to pass tests
3. Refactor while keeping tests green
4. Create Storybook stories
5. Write E2E tests

### 3. Committing changes

```bash
# Use commitizen for conventional commits
bun run commit

# Or use git with conventional format
git commit -m "feat(user-profile): add profile editing functionality"
```

### 4. Quality checks

```bash
# Run all quality checks
bun run lint
bun run format
bun run type-check
bun run quality:check

# Run tests
bun run test
bun run test-storybook
bun run test:e2e
```

## Best Practices

### Testing Strategy

1. **Unit Tests**: Test individual functions and components in isolation
2. **Component Tests**: Test component behavior with Storybook
3. **Integration Tests**: Test feature slices working together
4. **E2E Tests**: Test critical user journeys

### Code Organization

1. **Vertical Slices**: Organize by features, not technical layers
2. **Shared Components**: Only share truly generic components
3. **Feature Independence**: Each feature should be self-contained
4. **Clear Boundaries**: Define clear interfaces between features

### Development Process

1. **TDD First**: Always write tests before implementation
2. **Small Commits**: Make frequent, focused commits
3. **Code Reviews**: Review all code before merging
4. **Continuous Integration**: Run all tests on every push

### Performance Optimization

1. **Lazy Loading**: Load features on demand
2. **Code Splitting**: Split bundles by route
3. **Caching**: Implement proper caching strategies
4. **Monitoring**: Track performance metrics

## Conclusion

This comprehensive setup provides a modern, efficient testing and development environment for Next.js projects. The combination of:

- **Storybook** for component development and testing
- **Vitest** for fast unit testing
- **Playwright** and **Stagehand** for E2E testing
- **Biome.js** and **Qlty CLI** for code quality
- **TDD workflows** for better code design
- **Git worktrees** for parallel development
- **Vertical slicing** for better architecture
- **Conventional commits** and **semantic release** for automated versioning

Creates a robust foundation that promotes high-quality code, efficient collaboration, and faster feature delivery. The integrated CI/CD pipeline ensures that all code meets quality standards before deployment, while the development workflow supports both individual productivity and team collaboration.