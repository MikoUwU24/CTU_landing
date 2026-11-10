import { describe, expect, it } from 'vitest'
import { vietnameseSlug } from '../src/lib/slug'

describe('vietnameseSlug', () => {
  it('strips Vietnamese diacritics and đ', () => {
    expect(vietnameseSlug('Hội họa Việt Nam đương đại')).toBe('hoi-hoa-viet-nam-duong-dai')
  })
  it('collapses punctuation and spaces', () => {
    expect(vietnameseSlug('  Dư âm — di sản, thế giới! ')).toBe('du-am-di-san-the-gioi')
  })
  it('handles uppercase Đ', () => {
    expect(vietnameseSlug('ĐẬM BẢN SẮC')).toBe('dam-ban-sac')
  })
})
