const {test,expect} = require('@playwright/test');

const url = 'http://127.0.0.1:4173';

async function openWorld(page){
  await page.locator('[data-view="home"]').first().click();
  await page.locator('[data-go="world"]').first().click();
}

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
  await page.locator('[data-view="home"]').first().click();
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
  await page.locator('[data-view="home"]').first().click();
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
  await expect(page.locator('body')).toHaveAttribute('data-music-scene','exam');
  await expect(page.getByRole('heading',{name:'ข้อ 1 จาก 20'})).toBeVisible();
  await page.locator('[data-exam-answer="1"]').click();
  await expect(page.locator('.question-grid button.answered')).toHaveCount(1);
});

test('soundtrack raises the tempo for a boss encounter and exposes the current theme',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('[data-view="exam"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-music-scene','exam');
  await page.locator('#bossExam').click();
  await expect(page.locator('body')).toHaveAttribute('data-music-scene','boss');
  await expect(page.locator('body')).toHaveAttribute('data-music-bpm','178');
  const music=await page.evaluate(()=>window.teacherQuestMusicDebug.getState());
  expect(music.label).toBe('ศึกบอสสนามสอบ');
  expect(music.bpm).toBeGreaterThan(150);
});

test('all 20 zones show complete-bank and optional short modes with unique pixel icons',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  const modules = await page.evaluate(()=>window.GAME_DATA.modules.map(module=>{
    const questions=window.GAME_DATA.questions.filter(question=>question.module===module.id);
    return {id:module.id,total:questions.length,boss:questions.filter(question=>question.difficulty!=="ง่าย").length};
  }));
  await openWorld(page);
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
  await openWorld(page);
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
  await page.locator('[data-view="home"]').first().click();
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
    adventure:'โลกครูเควสต์',
    world:'สารบัญด่าน',
    practice:'ฝึกด่วน',
    exam:'สนามสอบใหญ่',
    raid:'เชื่อมออนไลน์ก่อนรวมทีม',
    review:'ห้องทบทวน',
    codex:'คัมภีร์ความรู้',
    profile:'สมุดนักผจญภัย',
    home:'ฝึกให้แม่น'
  };
  for(const [view,text] of Object.entries(expected)){
    if(view==='world') await openWorld(page);
    else await page.locator(`[data-view="${view}"]`).first().click();
    await expect(page.locator('#view')).toContainText(text);
  }
  expect(pageErrors).toEqual([]);
});

test('mobile navigation is a usable 3 by 3 grid with no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(url,{waitUntil:'networkidle'});
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await expect(page.locator('.nav-list')).toBeVisible();
  await expect(page.locator('.nav-list .nav-btn')).toHaveCount(9);
  await expect(page.locator('.nav-btn[data-view="adventure"]')).toContainText('เล่นเนื้อเรื่อง');
  await expect(page.locator('.nav-btn[data-view="raid"]')).toContainText('Raid ทีม');
  await expect(page.locator('#v4CoachBtn')).toContainText('ศูนย์ฝึกอัจฉริยะ');
  const metrics = await page.locator('.nav-list .nav-btn').evaluateAll(buttons=>{
    const boxes=buttons.map(button=>button.getBoundingClientRect());
    const rows=[...new Set(boxes.map(box=>Math.round(box.top)))];
    return {rows:rows.length,perRow:rows.map(top=>boxes.filter(box=>Math.round(box.top)===top).length),minHeight:Math.min(...boxes.map(box=>box.height))};
  });
  expect(metrics.rows).toBe(3);
  expect(metrics.perRow).toEqual([3,3,3]);
  expect(metrics.minHeight).toBeGreaterThanOrEqual(56);
  const topButtonHeights = await page.locator('.top-btn').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().height));
  expect(Math.min(...topButtonHeights)).toBeGreaterThanOrEqual(44);

  for(const view of ['adventure','world','practice','exam','raid','review','codex','profile','home']){
    if(view==='world') await openWorld(page);
    else await page.locator(`[data-view="${view}"]`).first().click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),`${view} overflowed horizontally`).toBe(false);
  }
  await openWorld(page);
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
  const optionHeight=await page.locator('.option').first().evaluate(element=>element.getBoundingClientRect().height);
  expect(optionHeight).toBeGreaterThanOrEqual(60);
});

