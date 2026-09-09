// Greeting line for the boot splash. Kept out of the component so the pool is
// one obvious list to edit, and so the pick stays a pure function of the name,
// the clock and a random source.

export const partOfDay = (date = new Date()) => {
  const hour = date.getHours()
  if (hour < 5) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  if (hour < 22) return 'evening'
  return 'night'
}

// Names are stored lowercase, and "Hello sherman." reads like a system log.
const capitalize = name => name.charAt(0).toUpperCase() + name.slice(1)

const LINES = [
  name => `Hello ${name}.`,
  name => `Welcome back, ${name}.`,
  name => `Back for more, ${name}?`,
  name => `Ready when you are, ${name}.`,
  name => `Good to see you, ${name}.`,
  name => `The future missed you, ${name}.`,
  name => `${name}. Again.`,
  // "Good night" is a goodbye, so the small hours get their own line rather
  // than wishing you well on the way in.
  (name, part) => (part === 'night' ? `Up late, ${name}?` : `Good ${part}, ${name}.`),
]

// Lines written for one person. Keyed lowercase because that is how names are
// stored; add an entry here to give anyone else their own.
const PERSONAL = {
  sherman: [name => `Out of the trenches ${name}?`],
}

// A personal line is the whole point of having one, so it gets a real share of
// the draws instead of being a single entry diluted among the generic pool.
const PERSONAL_SHARE = 0.35

export default (name, { date = new Date(), random = Math.random } = {}) => {
  if (!name) {
    return null
  }

  const personal = PERSONAL[name.toLowerCase()]
  const pool = personal && random() < PERSONAL_SHARE ? personal : LINES

  const line = pool[Math.floor(random() * pool.length)] || pool[0]
  return line(capitalize(name), partOfDay(date))
}
