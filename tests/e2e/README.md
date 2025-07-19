# E2E Testing with Playwright and Stagehand

This directory contains end-to-end tests for the Codex Clone application, powered by Playwright and Stagehand AI testing framework.

## 🚀 Features

- **Multi-browser testing**: Chrome, Firefox, Safari, Edge
- **AI-powered interactions**: Natural language element selection and interaction
- **Responsive testing**: Mobile and desktop viewports
- **Page Object Model**: Maintainable test structure
- **Comprehensive coverage**: Home, environments, tasks, and integration tests
- **Visual testing**: Automated screenshots and visual regression detection
- **Accessibility testing**: AI-powered accessibility validation
- **Performance testing**: Load time and responsiveness validation

## 📁 Directory Structure

```
tests/e2e/
├── fixtures/
│   └── base.fixture.ts          # Base test fixtures with Stagehand integration
├── helpers/
│   └── test-utils.ts            # Utility functions for testing
├── page-objects/
│   ├── base.page.ts             # Base page object with AI methods
│   ├── home.page.ts             # Home page interactions
│   ├── environments.page.ts     # Environment management
│   └── task.page.ts             # Task detail page
├── screenshots/                  # Test screenshots
├── specs/
│   ├── home.spec.ts             # Home page tests
│   ├── environments.spec.ts     # Environment tests
│   ├── task.spec.ts             # Task interaction tests
│   └── integration.spec.ts      # Full workflow tests
├── example.spec.ts              # AI testing examples
├── stagehand.config.ts          # Stagehand configuration
└── README.md                    # This file
```

## 🛠️ Setup

### Prerequisites

1. **Node.js** (v18 or higher)
2. **OpenAI API Key** (for Stagehand AI features)
3. **Playwright browsers** (installed automatically)

### Installation

The dependencies are already installed as part of the main project:

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
STAGEHAND_DEBUG=true  # Optional: Enable debug logging
DEBUG_DOM=true        # Optional: Debug DOM interactions
VERBOSE=true          # Optional: Verbose logging
```

### Browser Setup

Install Playwright browsers:

```bash
npx playwright install
```

## 🧪 Running Tests

### All E2E Tests

```bash
npm run test:e2e
```

### Headed Mode (Watch Tests Run)

```bash
npm run test:e2e:headed
```

### Debug Mode (Step Through Tests)

```bash
npm run test:e2e:debug
```

### Specific Test Files

```bash
npx playwright test tests/e2e/specs/home.spec.ts
npx playwright test tests/e2e/specs/environments.spec.ts
npx playwright test tests/e2e/specs/task.spec.ts
npx playwright test tests/e2e/specs/integration.spec.ts
```

### AI Examples

```bash
npx playwright test tests/e2e/example.spec.ts
```

### Specific Browsers

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project="Mobile Chrome"
```

## 🤖 AI-Powered Testing with Stagehand

### Key Features

- **Natural Language Interactions**: Describe elements in plain English
- **Smart Element Detection**: AI finds elements even when selectors change
- **Content Extraction**: Extract text and data using natural language
- **State Observation**: Check UI state with natural language queries
- **Form Automation**: Fill forms using descriptive field names

### Example Usage

```typescript
// Click using natural language
await homePage.aiClick("submit button");

// Fill form fields descriptively
await homePage.aiFill("task description input", "My test task");

// Extract information
const title = await homePage.aiExtract("main page heading");

// Check state
const isVisible = await homePage.aiObserve("navigation menu is visible");
```

## 📋 Test Categories

### 1. Home Page Tests (`home.spec.ts`)

- Page loading and navigation
- Theme toggling
- Task creation and management
- Form validation
- Responsive design

### 2. Environment Tests (`environments.spec.ts`)

- Environment creation dialog
- Form validation
- Environment listing
- CRUD operations
- Mobile responsiveness

### 3. Task Tests (`task.spec.ts`)

- Task detail page navigation
- Message sending and receiving
- Streaming response handling
- Code block interactions
- Error handling

### 4. Integration Tests (`integration.spec.ts`)

- Full user workflows
- Cross-page navigation
- State persistence
- Multi-tab scenarios
- Browser navigation
- Error recovery

### 5. AI Examples (`example.spec.ts`)

- Natural language interactions
- Complex UI understanding
- Form validation with AI
- Accessibility testing
- Performance validation
- Error handling

