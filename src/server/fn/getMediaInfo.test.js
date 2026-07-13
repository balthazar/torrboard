const { test } = require('node:test')
const assert = require('node:assert')

const { pickSearchMatch } = require('./getMediaInfo')

// Real OMDB `s=` payloads (trimmed) for the two titles that were mismatching.
const RICK = [
  { Title: 'Rick and Morty', Year: '2013–', imdbID: 'tt2861424', Type: 'series' },
  { Title: 'Rick and Morty: The Anime', Year: '2024', imdbID: 'tt28466465', Type: 'series' },
  { Title: 'Rick and Morty: Summer\'s Sleepover', Year: '2022', imdbID: 'tt23575228', Type: 'movie' },
  { Title: 'Rick and Morty vs Genocider', Year: '2020', imdbID: 'tt13124040', Type: 'movie' },
]

const BLACK_BOX = [
  { Title: 'Black Box', Year: '2021', imdbID: 'tt10341034', Type: 'movie' },
  { Title: 'Black Box', Year: '2020', imdbID: 'tt12298506', Type: 'movie' },
  { Title: 'Black Box Diaries', Year: '2024', imdbID: 'tt30227076', Type: 'movie' },
  { Title: 'Black Box', Year: '2014', imdbID: 'tt2968404', Type: 'series' },
]

test('exact title beats a newer namesake (Rick and Morty, not the 2024 anime)', () => {
  assert.equal(pickSearchMatch(RICK, 'Rick and Morty').imdbID, 'tt2861424')
})

test('exact title beats a newer superstring (Black Box, not Black Box Diaries)', () => {
  const pick = pickSearchMatch(BLACK_BOX, 'Black Box')
  assert.notEqual(pick.imdbID, 'tt30227076') // never "Black Box Diaries"
  assert.equal(pick.Title, 'Black Box')
})

test('with no year, the newest of the exact-title matches wins', () => {
  // Two exact "Black Box" movies (2020, 2021) -> the recent one.
  assert.equal(pickSearchMatch(BLACK_BOX, 'Black Box').imdbID, 'tt10341034')
})

test('a supplied year picks the closest exact-title match, not the newest', () => {
  assert.equal(pickSearchMatch(BLACK_BOX, 'Black Box', 2020).imdbID, 'tt12298506')
})

test('title match is punctuation/case insensitive', () => {
  assert.equal(pickSearchMatch(RICK, 'rick.and.morty').imdbID, 'tt2861424')
})

test('falls back to closest/newest when nothing matches exactly', () => {
  // No exact "Blackbox" -> old behaviour: newest plausible title.
  assert.equal(pickSearchMatch(BLACK_BOX, 'Blackbox').imdbID, 'tt30227076')
})

test('drops episode/game types, keeping movie/series', () => {
  const withNoise = [
    { Title: 'Black Box', Year: '2021', imdbID: 'tt10341034', Type: 'movie' },
    { Title: 'Black Box', Year: '2099', imdbID: 'ttEP', Type: 'episode' },
  ]
  assert.equal(pickSearchMatch(withNoise, 'Black Box').imdbID, 'tt10341034')
})

test('returns null for an empty result set', () => {
  assert.equal(pickSearchMatch([], 'Black Box'), null)
})
