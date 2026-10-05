import { test, expect } from '@playwright/test';

test.use({ channel: 'msedge' });

test('login-form-controls', async ({ page }) => {
  await page.route("**/*", async route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === "http://127.0.0.1:5175") {
      await route.continue();
    } else {
      await route.abort("blockedbyclient");
    }
  });
  await page.goto('http://127.0.0.1:5175');
  await page.getByRole('button', { name: 'Show password' }).click();
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
});
