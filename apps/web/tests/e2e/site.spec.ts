import { expect, test } from '@playwright/test'

test('home shows masthead, featured, grid and foreword', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByAltText('Tạp chí Mỹ thuật — Fine Arts Magazine')).toBeVisible()
  await expect(page.getByLabel('Số 034, kỳ 1-2/2027')).toBeVisible()
  await expect(page.getByTestId('featured')).toContainText('Hội họa')
  await expect(page.getByTestId('article-card')).toHaveCount(1)
  await expect(page.locator('#loi-ngo')).toContainText('Lời ngỏ')
  await expect(page.locator('footer')).toContainText('Nguyễn Thị Cẩm Tú')
})

test('article page renders two-tone title, body and nav', async ({ page }) => {
  await page.goto('/bai/hoi-hoa-viet-nam-duong-dai')
  const title = page.getByTestId('article-title')
  await expect(title.locator('.accent')).toHaveText('Việt Nam')
  await expect(page.locator('.art__body')).toContainText('Triển lãm')
  await expect(page.locator('.art__body')).toContainText('ắ ặ ẫ ỡ ữ đ')
  await expect(page.getByTestId('prev-next').getByRole('link')).toHaveText(/Sắc màu kí ức/)
})

test('article body uses columns on desktop only', async ({ page }, info) => {
  await page.goto('/bai/hoi-hoa-viet-nam-duong-dai')
  const cols = await page.locator('.art__body').evaluate((el) => getComputedStyle(el).columnCount)
  expect(cols).toBe(info.project.name === 'mobile' ? '1' : '3')
})

test('table of contents lists articles in page order', async ({ page }) => {
  await page.goto('/muc-luc')
  const items = page.getByTestId('toc-item')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('3')
  await expect(items.nth(1)).toContainText('5')
})

test('no horizontal overflow', async ({ page }) => {
  for (const path of ['/', '/bai/hoi-hoa-viet-nam-duong-dai', '/muc-luc']) {
    await page.goto(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})

test('fonts with Vietnamese glyphs load', async ({ page }) => {
  await page.goto('/bai/hoi-hoa-viet-nam-duong-dai')
  await page.evaluate(() => document.fonts.ready)
  const loaded = await page.evaluate(() => ({
    oswald: document.fonts.check('700 16px Oswald', 'Việt'),
    body: document.fonts.check('400 16px "Be Vietnam Pro"', 'ặ'),
  }))
  expect(loaded).toEqual({ oswald: true, body: true })
})

test('unknown route shows 404 page', async ({ page }) => {
  const res = await page.goto('/khong-ton-tai')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
})