test('pixel adventure supports held movement, map, portal interaction and complete quest entry',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await expect(page.locator('#adventureCanvas')).toBeVisible();
  await expect(page.locator('.nav-btn[data-view="adventure"]')).toHaveClass(/active/);
  await expect(page.locator('body')).toHaveAttribute('data-music-scene','plaza');
  const music=await page.evaluate(()=>window.teacherQuestMusicDebug.getState());
  expect(music.themeCount).toBeGreaterThanOrEqual(12);
  expect(music.bpm).toBe(110);
  const initial=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  expect(initial.district).toBe('ลานสถาบันครูเควสต์');

  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ก',code:'KeyD',bubbles:true})));
  await page.waitForTimeout(250);
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keyup',{key:'ก',code:'KeyD',bubbles:true})));
  await page.waitForTimeout(50);
  const thaiLayoutMoved=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  expect(thaiLayoutMoved.x-initial.x).toBeGreaterThan(25);

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);
  const moved=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  expect(moved.x-initial.x).toBeGreaterThan(35);
  expect(moved.moving).toBe(false);

  expect(await page.evaluate(()=>window.teacherQuestAdventureDebug.teleportToModule('measure'))).toBe(true);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(850);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);
  const blockedByLake=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  expect(blockedByLake.x).toBeLessThan(826);

  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ท',code:'KeyM',bubbles:true})));
  await expect(page.locator('#adventureMapPanel')).toBeVisible();
  await expect(page.locator('.map-district')).toHaveCount(4);
  await expect(page.locator('.map-zone')).toHaveCount(20);
  await page.locator('[data-map-close]').click();

  expect(await page.evaluate(()=>window.teacherQuestAdventureDebug.teleportToModule('research'))).toBe(true);
  await expect(page.locator('body')).toHaveAttribute('data-music-scene','district0');
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ำ',code:'KeyE',bubbles:true})));
  await expect(page.locator('#adventureDialogue')).toBeVisible();
  await expect(page.locator('#adventureDialogueTitle')).toHaveText('วิจัยในชั้นเรียน');
  await expect(page.locator('[data-adventure-mode="complete"]')).toContainText('พิชิตครบ 20 ข้อ');
  await expect(page.locator('[data-adventure-mode="quick"]')).toContainText('ฝึกด่วน 10 ข้อ');
  await expect(page.locator('[data-adventure-mode="boss"]')).toContainText('ท้าบอส 15 ข้อ');
  await page.locator('[data-adventure-mode="complete"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-music-scene','battle');
  await expect(page.locator('#musicBtn')).toHaveAttribute('title',/วิจัยในชั้นเรียน/);
  await expect(page.locator('.battle-center strong')).toHaveText('1 / 20');
  await expect(page.locator('.question-meta .chip.gold')).toContainText('วิจัยในชั้นเรียน');
  expect(pageErrors).toEqual([]);
});

test('adventure selection, readable labels and map foundation stay synchronized',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'});
  const initial=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  expect(initial.mapId).toBe('academy-plaza');
  expect(initial.worldVersion).toBe(2);
  expect(initial.mapIds).toEqual(['academy-plaza']);
  expect(initial.playerLabel).toMatch(/^คุณ • /);
  await expect(page.locator('.adventure-mini-legend')).toContainText('คุณ');
  await expect(page.locator('.adventure-mini-legend')).toContainText('เพื่อน');

  expect(await page.evaluate(()=>window.teacherQuestAdventureDebug.teleportToModule('research'))).toBe(true);
  await page.evaluate(()=>window.teacherQuestAdventureDebug.interact());
  const complete=page.locator('[data-adventure-mode="complete"]');
  const quick=page.locator('[data-adventure-mode="quick"]');
  const boss=page.locator('[data-adventure-mode="boss"]');
  await expect(complete).toBeFocused();
  await expect(complete).toHaveClass(/active-choice/);
  await page.keyboard.press('ArrowRight');
  await expect(quick).toBeFocused();
  await expect(quick).toHaveClass(/active-choice/);
  await expect(complete).not.toHaveClass(/active-choice/);
  await boss.hover();
  await expect(boss).toHaveClass(/active-choice/);
  await expect(quick).not.toHaveClass(/active-choice/);
  await page.keyboard.press('Home');
  await expect(complete).toBeFocused();
  await page.keyboard.press('Escape');

  expect(await page.evaluate(()=>window.teacherQuestAdventureDebug.teleportToTree(0))).toBe(true);
  const byTree=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  expect(byTree.fadedTrees).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});

