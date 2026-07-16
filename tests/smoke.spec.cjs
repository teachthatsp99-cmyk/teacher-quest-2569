const {test,expect} = require('@playwright/test');

const url = 'http://127.0.0.1:4173';

async function submitCurrentBattleAnswer(page,{correct=true}={}){
  const answer = await page.evaluate(()=>{
    const stem=document.querySelector('.question-text')?.textContent?.trim();
    return window.GAME_DATA.questions.find(question=>question.question===stem)?.answer;
  });
  expect(Number.isInteger(answer)).toBe(true);
  const selected = correct ? answer : (answer+1)%4;
  await page.locator(`[data-answer="${selected}"]`).click();
  await page.locator('#attackBtn').click();
}

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
  await expect(page.locator('.feedback .source')).toContainText('เอกสารชุดอ้างอิง:');
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
  await expect(page.locator('.v4-mode[data-v4-mode="mixed"]')).toContainText('คลังรวม 400 • รอบ ≤10');
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

test('all 20 zones show complete-bank and optional short modes with unique pixel icons',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  const modules = await page.evaluate(()=>window.GAME_DATA.modules.map(module=>{
    const questions=window.GAME_DATA.questions.filter(question=>question.module===module.id);
    return {id:module.id,total:questions.length,boss:questions.filter(question=>question.difficulty!=="ง่าย").length};
  }));
  await page.locator('[data-view="world"]').click();
  await expect(page.locator('.zone')).toHaveCount(20);
  const iconIds = await page.locator('.zone [data-module-icon]').evaluateAll(icons=>icons.map(icon=>icon.dataset.moduleIcon));
  const iconPatterns = await page.locator('.zone [data-module-icon]').evaluateAll(icons=>icons.map(icon=>icon.innerHTML));
  expect(new Set(iconIds).size).toBe(20);
  expect(new Set(iconPatterns).size).toBe(20);
  expect(iconIds).toContain('disability');
  await expect(page.locator('body')).not.toContainText('♿');

  for(const module of modules){
    const zone=page.locator(`.zone[data-module="${module.id}"]`);
    await expect(zone.locator('.zone-session')).toHaveText(`ภารกิจหลักครบ ${module.total} ข้อ • ฝึกด่วน ${Math.min(10,module.total)} ข้อ`);
    await zone.click();
    await expect(page.locator('#modalBody')).toContainText(`คลังด่านนี้มี ${module.total} ข้อ`);
    await expect(page.locator('#zoneComplete')).toContainText(`พิชิตครบทั้งคลัง ${module.total} ข้อ`);
    await expect(page.locator('#zoneComplete')).toContainText('ครบทุกข้อ • ไม่ซ้ำในภารกิจนี้');
    await expect(page.locator('#zoneNormal')).toContainText(`ฝึกด่วน ${Math.min(10,module.total)} ข้อ`);
    await expect(page.locator('#zoneNormal')).toContainText(`สุ่มจากคลัง ${module.total} ข้อ`);
    await expect(page.locator('#zoneBoss')).toContainText(`ท้าบอส ${Math.min(15,module.boss)} ข้อ`);
    await expect(page.locator('#zoneBoss')).toContainText(`สุ่มจากโจทย์กลาง–ยาก ${module.boss} ข้อ`);
    await expect(page.locator('#modalTitle [data-module-icon]')).toHaveAttribute('data-module-icon',module.id);
    await page.locator('#modalClose').click();
  }
});

test('complete quest serves every question in a zone exactly once',async({page})=>{
  test.setTimeout(60000);
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('[data-view="world"]').click();
  await page.locator('.zone[data-module="research"]').click();
  await page.locator('#zoneComplete').click();
  await expect(page.locator('.battle-center strong')).toHaveText('1 / 20');
  const stems=[];
  for(let turn=0;turn<20;turn++){
    stems.push((await page.locator('.question-text').textContent()).trim());
    await submitCurrentBattleAnswer(page,{correct:true});
    await expect(page.locator('.feedback')).toBeVisible();
    await page.locator('#nextBattle').click();
  }
  expect(new Set(stems).size).toBe(20);
  await expect(page.locator('[data-result-action="victory"]')).toBeVisible();
  await expect(page.locator('.result-hero')).toContainText('20/20');
});

