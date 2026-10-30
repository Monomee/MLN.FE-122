import { chromium, test, expect, type Page } from '@playwright/test';
import type { StudyData } from '../src/domain/models';
import raw from '../data/questions.json' with { type: 'json' };

async function saved(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: 'Đã lưu trên thiết bị' })).toBeAttached();
}
async function snapshot(page: Page): Promise<StudyData> {
  await saved(page);
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('mln122-study-web');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const request = db.transaction('documents').objectStore('documents').get('study');
      request.onsuccess = () => { resolve(request.result.data); db.close(); };
      request.onerror = () => { reject(request.error); db.close(); };
    };
  }));
}
async function choose(page: Page, keys: string[]) {
  for (const key of keys) await page.getByRole('group', { name: 'Các lựa chọn' }).getByRole('button', { name: new RegExp('^' + key + ' ') }).click();
}
async function check(page: Page) { await page.getByRole('button', { name: 'Kiểm tra đáp án' }).click(); }
async function start(page: Page, subject = 'mln122') {
  await page.goto(`/subjects/${subject}`);
  await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
}
async function importSubject(page: Page) {
  await page.goto('/questions');
  await page.getByRole('button', { name: 'Nhập bộ câu hỏi' }).click();
  await page.getByLabel('Tên môn học', { exact: true }).fill('Môn QA');
  await page.getByLabel('ID môn học', { exact: true }).fill('qa');
  await page.getByLabel('File JSON hoặc TXT').setInputFiles({ name: 'qa.txt', mimeType: 'text/plain', buffer: Buffer.from('Câu 1: Câu kiểm thử nhập liệu\nA. Một\nB. Hai\nE. Năm\nĐáp án: A,E') });
  await page.getByRole('button', { name: 'Xem trước dữ liệu' }).click();
  await page.getByRole('button', { name: 'Xác nhận nhập 1 câu hỏi' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await saved(page);
}

let errors: string[];
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(() => expect(errors, 'No uncaught application errors').toEqual([]));

test('bank displays all 526 original questions across pages without losing data', async ({ page }) => {
  await page.goto('/questions');
  await expect(page.getByText('Tìm thấy 526 câu hỏi', { exact: true })).toBeVisible();
  const contents: string[] = [];
  for (let i = 0; i < 18; i++) {
    await expect(page.getByText(`Trang ${i + 1}/18`, { exact: true })).toBeVisible();
    contents.push(...await page.locator('.question-open strong').allTextContents());
    if (i < 17) await page.getByRole('button', { name: 'Sau', exact: true }).click();
  }
  expect(contents).toEqual(raw.map(q => q.question));
  const d = await snapshot(page);
  expect(d.questions.map(q => ({ content: q.content, options: q.options, correct: q.correctAnswers }))).toEqual(raw.map(q => ({ content: q.question, options: q.options, correct: q.answer })));
});

test('a real multi-answer question rejects a partial set and accepts every correct key', async ({ page }) => {
  const index = raw.findIndex(q => q.answer.length > 1), q = raw[index];
  await page.goto('/questions');
  await page.getByRole('textbox', { name: 'Tìm câu hỏi' }).fill(q.question);
  await page.getByRole('button', { name: `Đánh dấu câu ${index + 1}`, exact: true }).click();
  await saved(page);
  await page.goto('/subjects/mln122');
  await page.getByRole('combobox', { name: 'Nhóm câu hỏi', exact: true }).selectOption('starred');
  await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
  await choose(page, [q.answer[0]]); await saved(page); await page.reload();
  await check(page); await expect(page.getByText(/Chưa chính xác/)).toBeVisible(); await saved(page);
  await page.goto('/review'); await page.getByRole('button', { name: 'Bắt đầu ôn tập' }).click();
  await choose(page, q.answer); await check(page); await expect(page.getByText(/Chính xác!/)).toBeVisible();
  const d = await snapshot(page); expect(d.progress[`mln122:${q.id}`]).toMatchObject({ correct: 1, wrong: 1 });
});

test('wrong answer appears after seven other answers and the queue survives reload', async ({ page }) => {
  await start(page); await choose(page, ['A']); await check(page);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  for (let i = 1; i <= 7; i++) {
    await expect(page.getByText(raw[i].question, { exact: true })).toBeVisible();
    await expect(page.getByText('Ôn lại để nhớ lâu hơn', { exact: true })).toHaveCount(0);
    await choose(page, raw[i].answer); await check(page);
    await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    if (i === 3) { await saved(page); await page.reload(); }
  }
  await expect(page.getByRole('heading', { name: 'Ôn lại để nhớ lâu hơn', exact: true })).toBeVisible();
  await expect(page.getByText(raw[0].question, { exact: true })).toBeVisible();
  await choose(page, raw[0].answer); await check(page);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await expect(page.getByText(raw[8].question, { exact: true })).toBeVisible();
  const d = await snapshot(page); expect(d.practices[d.activePracticeId!].queue).toEqual([]);
  expect(d.attempts).toHaveLength(9); expect(d.attempts.filter(a => a.mode === 'review')).toHaveLength(1);
});

test('random question and option order plus current selection restore exactly', async ({ page }) => {
  await page.goto('/subjects/mln122'); await page.getByRole('button', { name: 'Học ngẫu nhiên' }).click();
  await page.getByLabel('Số câu muốn học').fill('12'); await page.getByLabel('Seed khôi phục phiên').fill('qa-repeatable');
  await page.getByLabel('Trộn thứ tự đáp án').check(); await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
  const before = await snapshot(page), session = before.practices[before.activePracticeId!];
  expect(session.questionIds).toHaveLength(12); expect(new Set(session.questionIds).size).toBe(12);
  const q = before.questions.find(q => q.id === session.questionIds[0])!;
  await choose(page, q.correctAnswers); await saved(page); await page.reload();
  const after = await snapshot(page), restored = after.practices[after.activePracticeId!];
  expect(restored.questionIds).toEqual(session.questionIds); expect(restored.optionOrder).toEqual(session.optionOrder);
  expect(restored.selections[q.id]).toEqual(q.correctAnswers);
  expect(await page.locator('.option-key').allTextContents()).toEqual(session.optionOrder[q.id]);
  await check(page); await expect(page.getByText(/Chính xác!/)).toBeVisible();
});

test('two tabs cannot silently overwrite newer IndexedDB answers', async ({ page, context }) => {
  await start(page); await saved(page);
  const other = await context.newPage(); await other.goto('/practice');
  await expect(other.getByText(raw[0].question, { exact: true })).toBeVisible();
  await choose(page, ['D']); await check(page); await saved(page);
  await choose(other, ['A']); await expect(other.getByRole('alert').filter({ hasText: 'Một tab khác đã lưu dữ liệu mới' })).toBeVisible();
  await other.reload();
  await expect(other.getByText(/Chính xác!/)).toBeVisible();
  const d = await snapshot(other); expect(d.attempts).toHaveLength(1); expect(d.attempts[0].selected).toEqual(['D']);
  await other.close();
});

test('resetting an imported subject preserves the original subject history after reload', async ({ page }) => {
  await start(page); await choose(page, ['D']); await check(page); await saved(page);
  await importSubject(page); await start(page, 'qa'); await choose(page, ['A', 'E']); await check(page); await saved(page);
  const before = await snapshot(page); expect(before.attempts).toHaveLength(2);
  await page.goto('/settings'); await page.getByLabel('Môn cần đặt lại').selectOption('qa');
  await page.getByRole('button', { name: 'Xóa tiến trình môn đã chọn' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(el => el.matches(':modal'))).toBe(true);
  await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
  await expect(page.getByText('Đã xóa tiến trình đã chọn.')).toBeVisible(); await saved(page); await page.reload();
  const after = await snapshot(page); expect(after.progress['qa:1']).toBeUndefined();
  expect(after.progress['mln122:1']).toEqual(before.progress['mln122:1']);
  expect(after.attempts).toEqual(before.attempts.filter(a => a.subjectId === 'mln122')); expect(after.questions).toHaveLength(527);
});

test('invalid backup is rejected without losing saved answers or changing subjects', async ({ page }) => {
  await start(page); await choose(page, ['D']); await check(page); const before = await snapshot(page);
  await page.goto('/settings');
  await page.getByLabel('Chọn file backup JSON').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'mln-study-backup', version: 1, exportedAt: Date.now(), data: { ...before, activeExamId: 'missing' } })) });
  await expect(page.getByRole('alert').filter({ hasText: 'Bài thi đang mở không tồn tại' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0); await page.reload(); expect(await snapshot(page)).toEqual(before);
});