test('touch d-pad holds movement and adventure position survives navigation',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(url,{waitUntil:'networkidle'});
  const before=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  const right=page.locator('[data-move="right"]');
  await right.dispatchEvent('pointerdown',{pointerId:7,pointerType:'touch',isPrimary:true});
  await page.waitForTimeout(300);
  await right.dispatchEvent('pointerup',{pointerId:7,pointerType:'touch',isPrimary:true});
  await page.waitForTimeout(50);
  const after=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  expect(after.x-before.x).toBeGreaterThan(25);
  const canvas=page.locator('#adventureCanvas');
  const box=await canvas.boundingBox();
  await canvas.dispatchEvent('pointerdown',{pointerId:9,pointerType:'touch',isPrimary:true,clientX:box.x+box.width*.7,clientY:box.y+box.height*.55});
  await page.waitForTimeout(450);
  const tapped=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  expect(tapped.x-after.x).toBeGreaterThan(20);
  expect(tapped.tapTarget).not.toBeNull();
  await page.locator('[data-view="home"]').first().click();
  await page.locator('[data-view="adventure"]').first().click();
  const restored=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  expect(Math.abs(restored.x-tapped.x)).toBeLessThan(15);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('teacherQuestAdventure_v1')));
  expect(stored.version).toBe(2);
  expect(stored.mapId).toBe('academy-plaza');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false);
});

test('offline avatar editor saves a pixel identity without requiring Firebase',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'});
  await expect(page.locator('#onlineBtn')).toContainText('ตั้งค่าออนไลน์');
  await page.locator('#onlineBtn').click();
  await expect(page.getByRole('heading',{name:'บัญชีและตัวละคร'})).toBeVisible();
  await expect(page.locator('.online-alert')).toContainText('ผูก Firebase Project ฟรี');
  await expect(page.locator('.avatar-swatch')).toHaveCount(23);
  await page.locator('#onlineNickname').fill('ครูพิกเซล');
  await page.locator('[data-avatar-group="style"][data-avatar-value="spike"]').click();
  await page.locator('[data-avatar-group="shirt"]').nth(1).click();
  await page.locator('#saveOnlineProfile').click();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('#playerName')).toHaveText('ครูพิกเซล');
  await expect(page.locator('#avatarArt .pixel-avatar')).toHaveAttribute('data-hair-style','spike');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('teacherQuestOnlineProfile_v1')).nickname)).toBe('ครูพิกเซล');

  await page.reload({waitUntil:'networkidle'});
  await expect(page.locator('#playerName')).toHaveText('ครูพิกเซล');
  await page.locator('[data-view="home"]').first().click();
  await page.locator('#quickStart').click();
  await expect(page.locator('#playerFighter .custom-fighter')).toHaveAttribute('data-hair-style','spike');
  expect(pageErrors).toEqual([]);
});

