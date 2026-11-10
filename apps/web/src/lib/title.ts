export type TitlePart = { text: string; accent: boolean }

export function splitTitle(title: string, accent?: string | null): TitlePart[] {
  if (!accent) return [{ text: title, accent: false }]
  const i = title.toLowerCase().indexOf(accent.toLowerCase())
  if (i < 0) return [{ text: title, accent: false }]
  const parts: TitlePart[] = []
  if (i > 0) parts.push({ text: title.slice(0, i), accent: false })
  parts.push({ text: title.slice(i, i + accent.length), accent: true })
  if (i + accent.length < title.length) parts.push({ text: title.slice(i + accent.length), accent: false })
  return parts
}
