import { test, expect, type Page } from '@playwright/test';

async function saved(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: 'Đã lưu trên thiết bị' })).toBeAttached();
}
async function start(page: Page) {
  await page.goto('./#/subjects/mln122');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kinh tế chính trị Mác – Lênin');
  await page.getByRole('button', { name: 'Bắt đầu luyện tập' }).click();
  await expect(page).toHaveURL(/\/MLN\.FE-122\/#\/practice$/);
}

test('Pages supports deep links, correct asset paths, reload and private browser progress', async ({ page, browser }) => {
  const failedAssets: string[] = [], errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().includes('/assets/')) failedAssets.push(response.url()); });
  await start(page);
  await page.getByRole('group', { name: 'Các lựa chọn' }).getByRole('button', { name: /^D / }).click();
  await page.getByRole('button', { name: 'Kiểm tra đáp án' }).click();
  await expect(page.getByText(/Chính xác!/)).toBeVisible(); await saved(page); await page.reload();
  await expect(page.getByText(/Chính xác!/)).toBeVisible();
  await page.goto('./#/statistics');
  await expect(page.locator('.stat-card').filter({ hasText: 'Lượt trả lời' }).locator('.stat-value')).toHaveText('1');
  await page.goto('./#/questions'); await expect(page.getByText('Tìm thấy 526 câu hỏi', { exact: true })).toBeVisible();
  await expect(page.locator('script[src]')).toHaveAttribute('src', /^\/MLN\.FE-122\/assets\//);
  expect(failedAssets).toEqual([]); expect(errors).toEqual([]);
  const isolated = await browser.newContext();
  try {
    const other = await isolated.newPage();
    await other.goto('http://127.0.0.1:5173/MLN.FE-122/#/practice');
    await expect(other.getByRole('heading', { name: 'Chưa có buổi học đang mở' })).toBeVisible();
  } finally { await isolated.close(); }
});

test('Pages exam navigation and submission keep the repository prefix', async ({ page }) => {
  await page.goto('./#/exam');
  await page.getByLabel('Số câu hỏi', { exact: true }).fill('1');
  await page.getByLabel('Trộn thứ tự câu hỏi').uncheck();
  await page.getByRole('button', { name: 'Bắt đầu thi thử' }).click();
  await expect(page).toHaveURL(/\/MLN\.FE-122\/#\/exam\//);
  await page.getByRole('group', { name: 'Các lựa chọn' }).getByRole('button', { name: /^D / }).click();
  await saved(page); await page.reload();
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận nộp bài' }).click();
  await expect(page.getByRole('heading', { name: 'Kết quả thi thử' })).toBeVisible();
  await saved(page); await page.reload();
  await expect(page.getByText('Đáp án đúng: D', { exact: true })).toBeVisible();
});

test('Pages preserves import preview query parameters, backup and settings', async ({ page }) => {
  await page.goto('./#/questions?import=1');
  await expect(page.getByRole('dialog', { name: 'Nhập bộ câu hỏi mới' })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng hộp thoại' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/MLN\.FE-122\/#\/questions$/);
  await page.goto('./#/settings');
  await page.getByRole('combobox', { name: 'Giao diện', exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'Lưu cài đặt' }).click(); await saved(page);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất toàn bộ dữ liệu' }).click();
  const path = await (await downloaded).path(); expect(path).toBeTruthy();
  await page.getByLabel('Chọn file backup JSON').setInputFiles(path!);
  await page.getByRole('button', { name: 'Xác nhận ghi đè và khôi phục' }).click();
  await expect(page.getByText('Đã khôi phục dữ liệu thành công.')).toBeVisible();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