test('configured production mode requires Google before the game becomes interactive',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  await expect(page.locator('#authGate')).toBeHidden();
  await page.evaluate(()=>window.teacherQuestOnlineDebug.simulate({
    configured:true,
    phase:'signin-required',
    connected:false,
    user:{uid:'anonymous-test',isAnonymous:true,provider:'guest'},
    error:''
  }));
  await expect(page.locator('#authGate')).toBeVisible();
  await expect(page.locator('#authGateGoogle')).toBeEnabled();
  await expect(page.locator('#authGateStatus')).toContainText('ต้องเข้าสู่ระบบ');
  await expect(page.locator('body')).toHaveClass(/auth-locked/);
  expect(await page.locator('.app-shell').evaluate(element=>element.inert)).toBe(true);

  await page.evaluate(()=>window.teacherQuestOnlineDebug.simulate({
    configured:true,
    phase:'online',
    connected:true,
    user:{uid:'google-test',isAnonymous:false,provider:'google'},
    cloudSync:'saved',
    error:''
  }));
  await expect(page.locator('#authGate')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/auth-locked/);
  expect(await page.locator('.app-shell').evaluate(element=>element.inert)).toBe(false);

  await page.evaluate(()=>{window.TeacherQuestOnline.diagnosePermissions=async()=>({
    ok:false,claims:{emailVerified:true,signInProvider:'google.com',googleLinked:true,rulesRevision:'2026-07-18.1'},
    steps:[
      {key:'profile-read',label:'อ่านโปรไฟล์ของตนเอง',ok:true,error:''},
      {key:'progress-read',label:'อ่านความคืบหน้าบน Cloud',ok:true,error:''},
      {key:'presence-write',label:'เขียนสถานะออนไลน์',ok:true,error:''},
      {key:'raid-create',label:'สร้างและลบห้อง Raid ทดสอบ',ok:false,error:'Firebase ปฏิเสธการสร้างห้อง Raid โดยเฉพาะ'}
    ]
  });});
  await page.locator('#onlineBtn').click();
  await page.locator('#runFirebaseDiagnostic').click();
  await expect(page.locator('.firebase-diagnostic-result')).toContainText('พบจุดที่ถูกปฏิเสธ');
  await expect(page.locator('.firebase-diagnostic-steps .fail')).toContainText('สร้างและลบห้อง Raid ทดสอบ');
  await expect(page.locator('.firebase-diagnostic-result')).not.toContainText('@');
  await page.locator('#modalClose').click();

  await page.evaluate(()=>window.teacherQuestOnlineDebug.simulate({
    configured:true,
    phase:'error',
    connected:false,
    user:{uid:'google-test',isAnonymous:false,provider:'google'},
    error:'Firebase ปฏิเสธสิทธิ์'
  }));
  await page.locator('#onlineBtn').click();
  await expect(page.locator('#retryOnline')).toBeVisible();
  await expect(page.locator('.online-alert.error')).toContainText('Firebase ปฏิเสธสิทธิ์');
});

test('Google login lifecycle prevents duplicate profile attachment and resets online listeners',async({page})=>{
  const response=await page.request.get(`${url}/online.js`);
  expect(response.ok()).toBe(true);
  const source=await response.text();
  const signInSection=source.slice(source.indexOf('async function signInGoogle'),source.indexOf('async function signOut'));
  expect(source).toContain('let attachPromise=null');
  expect(source).toContain('databaseModule.runTransaction(profileRef');
  expect(source).toContain('function clearCounterSubscriptions()');
  expect(source).toContain('async function reconnect()');
  expect(source).toContain('async function finalizeGoogleSignIn(user)');
  expect(source).toContain('await user.getIdToken(true)');
  expect(source).toContain('if(attachingUid===user.uid && attachPromise)');
  expect(signInSection).toContain('await finalizeGoogleSignIn(result.user)');
  expect(signInSection).not.toContain('await attachUser(result.user)');
});

test('cloud progress bundle restores game history and adventure position',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  const restored=await page.evaluate(()=>{
    localStorage.setItem('teacherQuest2569_v3',JSON.stringify({
      xp:88,coins:31,maxCombo:4,records:{101:{attempts:2,correct:1,lastWrong:true}},
      bookmarks:[101],examHistory:[],daily:{date:'2026-07-17',count:2},settings:{music:true,sound:true,volume:.35,reduced:false},
      lastModule:'research',localUpdatedAt:100
    }));
    localStorage.setItem('teacherQuestAdventure_v1',JSON.stringify({x:777,y:444,direction:'left'}));
    const bundle=window.teacherQuestOnlineDebug.buildProgressBundle(200);
    localStorage.removeItem('teacherQuest2569_v3');
    localStorage.removeItem('teacherQuestAdventure_v1');
    const applied=window.teacherQuestOnlineDebug.applyProgressBundle({...bundle,updatedAt:300});
    return {
      applied,
      game:JSON.parse(localStorage.getItem('teacherQuest2569_v3')),
      adventure:JSON.parse(localStorage.getItem('teacherQuestAdventure_v1'))
    };
  });
  expect(restored.applied).toBe(true);
  expect(restored.game.xp).toBe(88);
  expect(restored.game.records['101'].correct).toBe(1);
  expect(restored.game.localUpdatedAt).toBe(300);
  expect(restored.adventure).toEqual({x:777,y:444,direction:'left'});
  await expect(page.locator('#topCoins')).toHaveText('31');
});

