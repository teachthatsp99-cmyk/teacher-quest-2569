const { test, expect } = require('@playwright/test');

test('core game flows work without browser errors', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/ครูเควสต์ 2569/);
  await expect(page.locator('#quickStart')).toBeVisible();
  await expect(page.locator('.zone')).toHaveCount(4);

  await page.locator('#quickStart').click();
  await expect(page.locator('.question-text')).toBeVisible();
  await expect(page.locator('.option')).toHaveCount(4);
  await page.locator('.option').first().click();
  await expect(page.locator('#attackBtn')).toBeEnabled();
  await page.locator('#attackBtn').click();
  await expect(page.locator('.feedback')).toBeVisible();
  await expect(page.locator('#nextBattle')).toBeVisible();

  await page.locator('[data-view="exam"]').click();
  await expect(page.locator('#quickExam')).toBeVisible();
  await page.locator('#quickExam').click();
  await expect(page.locator('.timer')).toBeVisible();
  await page.locator('[data-exam-answer="1"]').click();
  await expect(page.locator('.question-grid button.answered')).toHaveCount(1);

  expect(pageErrors).toEqual([]);
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await expect(page.locator('.nav-list')).toBeVisible();
});
