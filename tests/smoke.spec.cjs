const {test,expect} = require('@playwright/test');

const url = 'http://127.0.0.1:4173';

test('core battle flow renders graphics, feedback and a source link',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  const favicon = await page.request.get(`${url}/favicon.svg`);
  expect(favicon.ok()).toBe(true);
  await page.goto(url,{waitUntil:'networkidle'});
  await expect(page).toHaveTitle(/ครูเควสต์ 2569/);
  await expect(page.locator('#quickStart')).toBeVisible();
  await expect(page.locator('.zone')).toHaveCount(4);
  await expect(page.locator('#avatarArt')).toBeVisible();

  await page.locator('#quickStart').click();
  await expect(page.locator('.question-text')).toBeVisible();
  await expect(page.locator('.option')).toHaveCount(4);
  await expect(page.locator('.fighter')).toHaveCount(2);
  await page.locator('.option').first().click();
  await expect(page.locator('#attackBtn')).toBeEnabled();
  await page.locator('#attackBtn').click();
  await expect(page.locator('.feedback')).toBeVisible();
  await expect(page.locator('.feedback .source a')).toHaveAttribute('href',/^https:\/\//);
  await expect(page.locator('#nextBattle')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('settings modal traps focus and blocks battle keyboard shortcuts',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('#quickStart').click();
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.getByLabel('ระดับเสียง')).toBeVisible();
  await expect(page.getByLabel('ลดการเคลื่อนไหว')).toBeVisible();

  await page.getByLabel('ระดับเสียง').focus();
  await page.keyboard.press('1');
  await page.keyboard.press('Enter');
  await expect(page.locator('.option.selected')).toHaveCount(0);
  await expect(page.locator('.feedback')).toHaveCount(0);
  for(let index=0;index<10;index++) await page.keyboard.press('Tab');
  const focusStayedInside = await page.evaluate(()=>document.querySelector('#modal').contains(document.activeElement));
  expect(focusStayedInside).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('#settingsBtn')).toBeFocused();
});

test('V4 coach preserves progress when settings change and has no retired cloud controls',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('#v4CoachBtn').click();
  await expect(page.getByText('ศูนย์ฝึก',{exact:false}).first()).toBeVisible();
  await expect(page.locator('.v4-mode[data-v4-mode="weak"]')).toBeDisabled();
  await expect(page.locator('[data-v4-action="export"]')).toHaveCount(0);
  await expect(page.locator('#cloudAccountBtn')).toHaveCount(0);

  await page.locator('.v4-mode[data-v4-mode="mixed"]').click();
  await expect(page.locator('.v4-option')).toHaveCount(4);
  await page.locator('[data-v4-item="eliminate"]').click();
  await expect(page.locator('.v4-option.eliminated')).toHaveCount(1);
  await page.locator('.v4-option:not(.eliminated)').first().click();
  await expect(page.locator('.v4-feedback')).toBeVisible();
  await expect(page.locator('#dailyQuestCount')).toHaveText('1 / 10');

  await page.locator('#settingsBtn').click();
  await page.locator('#setMusic').click();
  await expect(page.locator('#dailyQuestCount')).toHaveText('1 / 10');
  await page.keyboard.press('Escape');
  expect(pageErrors).toEqual([]);
});

test('exam count follows the selected module availability',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('[data-view="exam"]').click();
  await page.locator('#examModule').selectOption('research');
  await expect(page.locator('#examAvailability')).toContainText('มี 20 ข้อ');
  await expect(page.locator('#examCount option')).toHaveCount(2);
  await expect(page.locator('#examCount')).toHaveValue('20');
  await page.locator('#startExam').click();
  await expect(page.getByRole('heading',{name:'ข้อ 1 จาก 20'})).toBeVisible();
  await page.locator('[data-exam-answer="1"]').click();
  await expect(page.locator('.question-grid button.answered')).toHaveCount(1);
});

test('all main views render without browser errors',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'});
  const expected = {
    world:'แผนที่ภารกิจ',
    practice:'สนามฝึก',
    exam:'สนามสอบใหญ่',
    review:'ห้องทบทวน',
    codex:'คัมภีร์ความรู้',
    profile:'สมุดนักผจญภัย',
    home:'ฝึกให้แม่น'
  };
  for(const [view,text] of Object.entries(expected)){
    await page.locator(`[data-view="${view}"]`).first().click();
    await expect(page.locator('#view')).toContainText(text);
  }
  expect(pageErrors).toEqual([]);
});

test('mobile navigation is a usable 4 by 2 grid with no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(url,{waitUntil:'networkidle'});
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await expect(page.locator('.nav-list')).toBeVisible();
  await expect(page.locator('.nav-list .nav-btn')).toHaveCount(8);
  await expect(page.locator('.hero-art')).toBeHidden();
  const metrics = await page.locator('.nav-list .nav-btn').evaluateAll(buttons=>{
    const boxes=buttons.map(button=>button.getBoundingClientRect());
    const rows=[...new Set(boxes.map(box=>Math.round(box.top)))];
    return {rows:rows.length,perRow:rows.map(top=>boxes.filter(box=>Math.round(box.top)===top).length),minHeight:Math.min(...boxes.map(box=>box.height))};
  });
  expect(metrics.rows).toBe(2);
  expect(metrics.perRow).toEqual([4,4]);
  expect(metrics.minHeight).toBeGreaterThanOrEqual(44);
  const topButtonHeights = await page.locator('.top-btn').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().height));
  expect(Math.min(...topButtonHeights)).toBeGreaterThanOrEqual(44);
});
