const tokenize = s =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

// Fraction of `input` tokens that line up with `target`. A token counts as a
// match on exact equality or a shared prefix of length >= 2 (handles
// US/USA, journeys/journey, etc).
const directionalScore = (input, target) => {
  if (!input.length) return 0
  let hits = 0
  for (const it of input) {
    const matched = target.some(tt => {
      if (it === tt) return true
      if (it.length >= 2 && tt.length >= 2 && (tt.startsWith(it) || it.startsWith(tt))) {
        return true
      }
      return false
    })
    if (matched) hits++
  }
  return hits / input.length
}

// F1-style symmetric score: precision (input tokens that hit target) and
// recall (target tokens that hit input), combined. Penalises candidates
// with extra unmatched tokens so a short title beats a longer one when the
// query is short, instead of tying on precision alone.
const fuzzyScore = (input, target) => {
  const precision = directionalScore(input, target)
  const recall = directionalScore(target, input)
  if (precision + recall === 0) return 0
  return (2 * precision * recall) / (precision + recall)
}

// Normalize a title for equality: lowercase, punctuation/spacing collapsed.
// So "Rick and Morty" == "rick.and.morty" but != "Rick and Morty: The Anime".
const normTitle = s =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Relevance of `candidate` to the `query` title, 0..1. An exact normalized
// match is always 1 so it outranks any fuzzy near-miss.
const titleScore = (query, candidate) => {
  if (!query || !candidate) return 0
  if (normTitle(query) === normTitle(candidate)) return 1
  return fuzzyScore(tokenize(query), tokenize(candidate))
}

const parseYear = y => parseInt(String(y || '').match(/\d{4}/), 10) || 0

// Below this a candidate is a namesake that merely shares words with the
// query ("X" vs "The X of Y"), not the work we asked for.
const MIN_TITLE_SCORE = 0.75

// Whether a lookup result can be trusted outright: the title matches and,
// when the torrent carried a year, the result is within a year of it (release
// dates drift by one between festival/theatrical/streaming).
const isConfident = (query, year, candidateTitle, candidateYear) => {
  if (titleScore(query, candidateTitle) < MIN_TITLE_SCORE) return false
  if (!year) return true
  const y = parseYear(candidateYear)
  return !!y && Math.abs(y - parseInt(year, 10)) <= 1
}

module.exports = { tokenize, fuzzyScore, normTitle, titleScore, parseYear, isConfident }