## 📊 Test Reports

### HTML Report

After running tests, view the HTML report:

```bash
npx playwright show-report
```

### Test Results

- **Screenshots**: Captured on failure and saved to `tests/e2e/screenshots/`
- **Videos**: Recording of failed tests (if enabled)
- **Trace Files**: Detailed execution traces for debugging
- **Coverage**: Code coverage reports (if configured)

## 🔧 Configuration

### Playwright Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
  ],
});
```

### Stagehand Configuration (`stagehand.config.ts`)

```typescript
export const stagehandConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  headless: process.env.CI === "true",
  debugDom: process.env.DEBUG_DOM === "true",
  verbose: process.env.VERBOSE === "true",
  enableCaching: true,
};
```

## 📱 Mobile Testing

Tests automatically run on mobile viewports:

- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

Mobile-specific tests verify:

- Responsive layout
- Touch interactions
- Mobile navigation
- Performance on mobile devices

## 🎭 Page Object Model

### Base Page (`base.page.ts`)

Provides common functionality:

- Navigation methods
- Screenshot utilities
- AI interaction methods
- Wait utilities

### Specific Pages

Each page object extends `BasePage` and provides:

- Page-specific navigation
- Element interactions
- Form handling
- State validation

## 🔍 Debugging

### Debug Mode

```bash
npm run test:e2e:debug
```

### Screenshots

Screenshots are automatically taken on failure and saved to `tests/e2e/screenshots/`.

### Console Logs

Enable verbose logging:

```bash
STAGEHAND_DEBUG=true npm run test:e2e
```

### Trace Viewer

View detailed execution traces:

```bash
npx playwright show-trace trace.zip
```

## 🚀 Best Practices

### 1. Use Page Objects

```typescript
// Good
const homePage = new HomePage(page, stagehand);
await homePage.createTask("My task");

// Avoid
await page.click("#submit-button");
```

### 2. Descriptive AI Queries

```typescript
// Good
await homePage.aiClick("submit task button");

// Less clear
await homePage.aiClick("button");
```

### 3. Wait for Elements

```typescript
// Good
await homePage.waitForElement("task appears in list");

// Avoid
await page.waitForTimeout(5000);
```

### 4. Clean Test Data

```typescript
// Use generated test data
const testData = generateTestData();
await homePage.createTask(testData.taskDescription);
```

## 📈 Performance

### Load Time Testing

```typescript
const startTime = Date.now();
await homePage.goto();
const loadTime = Date.now() - startTime;
expect(loadTime).toBeLessThan(5000);
```

### Network Monitoring

```typescript
// Monitor network requests
page.on("request", (request) => {
  console.log("Request:", request.url());
});
```

## 🔒 Security Testing

### Input Validation

```typescript
// Test XSS prevention
await homePage.createTask('<script>alert("xss")</script>');
```

### Authentication

```typescript
// Test unauthorized access
await page.goto("/protected-route");
await expect(page).toHaveURL(/login/);
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Stagehand GitHub](https://github.com/browserbase/stagehand)
- [AI Testing Best Practices](https://docs.stagehand.dev/best-practices)

## 🤝 Contributing

When adding new tests:

1. Follow the page object pattern
2. Use descriptive AI queries
3. Include mobile testing
4. Add appropriate wait conditions
5. Use generated test data
6. Document complex interactions

## 📝 Example Test

```typescript
test("should create and interact with task", async ({ page, stagehand }) => {
  const homePage = new HomePage(page, stagehand);
  await homePage.goto();

  // Create task using AI
  const testData = generateTestData();
  await homePage.createTask(testData.taskDescription);

  // Verify task creation
  const taskExists = await homePage.aiObserve(
    `task containing "${testData.taskDescription}" is visible`,
  );
  expect(taskExists).toBeTruthy();

  // Navigate to task detail
  await homePage.clickTask(testData.taskDescription);

  // Interact with task
  const taskPage = new TaskPage(page, stagehand);
  await taskPage.sendMessage("Hello AI!");

  // Verify response
  const messages = await taskPage.getMessages();
  expect(messages.length).toBeGreaterThan(1);
});
```

This E2E testing setup provides comprehensive coverage with AI-powered interactions, making tests more maintainable and closer to real user behavior.