test('dark mode persists and every major page fits the desktop or mobile viewport', async ({ page }, testInfo) => {
  await page.goto('/settings'); await page.getByRole('combobox', { name: 'Giao diện', exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'Lưu cài đặt' }).click(); await expect(page.getByText('Đã lưu cài đặt.')).toBeVisible();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  for (const route of ['/', '/subjects', '/practice', '/review', '/exam', '/statistics', '/questions', '/settings']) {
    await page.goto(route); await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No overflow at ${route}`).toBe(true);
  }
  await page.goto('/'); await expect(page.locator('h1')).toBeVisible(); await page.screenshot({ path: testInfo.outputPath('dashboard-dark.png'), fullPage: true });
});

test('statistics reflect the actual correct and wrong attempts', async ({ page }, testInfo) => {
  await start(page); await choose(page, raw[0].answer); await check(page);
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  const wrong = raw[1].options.find(o => !raw[1].answer.includes(o.key))!.key;
  await choose(page, [wrong]); await check(page); await saved(page);
  await page.goto('/statistics');
  await expect(page.locator('.stat-card').filter({ hasText: 'Lượt trả lời' }).locator('.stat-value')).toHaveText('2');
  await expect(page.locator('.stat-card').filter({ hasText: 'Độ chính xác' }).locator('.stat-value')).toHaveText('50%');
  await expect(page.getByRole('img', { name: '1 đúng, 1 sai', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Hoạt động 30 ngày: 2 lượt trả lời', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('statistics.png'), fullPage: true });
});

test('primary action contrast meets WCAG AA in light and dark mode', async ({ page }) => {
  await page.goto('/settings');
  for (const mode of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Giao diện', exact: true }).selectOption(mode);
    const button = page.getByRole('button', { name: 'Lưu cài đặt' });
    await button.click(); await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
    // Measure the final theme, after the background color transition has finished.
    await button.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    const contrast = await button.evaluate(el => {
      const style = getComputedStyle(el);
      const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const a = luminance(style.color), b = luminance(style.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(contrast, `${mode} primary button contrast`).toBeGreaterThanOrEqual(4.5);
  }
});

test('IndexedDB answers survive closing and reopening a browser profile', async ({}, testInfo) => {
  const profile=testInfo.outputPath('browser-profile');
  const options={baseURL:'http://127.0.0.1:5173',viewport:testInfo.project.use.viewport};
  let context=await chromium.launchPersistentContext(profile,options);
  try {
    let page=await context.newPage();await start(page);await choose(page,['D']);await check(page);await saved(page);
    await context.close();context=await chromium.launchPersistentContext(profile,options);
    page=await context.newPage();await page.goto('/practice');
    await expect(page.getByText(/Chính xác!/)).toBeVisible();
    const d=await snapshot(page);expect(d.attempts).toHaveLength(1);expect(d.attempts[0].selected).toEqual(['D']);
  } finally {await context.close();}
});