test('practice availability is scoped and never fills a short module set from other zones',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
    const research=window.GAME_DATA.questions.filter(question=>question.module==='research');
    const records=Object.fromEntries(research.map((question,index)=>[question.id,{attempts:1,correct:index===0?0:1,lastWrong:index===0}]));
    localStorage.setItem('teacherQuest2569_v3',JSON.stringify({records,lastModule:'research'}));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('[data-view="practice"]').click();
  await page.locator('#practiceModule').selectOption('research');
  await expect(page.locator('#practiceAvailability')).toContainText('คลังทั้งหมด 20 ข้อ');
  await expect(page.locator('#normalPoolText')).toContainText('สุ่ม 10 จากคลัง 20 ข้อ');
  await expect(page.locator('#bossPoolText')).toContainText('สุ่ม 15 จากโจทย์กลาง–ยาก 16 ข้อ');
  await expect(page.locator('#weakPoolText')).toContainText('สุ่มสูงสุด 1 จาก 1 ข้อ');
  await page.locator('[data-mode="weak"]').click();
  await expect(page.locator('.battle-center strong')).toHaveText('1 / 1');
  await expect(page.locator('.question-meta .chip.gold')).toContainText('วิจัยในชั้นเรียน');
  await submitCurrentBattleAnswer(page,{correct:true});
  await page.locator('#nextBattle').click();
  await expect(page.locator('[data-result-action="victory"]')).toBeVisible();
  await expect(page.locator('.victory-banner')).toHaveText('VICTORY!');
});

test('battle shows player attack, enemy counter and finishing victory actions',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('#quickStart').click();

  await submitCurrentBattleAnswer(page,{correct:true});
  await expect(page.locator('#battleArena')).toHaveAttribute('data-battle-action','attack');
  await expect(page.locator('#playerFighter')).toHaveClass(/attack/);
  await expect(page.locator('#battleAction')).toContainText('KNOWLEDGE STRIKE');
  await page.locator('#nextBattle').click();

  await submitCurrentBattleAnswer(page,{correct:false});
  await expect(page.locator('#battleArena')).toHaveAttribute('data-battle-action','counter');
  await expect(page.locator('#enemyFighter')).toHaveClass(/counter/);
  await expect(page.locator('#battleAction')).toContainText('ENEMY COUNTER');
  await page.locator('#nextBattle').click();

  for(let turn=0;turn<3;turn++){
    await submitCurrentBattleAnswer(page,{correct:true});
    if(turn<2) await page.locator('#nextBattle').click();
  }
  await expect(page.locator('#battleArena')).toHaveAttribute('data-battle-action','finisher');
  await expect(page.locator('#battleAction')).toContainText('VICTORY');
  await expect(page.locator('#enemyFighter')).toHaveClass(/defeated/);
  await expect(page.locator('#nextBattle')).toContainText('รับชัยชนะ');
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

  for(const view of ['world','practice','exam','review','codex','profile','home']){
    await page.locator(`[data-view="${view}"]`).first().click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),`${view} overflowed horizontally`).toBe(false);
  }
  await page.locator('[data-view="world"]').click();
  await page.locator('.zone[data-module="disability"]').click();
  const modalFits = await page.locator('.modal-card').evaluate(card=>{
    const box=card.getBoundingClientRect();
    return box.left>=0 && box.right<=window.innerWidth && box.width<=window.innerWidth;
  });
  expect(modalFits).toBe(true);
  await expect(page.locator('#zoneComplete')).toContainText('พิชิตครบทั้งคลัง 20 ข้อ');
  await expect(page.locator('#zoneNormal')).toContainText('สุ่มจากคลัง 20 ข้อ');
  await page.locator('#modalClose').click();
  await page.locator('[data-view="home"]').first().click();
  await page.locator('#quickStart').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),'battle overflowed horizontally').toBe(false);
});
