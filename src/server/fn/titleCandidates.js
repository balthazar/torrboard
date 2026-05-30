// Strip release junk from a parsed torrent title down to something OMDB's
// exact `t=` lookup can match. Shared by the refresh cron and the manual
// omdbPass script so the cleaning logic can't drift between them.
const cleanTitle = raw =>
  raw
    // Drop SxxExx / Sxx / "Season N" / "Part N" and anything after.
    .replace(/\b(S\d{1,2}(E\d+)?|Season\s*\d+|Part\s*\d+)\b.*$/i, '')
    // Drop a release-year tail (1900-2099) and anything after.
    .replace(/\b(19|20)\d{2}\b.*$/, '')
    // Drop boilerplate tokens.
    .replace(/\b(COMPLETE|REPACK|PROPER|EXTENDED|REMUX|UNCUT)\b/gi, '')
    .replace(/\bseason\b/gi, '')
    // Normalize separators.
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ \[$/, '')
    .trim()

// Foreign releases often carry both the original-language and English title
// joined by an "a.k.a." delimiter (e.g. "<original> a.k.a. <english>").
// OMDB's exact `t=` lookup never matches the concatenation, and either side
// can be the title OMDB actually indexes, so we split on the delimiter and
// return every cleaned, non-empty variant to try in turn. The optional dots
// also catch the bare "aka" spelling. No delimiter => a single candidate.
const AKA = /\s+a\.?k\.?a\.?\s+/i

const titleCandidates = raw => {
  if (!raw) return []
  const cleaned = raw.split(AKA).map(cleanTitle).filter(Boolean)
  // Dedupe while preserving order: both sides can clean to the same string.
  return [...new Set(cleaned)]
}

module.exports = { cleanTitle, titleCandidates }