test('Firebase errors tell the owner exactly which console setting to fix',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  const messages=await page.evaluate(()=>({
    rules:window.teacherQuestOnlineDebug.formatError({code:'PERMISSION_DENIED',message:'Permission denied'}),
    raid:window.teacherQuestOnlineDebug.formatError({code:'PERMISSION_DENIED',message:'Permission denied'},'raid-create'),
    domain:window.teacherQuestOnlineDebug.formatError({code:'auth/unauthorized-domain'})
  }));
  expect(messages.rules).toContain('Realtime Database → Rules');
  expect(messages.rules).toContain('กด Publish');
  expect(messages.rules).toContain('เข้าสู่ระบบ Google ใหม่');
  expect(messages.raid).toContain('การสร้างห้อง Raid');
  expect(messages.raid).toContain('ตรวจสิทธิ์ Firebase');
  expect(messages.domain).toContain('Authorized domains');
});

test('Raid rules validate new sibling values during room creation and atomic start',async({page})=>{
  const [rulesResponse,onlineResponse]=await Promise.all([
    page.request.get(`${url}/database.rules.json`),
    page.request.get(`${url}/online.js`)
  ]);
  expect(rulesResponse.ok()).toBe(true);
  expect(onlineResponse.ok()).toBe(true);
  const rules=await rulesResponse.json();
  const startedAt=rules.rules.raids['$room'].meta.startedAt['.validate'];
  const bossHp=rules.rules.raids['$room'].meta.bossHp['.validate'];
  const online=await onlineResponse.text();
  expect(startedAt).toContain("newData.parent().child('status').val() === 'active'");
  expect(bossHp).toContain("newData.parent().child('bossMax')");
  expect(bossHp).not.toContain("root.child('raids').child($room).child('meta').child('bossMax')");
  expect(online).toContain('const createdAt=databaseModule.serverTimestamp()');
  expect(online).toContain('function raidRoomPayload(moduleId="all")');
  expect(online).toContain('getIdTokenResult(true)');
  expect(online).toContain('await user.getIdToken(true)');
});

test('online presence renders simulated friends only in the active pixel world',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'});
  const local=await page.evaluate(()=>window.teacherQuestAdventureDebug.getState());
  await page.evaluate(({x,y})=>window.teacherQuestOnlineDebug.simulate({
    configured:true,phase:'online',connected:true,onlineCount:3,totalPlayers:42,
    user:{uid:'local-player',isAnonymous:false,provider:'google'},cloudSync:'saved',
    profile:{nickname:'ผู้ทดสอบ',avatar:{skin:'#f4c7a1',hair:'#815226',shirt:'#5c55a7',accent:'#58e7b2',style:'cap'}},
    zonePlayers:[
      {uid:'friend-a',nickname:'เพื่อนเอ',x:x+45,y:y+10,direction:'left',moving:true,avatar:{shirt:'#1e8a72',accent:'#ffd45c',style:'spike'}},
      {uid:'friend-b',nickname:'เพื่อนบี',x:x-55,y:y-5,direction:'right',moving:false,avatar:{shirt:'#9b4e86',accent:'#ff72b4',style:'long'}}
    ]
  }),local);
  await expect(page.locator('#onlineCount')).toHaveText('3 ออนไลน์');
  await expect(page.locator('#adventureOnlineStatus')).toContainText('พื้นที่นี้ 3 คน');
  await expect(page.locator('#avatarArt .pixel-avatar')).toHaveAttribute('data-hair-style','cap');
  await expect.poll(()=>page.evaluate(()=>window.teacherQuestAdventureDebug.getState().remotePlayers)).toBe(2);
  await page.locator('[data-view="home"]').first().click();
  await expect.poll(()=>page.evaluate(()=>window.teacherQuestOnlineDebug.getState().zone)).toBe(null);
  expect(pageErrors).toEqual([]);
});

