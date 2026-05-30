const { test } = require('node:test')
const assert = require('node:assert')

const { cleanTitle, titleCandidates } = require('./titleCandidates')

test('cleanTitle strips release junk and normalizes separators', () => {
  assert.equal(cleanTitle('Sample.Title.2003.1080p.BDRip'), 'Sample Title')
  assert.equal(cleanTitle('Sample Show Season 2 extras'), 'Sample Show')
})

test('titleCandidates returns a single candidate when there is no a.k.a.', () => {
  assert.deepEqual(titleCandidates('Sample Title'), ['Sample Title'])
})

test('titleCandidates splits a foreign "a.k.a." title into both sides', () => {
  // Accented original-language side preserved alongside the english side.
  assert.deepEqual(titleCandidates('Förëign Tîtel a.k.a. Foreign Title'), [
    'Förëign Tîtel',
    'Foreign Title',
  ])
})

test('titleCandidates keeps order so either side can be tried first', () => {
  assert.deepEqual(titleCandidates('Le Titre Original a.k.a. The Original Title'), [
    'Le Titre Original',
    'The Original Title',
  ])
})

test('titleCandidates handles "aka" without dots and dedupes equal sides', () => {
  assert.deepEqual(titleCandidates('Foo Bar aka Foo Bar'), ['Foo Bar'])
})

test('titleCandidates drops empty input', () => {
  assert.deepEqual(titleCandidates(''), [])
  assert.deepEqual(titleCandidates(undefined), [])
})
