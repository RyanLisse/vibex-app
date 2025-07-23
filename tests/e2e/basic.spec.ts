import { test, expect } from '@playwright/test';

test.describe('Basic Application Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/vibex-app/i);
    
    // Check for basic content
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Basic navigation test - just ensure page doesn't crash
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });
});
