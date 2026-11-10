import { expect, test } from '@playwright/test'

test('home shows masthead, featured, grid and foreword', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByAltText('Tạp chí Mỹ thuật — Fine Arts Magazine')).toBeVisible()
  await expect(page.getByTestId('featured')).toContainText('Hội họa')
  await expect(page.getByTestId('article-card')).toHaveCount(1)
  await expect(page.locator('#loi-ngo')).toContainText('Lời ngỏ')
  await expect(page.locator('footer')).toContainText('Nguyễn Thị Cẩm Tú')
})

test('article page renders title, body and nav', async ({ page }) => {
  await page.goto('/bai/hoi-hoa-viet-nam-duong-dai')
  const title = page.getByTestId('article-title')
  await expect(title.getByRole('heading', { level: 1 })).toHaveText('Hội họa Việt Nam đương đại')
  await expect(page.locator('.art__body')).toContainText('Triển lãm')
  await expect(page.locator('.art__body')).toContainText('ắ ặ ẫ ỡ ữ đ')
  await expect(page.getByTestId('prev-next').getByRole('link')).toHaveText(/Sắc màu kí ức/)
})

test('article body is a single column on all viewports', async ({ page }) => {
  await page.goto('/bai/hoi-hoa-viet-nam-duong-dai')
  const cols = await page.locator('.art__body').evaluate((el) => getComputedStyle(el).columnCount)
  expect(['1', 'auto']).toContain(cols)
})

test('table of contents lists articles in page order', async ({ page }) => {
  await page.goto('/muc-luc')
  const items = page.getByTestId('toc-item')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Hội họa Việt Nam đương đại')
  await expect(items.nth(1)).toContainText('Sắc màu kí ức')
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
    title: document.fonts.check('400 27px Prata', 'Việt'),
    body: document.fonts.check('400 16px Roboto', 'ặ'),
    families: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')),
  }))
  expect(loaded.title).toBe(true)
  expect(loaded.body).toBe(true)
  expect(loaded.families).toEqual(expect.arrayContaining(['Roboto', 'Prata']))
  const titleFont = await page.getByTestId('article-title').getByRole('heading', { level: 1 }).evaluate((el) => getComputedStyle(el).fontFamily)
  expect(titleFont).toMatch(/^Prata/)
})

test('unknown route shows 404 page', async ({ page }) => {
  const res = await page.goto('/khong-ton-tai')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
})
