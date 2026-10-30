import { test, expect, type Page } from '@playwright/test';
import raw from '../data/questions.json' with { type: 'json' };

async function startPractice(page:Page) {
  await page.goto('/subjects/mln122');await expect(page.getByRole('heading',{level:1})).toHaveText('Kinh tế chính trị Mác – Lênin');
  await page.getByRole('button',{name:'Bắt đầu luyện tập'}).click();await expect(page.getByText(raw[0].question,{exact:true})).toBeVisible();
}
async function answer(page:Page,key:string){await page.getByRole('group',{name:'Các lựa chọn'}).getByRole('button',{name:new RegExp('^'+key+' ')}).click();}
async function saved(page:Page){await expect(page.getByRole('status').filter({hasText:'Đã lưu trên thiết bị'})).toBeAttached();}
test('opens dashboard, chooses a subject, practices and restores current answer after reload',async({page})=>{
  await page.goto('/');await expect(page.getByRole('heading',{name:'Một chút mỗi ngày, tiến bộ thật xa.'})).toBeVisible();
  await startPractice(page);await answer(page,'D');await saved(page);await page.reload();
  await expect(page.getByRole('group').getByRole('button',{name:/^D /})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Kiểm tra đáp án'}).click();await expect(page.getByText(/Chính xác!/)).toBeVisible();
  await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await saved(page);await page.reload();await expect(page.getByText(raw[1].question,{exact:true})).toBeVisible();
});
test('queues wrong answers and opens wrong-question review',async({page})=>{
  await startPractice(page);await answer(page,'A');await page.getByRole('button',{name:'Kiểm tra đáp án'}).click();await expect(page.getByText(/Chưa chính xác/)).toBeVisible();await saved(page);
  await page.goto('/review');await expect(page.getByText(raw[0].question,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Bắt đầu ôn tập'}).click();await answer(page,'D');await page.getByRole('button',{name:'Kiểm tra đáp án'}).click();await expect(page.getByText(/Chính xác!/)).toBeVisible();
});
test('takes an exam without answer leakage, confirms submission and reopens result history',async({page})=>{
  await page.goto('/exam');await page.getByLabel('Số câu hỏi',{exact:true}).fill('2');await page.getByLabel('Trộn thứ tự câu hỏi').uncheck();await page.getByRole('button',{name:'Bắt đầu thi thử'}).click();
  await answer(page,'D');await expect(page.getByText(/Đáp án đúng:/)).toHaveCount(0);await saved(page);const url=page.url();await page.reload();await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button',{name:'Nộp bài',exact:true}).click();await page.getByRole('button',{name:'Xác nhận nộp bài'}).click();await expect(page.getByRole('heading',{name:'Kết quả thi thử'})).toBeVisible();await expect(page.getByText('Đáp án đúng: D',{exact:true})).toBeVisible();await saved(page);await page.goto('/exam');await expect(page.getByRole('link',{name:/5.0\/10/})).toBeVisible();await page.goto(url);await expect(page.getByRole('heading',{name:'Kết quả thi thử'})).toBeVisible();
});
test('auto submits at the deadline after reopening a closed page',async({page})=>{
  await page.clock.install();await page.goto('/exam');await page.getByLabel('Số câu hỏi',{exact:true}).fill('1');await page.getByLabel('Thời gian (phút)').fill('1');await page.getByRole('button',{name:'Bắt đầu thi thử'}).click();await expect(page.getByRole('timer')).toBeVisible();await page.clock.fastForward(61000);await expect(page.getByRole('heading',{name:'Kết quả thi thử'})).toBeVisible();
});
test('exam deadline still submits while the dashboard is open',async({page})=>{
  await page.clock.install();await page.goto('/exam');await page.getByLabel('Số câu hỏi',{exact:true}).fill('1');await page.getByLabel('Thời gian (phút)').fill('1');await page.getByRole('button',{name:'Bắt đầu thi thử'}).click();await expect(page.getByRole('timer')).toBeVisible();const resultUrl=page.url();await saved(page);
  if(test.info().project.name==='mobile')await page.getByRole('button',{name:'Mở menu',exact:true}).click();
  await page.getByRole('link',{name:'Tổng quan',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.clock.fastForward(61000);await saved(page);await page.goto(resultUrl);await expect(page.getByRole('heading',{name:'Kết quả thi thử'})).toBeVisible();
});
test('imports with preview and confirmation, then exports and restores a backup',async({page})=>{
  await page.goto('/questions');await page.getByRole('button',{name:'Nhập bộ câu hỏi'}).click();await page.getByLabel('Tên môn học',{exact:true}).fill('Môn kiểm thử');await page.getByLabel('ID môn học',{exact:true}).fill('test-subject');
  await page.getByLabel('File JSON hoặc TXT').setInputFiles({name:'questions.txt',mimeType:'text/plain',buffer:Buffer.from('Câu 1: Câu nhập từ file\nA. Một\nB. Hai\nE. Năm\nĐáp án: A,E')});
  await page.getByRole('button',{name:'Xem trước dữ liệu'}).click();await expect(page.getByText('1. Câu nhập từ file')).toBeVisible();await page.getByRole('button',{name:'Xác nhận nhập 1 câu hỏi'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await saved(page);await page.getByRole('textbox',{name:'Tìm câu hỏi'}).fill('Câu nhập từ file');await expect(page.getByText('Câu nhập từ file',{exact:true})).toBeVisible();
  await page.goto('/settings');const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất toàn bộ dữ liệu'}).click();const download=await downloaded;const path=await download.path();expect(path).toBeTruthy();
  await page.getByLabel('Chọn file backup JSON').setInputFiles(path!);await expect(page.getByRole('dialog',{name:'Xem trước khôi phục backup'})).toBeVisible();await page.getByRole('button',{name:'Xác nhận ghi đè và khôi phục'}).click();await expect(page.getByText('Đã khôi phục dữ liệu thành công.')).toBeVisible();await page.goto('/subjects');await expect(page.getByRole('heading',{name:'Môn kiểm thử'})).toBeVisible();
});
test('has no horizontal overflow at the project viewport and supports keyboard selection',async({page})=>{
  await startPractice(page);await page.locator('h1').click();await page.keyboard.press('d');await expect(page.getByRole('group').getByRole('button',{name:/^D /})).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Enter');await expect(page.getByText(/Chính xác!/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
