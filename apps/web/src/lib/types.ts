export type Media = { url: string; alt: string; width?: number; height?: number; caption?: string | null }
export type Article = {
  id: number | string; slug: string; title: string; titleAccent?: string | null; kicker?: string | null
  sapo?: string | null; heroImage?: Media | null; page: number; issue?: number | string | null; featured?: boolean | null
  author?: string | null; bodyHtml?: string | null
}
export type Issue = { id?: number | string; number: string; period: string; coverImage?: Media | null }
export type Foreword = { title: string; bodyHtml?: string | null; signature?: string | null }
export type Masthead = {
  board: { role: string; names: { name: string }[] }[]
  publisher?: string | null; address?: string | null; phone?: string | null
  website?: string | null; email?: string | null; coverCredit?: string | null
}
export type SiteSettings = { logoWidthDesktop: number; logoWidthMobile: number }
