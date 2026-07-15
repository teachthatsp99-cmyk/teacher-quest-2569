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

test('V4 smart coach, items, backup and account entry work', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });

  await expect(page.locator('#v4CoachBtn')).toBeVisible();
  await page.locator('#v4CoachBtn').click();
  await expect(page.getByText('ศูนย์ฝึก', { exact: false }).first()).toBeVisible();
  const mixedMode = page.locator('.v4-mode[data-v4-mode="mixed"]');
  await expect(mixedMode).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-v4-action="export"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/teacher-quest-backup/);

  await mixedMode.click();
  await expect(page.locator('.v4-option')).toHaveCount(4);
  await page.locator('[data-v4-item="eliminate"]').click();
  await expect(page.locator('.v4-option.eliminated')).toHaveCount(1);
  await page.locator('.v4-option:not(.eliminated)').first().click();
  await expect(page.locator('.v4-feedback')).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#cloudAccountBtn').click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.getByText('ยังต้องใส่ค่าจาก Firebase')).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test('mobile layout has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await expect(page.locator('.nav-list')).toBeVisible();
  await expect(page.locator('#cloudAccountBtn')).toBeHidden();
  await expect(page.locator('#v4CoachBtn')).toBeVisible();
});