test('multiplayer Raid renders a live lobby, deterministic questions and responsive team battle',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'});
  const raid={
    code:'ABC234',isHost:true,memberCount:2,
    meta:{hostUid:'raid-host',status:'lobby',bossHp:480,bossMax:480,moduleId:'research',questionSeed:2569,createdAt:Date.now(),startedAt:0},
    members:[
      {uid:'raid-host',nickname:'ครูหัวหน้าทีม',avatar:{shirt:'#3d68af',accent:'#ffd45c',style:'cap'},score:0,correct:0,joinedAt:1,lastSeen:Date.now(),ready:true,emote:'go',emoteAt:Date.now()},
      {uid:'raid-friend',nickname:'เพื่อนร่วมทีม',avatar:{shirt:'#1e8a72',accent:'#58e7b2',style:'spike'},score:0,correct:0,joinedAt:2,lastSeen:Date.now(),ready:true,emote:'',emoteAt:0}
    ]
  };
  await page.evaluate(raidState=>window.teacherQuestOnlineDebug.simulate({
    configured:true,phase:'online',connected:true,user:{uid:'raid-host',isAnonymous:false,provider:'google'},
    profile:{nickname:'ครูหัวหน้าทีม',avatar:{shirt:'#3d68af',accent:'#ffd45c',style:'cap'}},raid:raidState,error:''
  }),raid);
  await page.evaluate(()=>window.teacherQuestRaidDebug.render());
  await expect(page.locator('.raid-lobby')).toBeVisible();
  await expect(page.locator('.raid-lobby h1')).toContainText('ABC234');
  await expect(page.locator('.raid-member')).toHaveCount(2);
  await expect(page.locator('#startRaid')).toContainText('2 คน');
  await expect(page.locator('.raid-emote-pop')).toContainText('ลุย!');

  raid.meta.status='active';
  raid.meta.startedAt=Date.now();
  await page.evaluate(raidState=>window.teacherQuestOnlineDebug.simulate({raid:raidState}),raid);
  await expect(page.locator('.raid-battle')).toBeVisible();
  await expect(page.locator('.raid-boss-art').first()).toBeVisible();
  await expect(page.locator('[data-raid-answer]')).toHaveCount(4);
  await expect(page.locator('#raidTeamList .raid-member')).toHaveCount(2);
  await expect(page.locator('body')).toHaveAttribute('data-music-scene','boss');
  const ids=await page.evaluate(()=>window.teacherQuestRaidDebug.questionIds());
  expect(ids).toHaveLength(20);
  expect(new Set(ids).size).toBe(20);

  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false);
  const mobileTargets=await page.evaluate(()=>({
    option:document.querySelector('[data-raid-answer]')?.getBoundingClientRect().height || 0,
    attack:document.querySelector('#raidAttackBtn')?.getBoundingClientRect().height || 0
  }));
  expect(mobileTargets.option).toBeGreaterThanOrEqual(56);
  expect(mobileTargets.attack).toBeGreaterThanOrEqual(50);
  expect(pageErrors).toEqual([]);
});

test('Raid creation failures stay visible and link to the Firebase diagnostic',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
    window.teacherQuestOnlineDebug.simulate({configured:true,phase:'online',connected:true,user:{uid:'raid-host',isAnonymous:false,provider:'google'},profile:{nickname:'ครูหัวหน้าทีม',avatar:{}},raid:null,error:''});
    window.TeacherQuestOnline.createRaid=async()=>{throw new Error('Firebase ปฏิเสธการสร้างห้อง Raid โดยเฉพาะ');};
    window.teacherQuestRaidDebug.render();
  });
  await page.locator('#createRaidBtn').click();
  await expect(page.locator('#raidEntryError')).toBeVisible();
  await expect(page.locator('#raidEntryErrorText')).toContainText('ปฏิเสธการสร้างห้อง Raid');
  await page.locator('#raidEntryDiagnostic').click();
  await expect(page.getByRole('heading',{name:'บัญชีและตัวละคร'})).toBeVisible();
  await expect(page.locator('#runFirebaseDiagnostic')).toBeVisible();
});

