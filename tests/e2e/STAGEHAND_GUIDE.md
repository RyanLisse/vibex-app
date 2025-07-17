# Stagehand AI Testing Guide

## Overview

This guide covers the comprehensive Stagehand AI testing setup implemented in this project. Stagehand is an AI-powered browser automation framework that allows you to write tests using natural language descriptions alongside traditional Playwright functionality.

## Configuration

### Main Configuration (`stagehand.config.ts`)

The main configuration file provides:

- **Environment-aware settings** (Local vs Browserbase)
- **AI model configuration** (OpenAI GPT-4o by default)
- **Performance monitoring** and metrics collection
- **Structured data schemas** for consistent data extraction
- **Utility functions** for common testing patterns

### Environment Variables

Required environment variables:

```env
# AI Model
OPENAI_API_KEY=your_openai_api_key_here

# Browserbase (optional, for cloud testing)
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_browserbase_project_id

# Debug settings
STAGEHAND_DEBUG=true
DEBUG_DOM=false
VERBOSE=false
```

## Test Structure

### Fixtures (`fixtures/base.fixture.ts`)

Enhanced fixtures provide:

- **Stagehand instance** with proper configuration
- **Schema validation** for structured data extraction
- **Test utilities** for common operations
- **Metrics collection** for performance monitoring
- **AI action wrapper** with retry logic and error handling

### Page Objects

Enhanced page objects in `page-objects/` directory:

- **BasePage**: Common functionality with AI-powered methods
- **HomePage**: Home page specific interactions
- **TaskPage**: Task management interactions
- **EnvironmentsPage**: Environment management interactions

### Test Utilities (`helpers/test-utils.ts`)

Utility functions for:

- **Screenshot management** with timestamps
- **Test data generation** for forms and scenarios
- **Network simulation** for error testing
- **Environment setup** and cleanup
- **Retry logic** with exponential backoff

## AI-Powered Testing Patterns

### 1. Basic AI Interactions

```typescript
// Click using natural language
await ai.act({ action: 'click', description: 'primary submit button' })

// Fill forms with natural language
await ai.act({
  action: 'fill',
  description: 'email input field',
  value: 'test@example.com'
})

// Extract information
const pageTitle = await ai.extract({
  description: 'the main page title'
})

// Observe page state
const isLoaded = await ai.observe({
  description: 'page is fully loaded with all content visible'
})
```

### 2. Structured Data Extraction

```typescript
// Extract structured data with schema validation
const taskData = await utils.extractWithSchema(
  stagehand,
  'task information including id, title, status, and timestamp',
  schemas.TaskDataSchema
)

// Validate the extracted data
expect(taskData.title).toBeTruthy()
expect(taskData.status).toBe('pending')
```

### 3. Performance Testing with AI

```typescript
// Measure action performance
const { result, metrics } = await basePage.measureAction(async () => {
  await ai.act({ action: 'click', description: 'submit button' })
})

console.log('Action took:', metrics.duration, 'ms')
```

### 4. Accessibility Testing

```typescript
// Comprehensive accessibility validation
const accessibilityData = await basePage.validateAccessibility()

expect(accessibilityData.hasAltText).toBeTruthy()
expect(accessibilityData.hasProperHeadings).toBeTruthy()
expect(accessibilityData.hasKeyboardNavigation).toBeTruthy()
```

### 5. Visual Regression Testing

```typescript
// AI-powered visual analysis
const layoutAnalysis = await ai.extract({
  description: 'detailed layout analysis including header, content, and footer positioning'
})

// Visual consistency validation
const visuallyConsistent = await ai.observe({
  description: 'page appearance is visually consistent with expected design'
})
```

## Test Examples

### 1. Basic Workflow Testing (`example.spec.ts`)

Demonstrates:
- Natural language interactions
- Form validation
- Data extraction
- Error handling
- Performance testing

### 2. Advanced Testing (`ai-powered-advanced.spec.ts`)

Advanced patterns including:
- Multi-step workflow testing
- Comprehensive accessibility auditing
- Performance monitoring with AI insights
- Cross-browser compatibility testing
- Error handling and recovery
- State management across multiple pages

### 3. Visual Regression Testing (`visual-regression-ai.spec.ts`)

Visual testing capabilities:
- Responsive design validation
- Component visual consistency
- Dark mode testing
- Animation and transition validation
- Cross-browser visual consistency
- Form state visual validation
- Loading state testing
- Baseline comparison with AI analysis

