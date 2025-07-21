// Vitest type declarations

import type { 
  describe as vitestDescribe,
  it as vitestIt,
  test as vitestTest,
  expect as vitestExpect,
  beforeEach as vitestBeforeEach,
  afterEach as vitestAfterEach,
  beforeAll as vitestBeforeAll,
  afterAll as vitestAfterAll,
  vi as vitestVi,
  Mock,
  MockedFunction,
  SpyInstance
} from 'vitest';

declare global {
  // Vitest globals
  const describe: typeof vitestDescribe;
  const it: typeof vitestIt;
  const test: typeof vitestTest;
  const expect: typeof vitestExpect;
  const beforeEach: typeof vitestBeforeEach;
  const afterEach: typeof vitestAfterEach;
  const beforeAll: typeof vitestBeforeAll;
  const afterAll: typeof vitestAfterAll;
  const vi: typeof vitestVi;

  // Additional test utilities
  type MockFunction<T extends (...args: any[]) => any> = MockedFunction<T>;
  type SpyFunction<T extends (...args: any[]) => any> = SpyInstance<Parameters<T>, ReturnType<T>>;

  // Test context types
  interface TestContext {
    task: {
      name: string;
      suite?: {
        name: string;
      };
    };
  }

  // Common test data types
  interface TestUser {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
  }

  interface TestTask {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
    userId: string;
  }

  interface TestEnvironment {
    id: string;
    name: string;
    type: 'development' | 'staging' | 'production';
    variables: Record<string, string>;
  }

  // Mock factory types
  interface MockFactory {
    createUser(overrides?: Partial<TestUser>): TestUser;
    createTask(overrides?: Partial<TestTask>): TestTask;
    createEnvironment(overrides?: Partial<TestEnvironment>): TestEnvironment;
  }

  // Test utilities
  interface TestUtils {
    waitFor: (fn: () => boolean | Promise<boolean>, timeout?: number) => Promise<void>;
    sleep: (ms: number) => Promise<void>;
    mockTimers: () => void;
    restoreTimers: () => void;
  }
}

export {};