test('Raid answers trigger Pixel attacks and boss counter actions',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  const raid={
    code:'HJK567',isHost:true,memberCount:1,
    meta:{hostUid:'raid-host',status:'active',bossHp:480,bossMax:480,moduleId:'research',questionSeed:42,createdAt:Date.now(),startedAt:Date.now()},
    members:[{uid:'raid-host',nickname:'ครูนักบุก',avatar:{},score:0,correct:0,joinedAt:1,lastSeen:Date.now(),ready:true,emote:'',emoteAt:0}]
  };
  await page.evaluate(raidState=>{
    window.teacherQuestOnlineDebug.simulate({configured:true,phase:'online',connected:true,user:{uid:'raid-host',isAnonymous:false,provider:'google'},profile:{nickname:'ครูนักบุก',avatar:{}},raid:raidState,error:''});
    window.TeacherQuestOnline.attackRaid=async damage=>({damage,bossHp:480-damage,bossMax:480});
    window.teacherQuestRaidDebug.render();
  },raid);
  const first=await page.evaluate(()=>{
    const id=window.teacherQuestRaidDebug.questionIds()[0];
    const question=window.GAME_DATA.questions.find(item=>item.id===id);
    return {answer:question.answer};
  });
  await page.locator(`[data-raid-answer="${first.answer}"]`).click();
  await page.locator('#raidAttackBtn').click();
  await expect(page.locator('#raidArena')).toHaveAttribute('data-battle-action','attack');
  await expect(page.locator('#raidAction')).toContainText('CO-OP STRIKE');
  await expect(page.locator('#raidFeedback')).toContainText('โจมตีทีมสำเร็จ');
  await page.locator('#nextRaidQuestion').click();

  const second=await page.evaluate(()=>{
    const game=window.teacherQuestRaidDebug.getState();
    const id=window.teacherQuestRaidDebug.questionIds()[game.index%20];
    const question=window.GAME_DATA.questions.find(item=>item.id===id);
    return {wrong:(question.answer+1)%4};
  });
  await page.locator(`[data-raid-answer="${second.wrong}"]`).click();
  await page.locator('#raidAttackBtn').click();
  await expect(page.locator('#raidArena')).toHaveAttribute('data-battle-action','counter');
  await expect(page.locator('#raidAction')).toContainText('BOSS COUNTER');
  await expect(page.locator('#raidFeedback')).toContainText('บอสสวนกลับ');
  await page.locator('#nextRaidQuestion').click();
  await page.evaluate(()=>{window.TeacherQuestOnline.attackRaid=async damage=>({damage,bossHp:0,bossMax:480});});
  const finisher=await page.evaluate(()=>{
    const game=window.teacherQuestRaidDebug.getState();
    const ids=window.teacherQuestRaidDebug.questionIds();
    return window.GAME_DATA.questions.find(item=>item.id===ids[game.index%ids.length]).answer;
  });
  await page.locator(`[data-raid-answer="${finisher}"]`).click();
  await page.locator('#raidAttackBtn').click();
  await expect(page.locator('#raidArena')).toHaveAttribute('data-battle-action','finisher');
  await expect(page.locator('#raidAction')).toContainText('TEAM FINISHER');
  await expect(page.locator('#raidBoss')).toHaveClass(/defeated/,{timeout:1500});
});

test('Raid victory grants its cloud-saved reward only once per room',async({page})=>{
  await page.goto(url,{waitUntil:'networkidle'});
  const raid={
    code:'MNP789',isHost:false,memberCount:2,
    meta:{hostUid:'friend-host',status:'active',bossHp:0,bossMax:480,moduleId:'all',questionSeed:99,createdAt:Date.now(),startedAt:Date.now()},
    members:[
      {uid:'friend-host',nickname:'หัวหน้าทีม',avatar:{},score:270,correct:10,joinedAt:1,lastSeen:Date.now(),ready:true,emote:'gg',emoteAt:Date.now()},
      {uid:'raid-local',nickname:'ผู้ช่วยทีม',avatar:{},score:210,correct:8,joinedAt:2,lastSeen:Date.now(),ready:true,emote:'',emoteAt:0}
    ]
  };
  await page.evaluate(raidState=>{
    window.teacherQuestOnlineDebug.simulate({configured:true,phase:'online',connected:true,user:{uid:'raid-local',isAnonymous:false,provider:'google'},profile:{nickname:'ผู้ช่วยทีม',avatar:{}},raid:raidState,error:''});
    window.teacherQuestRaidDebug.render();
  },raid);
  await expect(page.locator('.raid-victory')).toBeVisible();
  await expect(page.locator('.victory-banner')).toHaveText('RAID CLEAR!');
  await expect(page.locator('#topCoins')).toHaveText('50');
  await page.evaluate(()=>window.teacherQuestRaidDebug.render());
  await expect(page.locator('#topCoins')).toHaveText('50');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('teacherQuest2569_v3')));
  expect(saved.raidWins).toBe(1);
  expect(saved.raidRewards).toEqual(['MNP789']);
});
