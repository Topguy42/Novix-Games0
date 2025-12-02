import { expect, test } from '@playwright/test';

test('homepage loads and has expected elements', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PeteZah/);
  // Logo image should be present
  const logo = page.locator('.header-logo img');
  await expect(logo).toBeVisible();
  const frame = page.frame({ name: 'main' }) || page.locator('#mainFrame');
  const iframeElem = page.locator('#mainFrame');
  await expect(iframeElem).toHaveAttribute('src', 'pages/home.html');
});