## Best Practices

### 1. Writing Effective AI Descriptions

**Good:**
```typescript
await ai.act({ action: 'click', description: 'primary blue submit button in the task creation form' })
```

**Bad:**
```typescript
await ai.act({ action: 'click', description: 'button' })
```

### 2. Error Handling

```typescript
try {
  await ai.act({ action: 'click', description: 'submit button' })
} catch (error) {
  // Log the error with context
  console.error('Failed to click submit button:', error)
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'error-screenshot.png' })
  
  // Attempt alternative action
  await ai.act({ action: 'click', description: 'alternative submit button' })
}
```

### 3. Performance Optimization

```typescript
// Use structured data extraction for better performance
const data = await utils.extractWithSchema(
  stagehand,
  'specific data description',
  MyDataSchema
)

// Batch multiple observations
const [isVisible, isEnabled, hasContent] = await Promise.all([
  ai.observe({ description: 'element is visible' }),
  ai.observe({ description: 'element is enabled' }),
  ai.observe({ description: 'element has content' })
])
```

### 4. Debugging

Enable debug mode for detailed logging:

```bash
STAGEHAND_DEBUG=true npm run test:e2e
```

This provides:
- Detailed AI action logs
- Performance metrics
- Error context
- Screenshot captures

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Stagehand Tests
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    BROWSERBASE_API_KEY: ${{ secrets.BROWSERBASE_API_KEY }}
    BROWSERBASE_PROJECT_ID: ${{ secrets.BROWSERBASE_PROJECT_ID }}
    CI: true
  run: npm run test:e2e
```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific Stagehand tests
npm run test:e2e tests/e2e/ai-powered-advanced.spec.ts

# Run with debug output
STAGEHAND_DEBUG=true npm run test:e2e

# Run in headed mode for development
npm run test:e2e:headed
```

## Troubleshooting

### Common Issues

1. **AI model rate limiting**
   - Solution: Implement retry logic with exponential backoff
   - Use caching for repeated queries

2. **Element not found**
   - Solution: Use more specific descriptions
   - Wait for page stability before actions

3. **Performance issues**
   - Solution: Enable caching in configuration
   - Use structured data extraction
   - Batch multiple operations

4. **Flaky tests**
   - Solution: Implement proper waiting strategies
   - Use retry logic for critical actions
   - Validate page state before actions

### Debug Strategies

1. **Enable verbose logging**
   ```typescript
   const stagehand = new Stagehand({
     ...config,
     verbose: 2,
     debugDom: true
   })
   ```

2. **Take screenshots at each step**
   ```typescript
   await takeTimestampedScreenshot(page, 'step-1-before-action')
   await ai.act({ action: 'click', description: 'button' })
   await takeTimestampedScreenshot(page, 'step-2-after-action')
   ```

3. **Use metrics to identify bottlenecks**
   ```typescript
   console.log('AI actions:', metrics.actions.map(a => ({
     type: a.type,
     duration: a.duration,
     success: a.success
   })))
   ```

## Extending the Framework

### Adding New Schemas

```typescript
export const CustomDataSchema = z.object({
  field1: z.string(),
  field2: z.number(),
  field3: z.boolean().optional(),
})

// Use in tests
const data = await utils.extractWithSchema(
  stagehand,
  'custom data description',
  CustomDataSchema
)
```

### Creating Custom Utilities

```typescript
export const CustomUtils = {
  async validateCustomElement(stagehand: Stagehand, elementDescription: string) {
    const exists = await stagehand.observe({ description: elementDescription })
    const isVisible = await stagehand.observe({ description: `${elementDescription} is visible` })
    const isEnabled = await stagehand.observe({ description: `${elementDescription} is enabled` })
    
    return { exists, isVisible, isEnabled }
  }
}
```

## Future Enhancements

Planned improvements:

1. **Visual diff comparison** with AI analysis
2. **Automated test generation** from user stories
3. **Performance regression detection** with AI insights
4. **Cross-platform testing** automation
5. **Integration with design systems** validation
6. **Accessibility audit** automation
7. **Load testing** with AI-powered monitoring

## Resources

- [Stagehand Documentation](https://docs.stagehand.dev)
- [Playwright Documentation](https://playwright.dev)
- [Project Test Examples](./tests/e2e/)
- [Configuration Reference](../../../stagehand.config.ts)