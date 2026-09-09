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

export default (name, { date = new Date(), random = Math.random } = {}) => {
  if (!name) {
    return null
  }

  const line = LINES[Math.floor(random() * LINES.length)] || LINES[0]
  return line(capitalize(name), partOfDay(date))
}
