# Mobile Responsive Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the torrboard layout responsive to viewport width (not user agent), fix the broken Copy URL button, and add a toast on copy success.

**Architecture:** Introduce a single source of truth for breakpoints in `theme.js`, replace UA-sniffing layout decisions with CSS media queries inside styled components, fix the unit-less `margin-left` bug in the root container, and swap `react-copy-to-clipboard` for `navigator.clipboard.writeText` with a toast.

**Tech Stack:** React 19, styled-components 6, react-hot-toast (via existing toasts wrapper), Tippy 4. No new dependencies.

**Testing note:** Codebase has no automated tests. Verification is manual: run `npm start` and check at multiple viewport widths after each task.

**Reference spec:** `docs/superpowers/specs/2026-05-21-mobile-responsive-overhaul-design.md`

---

## Task 1: Add breakpoint system and fix root layout

Foundation for everything else. The `margin-left: ${TOOLBAR_WIDTH};` bug at `src/index.jsx:34` is also fixed here because the new layout uses CSS variables instead of that interpolation.

**Files:**
- Modify: `src/theme.js`
- Modify: `src/index.jsx:23-44`

- [ ] **Step 1: Add breakpoints and media helpers to theme**

Edit `src/theme.js`. Add two new top-level keys to the default export object (after `motion`, before `z`):

```js
const breakpoints = {
  mobile: '600px',
  tablet: '900px',
}

const media = {
  mobile: `@media (max-width: ${breakpoints.mobile})`,
  tablet: `@media (max-width: ${breakpoints.tablet})`,
}
```

Then add `breakpoints` and `media` to the exported object alongside `colors`, `spacing`, `font`, etc.

- [ ] **Step 2: Rewrite the root Container in `src/index.jsx`**

Replace the `Container` styled component (lines 23-44) with:

```js
const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${p => p.theme.colors.bg};
  color: ${p => p.theme.colors.text};

  --toolbar-w: 100px;
  --bottombar-h: 0px;

  ${p => p.theme.media.mobile} {
    --toolbar-w: 0px;
    --bottombar-h: 56px;
  }

  ${p =>
    p.$user
      ? `
  > div:last-child {
    flex-grow: 1;
    min-width: 0;
    padding-left: calc(var(--toolbar-w) + ${p.theme.spacing[5]});
    padding-right: ${p.theme.spacing[5]};
    padding-top: ${p.theme.spacing[5]};
    padding-bottom: calc(var(--bottombar-h) + ${p.theme.spacing[5]});

    ${p.theme.media.mobile} {
      padding-left: ${p.theme.spacing[3]};
      padding-right: ${p.theme.spacing[3]};
      padding-top: ${p.theme.spacing[3]};
      padding-bottom: calc(var(--bottombar-h) + ${p.theme.spacing[3]});
    }
  }
`
      : ''}

  *:focus-visible {
    outline: 2px solid ${p => p.theme.colors.accent};
    outline-offset: 2px;
  }
`
```

Remove the `TOOLBAR_WIDTH` import from `src/index.jsx` (the line `import { TOOLBAR_WIDTH } from './config.client'`).

- [ ] **Step 3: Verify in browser**

Run `npm start` if not already running. Open the app. At desktop width (>900px), main content should sit to the right of the toolbar with normal padding. At <600px, content fills the full width with smaller padding. The fixed sidebar may still overlap content on mobile until Task 2 lands, but the unit-less margin bug is gone.

- [ ] **Step 4: Commit**

```bash
git add src/theme.js src/index.jsx
git commit -m "introduce a single breakpoint system in the theme and rewrite the root container so it uses a css variable instead of the unit-less margin-left that browsers were silently dropping"
```

---

## Task 2: Make the toolbar responsive (sidebar on desktop, bottom nav on mobile)

Make `Toolbar.jsx` and `Logo.jsx` render two layouts driven by the same `theme.media.mobile` query, and remove the UA-derived `TOOLBAR_WIDTH` from `config.client.js`.

**Files:**
- Modify: `src/components/Toolbar.jsx`
- Modify: `src/components/Logo.jsx`
- Modify: `src/config.client.js`

- [ ] **Step 1: Drop the `TOOLBAR_WIDTH` export and `react-device-detect` import from config**

Edit `src/config.client.js`. Remove these lines:

```js
import { isMobile } from 'react-device-detect'
```

and:

```js
export const TOOLBAR_WIDTH = isMobile ? 50 : 100
```

Final file should be:

```js
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

export const __APIURL__ = `${BASE_URL}/graphql`
export { BASE_URL }
export const IMAGE_URL = `${BASE_URL}/statics/torrboard.png`
export const DOWNLOAD_URL = process.env.DOWNLOAD_URL || BASE_URL
export const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/home/media'
```

- [ ] **Step 2: Rewrite `Logo.jsx` to drop the `TOOLBAR_WIDTH` math and hide on mobile**

Replace the entire contents of `src/components/Logo.jsx`:

```jsx
import React from 'react'
import styled from 'styled-components'

import { IMAGE_URL } from '../config.client'

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: ${p => p.theme.spacing[4]};
  flex-shrink: 0;

  width: 50px;
  height: 50px;
  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.bg};
  border: 1px solid ${p => p.theme.colors.border};

  ${p => p.theme.media.mobile} {
    display: none;
  }
`

export default () => (
  <Logo>
    <img src={IMAGE_URL} width={32} />
  </Logo>
)
```

- [ ] **Step 3: Rewrite the styled components in `Toolbar.jsx`**

In `src/components/Toolbar.jsx`, remove the `TOOLBAR_WIDTH` import:

```js
import { TOOLBAR_WIDTH } from '../config.client'
```

Replace the `Container`, `Menu`, `navStyles`, `NavItem`, `Disconnect`, `Stats`, and `Stat` styled-components (lines 45-148) with:

```js
const Container = styled.div`
  position: fixed;
  z-index: ${p => p.theme.z.toolbar};
  background-color: ${p => p.theme.colors.surface};
  border-right: 1px solid ${p => p.theme.colors.border};

  top: 0;
  left: 0;
  width: 100px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;

  ${p => p.theme.media.mobile} {
    top: auto;
    bottom: 0;
    right: 0;
    width: auto;
    height: 56px;
    flex-direction: row;
    border-right: none;
    border-top: 1px solid ${p => p.theme.colors.border};
  }
`

const Menu = styled.nav`
  margin-top: ${p => p.theme.spacing[5]};
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${p => p.theme.spacing[1]};
  width: 100%;

  ${p => p.theme.media.mobile} {
    margin-top: 0;
    flex-direction: row;
    gap: 0;
    height: 100%;
  }
`

const navStyles = `
  position: relative;
  width: 100px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`

const NavItem = styled(NavLink)`
  ${navStyles}
  color: ${p => p.theme.colors.textMuted};
  text-decoration: none;
  transition: color ${p => p.theme.motion.fast},
    background-color ${p => p.theme.motion.fast};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 30%;
    bottom: 30%;
    width: 3px;
    border-radius: 0 2px 2px 0;
    background-color: transparent;
    transition: background-color ${p => p.theme.motion.fast};
  }

  &:hover {
    color: ${p => p.theme.colors.text};
    background-color: ${p => p.theme.colors.surfaceHover};
  }

  &.active {
    color: ${p => p.theme.colors.accent};
    background-color: ${p => p.theme.colors.surfaceHover};
  }

  &.active::before {
    background-color: ${p => p.theme.colors.accent};
  }

  ${p => p.theme.media.mobile} {
    flex: 1;
    width: auto;
    height: 100%;

    &::before {
      left: 50%;
      top: auto;
      bottom: 0;
      width: 24px;
      height: 3px;
      border-radius: 2px 2px 0 0;
      transform: translateX(-50%);
    }
  }
`

const Disconnect = styled.button`
  ${navStyles}
  color: ${p => p.theme.colors.textMuted};
  background: none;
  transition: color ${p => p.theme.motion.fast},
    background-color ${p => p.theme.motion.fast};

  &:hover {
    color: ${p => p.theme.colors.error};
    background-color: ${p => p.theme.colors.surfaceHover};
  }

  ${p => p.theme.media.mobile} {
    flex: 1;
    width: auto;
    height: 100%;
  }
`

const Stats = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${p => p.theme.spacing[2]};
  padding: ${p => p.theme.spacing[3]} 0;
  margin-bottom: ${p => p.theme.spacing[2]};
  width: 100px;
  border-top: 1px solid ${p => p.theme.colors.border};
  padding-top: ${p => p.theme.spacing[3]};

  ${p => p.theme.media.mobile} {
    display: none;
  }
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-family: ${p => p.theme.font.mono};
  font-size: ${p => p.theme.font.size.xs};
  color: ${p => p.theme.colors.textMuted};

  > svg {
    color: ${p => p.theme.colors.textSubtle};
  }
`
```

Leave the component body and the `useEffect` block (which uses `isMobile` from `react-device-detect` for `mediaSession`) untouched. That use of `isMobile` is genuinely UA-bound and stays.

- [ ] **Step 4: Verify in browser**

Reload the app. At desktop width, the sidebar should look identical to before. Resize the window below 600px (DevTools responsive mode). The toolbar should snap to the bottom as a horizontal bar, nav items spread across the width, logo and stats disappear, content padding picks up the bottom-nav clearance.

Also test:
- Click each nav item on both desktop and mobile widths.
- Active indicator should appear at the bottom edge of the item on mobile, left edge on desktop.

- [ ] **Step 5: Commit**

```bash
git add src/config.client.js src/components/Logo.jsx src/components/Toolbar.jsx
git commit -m "make the toolbar layout viewport-driven instead of user-agent driven so narrow desktop windows and tablets also get the compact mode, with a bottom-nav variant below the mobile breakpoint and the logo hidden there"
```

---

## Task 3: Fix the Copy URL button and add a success toast

The current `<CopyToClipboard>` wrapper is the brittle bit; swap to `navigator.clipboard.writeText` with toast feedback.

**Files:**
- Modify: `src/components/MediaModal.jsx`

- [ ] **Step 1: Remove the `react-copy-to-clipboard` import**

In `src/components/MediaModal.jsx`, delete this line:

```js
import { CopyToClipboard } from 'react-copy-to-clipboard'
```

- [ ] **Step 2: Add the copy handler inside the component**

In the component body (after the existing `doChangeImdb` definition around line 492), add:

```js
const copyUrl = async url => {
  try {
    await navigator.clipboard.writeText(url)
    addToast('URL copied', { appearance: 'success' })
  } catch (err) {
    addToast(`Copy failed: ${err.message}`, { appearance: 'error' })
  }
}
```

- [ ] **Step 3: Replace the CopyToClipboard JSX**

Find the block at lines 695-703:

```jsx
<Tippy content="Copy URL" theme="light">
  <span>
    <CopyToClipboard text={v.url}>
      <a>
        <MdContentCopy size={16} />
      </a>
    </CopyToClipboard>
  </span>
</Tippy>
```

Replace it with:

```jsx
<Tippy content="Copy URL" theme="light">
  <a onClick={() => copyUrl(v.url)}>
    <MdContentCopy size={16} />
  </a>
</Tippy>
```

- [ ] **Step 4: Verify in browser**

Open a media item, hover (or tap) the copy icon next to a file. Confirm:
- Tippy "Copy URL" tooltip appears.
- Clicking the icon shows a green "URL copied" toast (bottom-right).
- Paste into a text field and verify the URL matches the file.
- In a non-secure context (HTTP without `localhost`), `navigator.clipboard` may be undefined. If you're testing on a remote IP, expect an error toast instead — that's the same surface as before and the dev workflow over `localhost` works.

- [ ] **Step 5: Commit**

```bash
git add src/components/MediaModal.jsx
git commit -m "swap react-copy-to-clipboard for navigator.clipboard so the copy button works under react 19 and surfaces success or failure as a toast instead of failing silently"
```

---

## Task 4: Make MediaModal FileRow responsive

On phones the file row overflows (4-5 icons + long nowrap title). Switch to a wrap layout under the breakpoint with bigger touch targets.

**Files:**
- Modify: `src/components/MediaModal.jsx` (the `FileRow`, `FileTitle`, and `FileActions` styled components)

- [ ] **Step 1: Update `FileRow` to allow wrapping**

Find the `FileRow` styled component (lines 247-265). Replace with:

```js
const FileRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${p => p.theme.spacing[3]};
  padding: ${p => p.theme.spacing[2]} ${p => p.theme.spacing[3]};
  border-radius: ${p => p.theme.radii.md};
  transition: background-color ${p => p.theme.motion.fast};

  ${p =>
    p.$watched
      ? `
    color: ${p.theme.colors.textSubtle};
  `
      : ''}

  &:hover {
    background-color: ${p => p.theme.colors.surfaceHover};
  }

  ${p => p.theme.media.mobile} {
    gap: ${p => p.theme.spacing[2]};
  }
`
```

- [ ] **Step 2: Allow the title to wrap on mobile**

Find the `FileTitle` styled component (lines 276-283). Replace with:

```js
const FileTitle = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${p => p.theme.font.size.sm};
  color: ${p => p.theme.colors.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${p => p.theme.media.mobile} {
    flex-basis: 100%;
    white-space: normal;
    word-break: break-word;
  }
`
```

- [ ] **Step 3: Make `FileActions` reflow with larger touch targets on mobile**

Find the `FileActions` styled component (lines 295-319). Replace with:

```js
const FileActions = styled.div`
  display: flex;
  gap: ${p => p.theme.spacing[1]};
  flex-shrink: 0;

  > a,
  > span {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${p => p.theme.colors.textMuted};
    border-radius: ${p => p.theme.radii.full};
    cursor: pointer;
    transition: background-color ${p => p.theme.motion.fast},
      color ${p => p.theme.motion.fast};
  }

  > a:hover,
  > span:hover {
    background-color: ${p => p.theme.colors.surfaceActive};
    color: ${p => p.theme.colors.text};
  }

  ${p => p.theme.media.mobile} {
    flex-basis: 100%;
    justify-content: flex-start;
    gap: ${p => p.theme.spacing[2]};

    > a,
    > span {
      width: 36px;
      height: 36px;
    }
  }
`
```

- [ ] **Step 4: Verify in browser**

Open a media item with several files. On desktop the layout is unchanged. At <600px the file row should now wrap into two visual rows: title on top (wrapping if needed, with the resolution badge inline), action icons on a second row left-aligned with 36x36 targets.

- [ ] **Step 5: Commit**

```bash
git add src/components/MediaModal.jsx
git commit -m "let the file row wrap below the mobile breakpoint so long filenames can break onto multiple lines and the action icons drop to their own row with thumb-sized touch targets instead of getting clipped"
```

---

## Task 5: Tighten the Home grid on phones

Reduce minmax, gap, and expansion-panel padding under the mobile breakpoint so phones see 2-3 cards per row instead of 1.

**Files:**
- Modify: `src/components/Home.jsx`

- [ ] **Step 1: Update `Grid` to use a smaller minmax on mobile**

Find the `Grid` styled component (lines 86-91). Replace with:

```js
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${CARD_WIDTH}px, 1fr));
  gap: ${p => p.theme.spacing[3]};
  padding: ${p => p.theme.spacing[3]} 0;

  ${p => p.theme.media.mobile} {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: ${p => p.theme.spacing[2]};
    padding: ${p => p.theme.spacing[2]} 0;
  }
`
```

- [ ] **Step 2: Tighten the expansion panel on mobile**

Find the `ExpansionContent` styled component (lines 214-216). Replace with:

```js
const ExpansionContent = styled.div`
  padding: ${p => p.theme.spacing[5]};

  ${p => p.theme.media.mobile} {
    padding: ${p => p.theme.spacing[3]};
  }
`
```

- [ ] **Step 3: Adjust `ControlBar` and `SearchSlot` for mobile**

Find `ControlBar` (lines 51-57) and `SearchSlot` (lines 79-84). Replace with:

```js
const ControlBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: ${p => p.theme.spacing[5]};
  margin: ${p => p.theme.spacing[3]} 0;

  ${p => p.theme.media.mobile} {
    gap: ${p => p.theme.spacing[3]};
  }
`

const SearchSlot = styled.div`
  flex: 1 1 220px;
  min-width: 200px;
  max-width: 420px;
  margin-left: auto;

  ${p => p.theme.media.mobile} {
    flex-basis: 100%;
    max-width: none;
    margin-left: 0;
  }
`
```

- [ ] **Step 4: Verify in browser**

At <600px, the grid should show 2-3 columns of cards depending on viewport. The search input should sit on its own row below the sort/genre pills, full width. Expansion panel padding should be visibly tighter when a card is expanded.

- [ ] **Step 5: Commit**

```bash
git add src/components/Home.jsx
git commit -m "tighten the home grid below the mobile breakpoint so phones get a couple of cards per row instead of one giant card, drop the expansion panel padding, and let the search input fall to its own full-width row when the control bar wraps"
```

---

## Task 6: Make Torrents responsive (table to stacked cards)

Below 600px the grid-table is unusable. Switch to a stacked card layout per row using media queries.

**Files:**
- Modify: `src/components/Torrents.jsx`

This task touches more lines than the others because the table is built around a `grid-template-columns` constant. Read the file once before editing so the structure is in your head.

- [ ] **Step 1: Read the file**

Read `src/components/Torrents.jsx` completely so the styled components, the `columns` array, and the rendering loop are in context.

- [ ] **Step 2: Stop hiding columns based on `isMobile`**

The `columns` array uses `hide: isMobile` for several columns. The new approach renders all columns but reshapes them via CSS on mobile.

Find the `columns` array (around lines 79-102). Remove the `hide: isMobile` property from every entry (keep the rest of each entry the same). Also remove the `visibleColumns` / `gridTemplate` computation (lines 104-105):

```js
const visibleColumns = columns.filter(c => !c.hide)
const gridTemplate = visibleColumns.map(c => c.size).join(' ')
```

Replace with:

```js
const gridTemplate = columns.map(c => c.size).join(' ')
```

Then update every reference to `visibleColumns` further down in the file to use `columns` instead. (Read the file with a grep for `visibleColumns` and substitute.)

Remove the `isMobile` import from the top of the file:

```js
import { isMobile } from 'react-device-detect'
```

- [ ] **Step 3: Update the `Heading` and `Row` styled components**

The `Heading` styled component (around line 107) and the corresponding `Row` styled component need media queries that switch them from grid-table to stacked cards under 600px.

Find the `Heading` styled component. Replace with:

```js
const Heading = styled.div`
  display: grid;
  grid-template-columns: ${gridTemplate};
  gap: ${p => p.theme.spacing[4]};
  padding: ${p => p.theme.spacing[2]} ${p => p.theme.spacing[3]};
  font-size: ${p => p.theme.font.size.xs};
  font-weight: ${p => p.theme.font.weight.semibold};
  letter-spacing: ${p => p.theme.font.tracking.wider};
  text-transform: uppercase;
  color: ${p => p.theme.colors.textSubtle};
  border-bottom: 1px solid ${p => p.theme.colors.border};

  ${p => p.theme.media.mobile} {
    display: none;
  }
`
```

(If your existing `Heading` has different inner CSS, preserve those rules and just add the `${p => p.theme.media.mobile} { display: none; }` block at the end — the desktop heading row makes no sense as a stacked card.)

- [ ] **Step 4: Update the `Row` styled component**

Find the `Row` styled component (a grid-template-columns row). Add a media query that flips it into a card. The general form after edits should be:

```js
const Row = styled.div`
  display: grid;
  grid-template-columns: ${gridTemplate};
  gap: ${p => p.theme.spacing[4]};
  align-items: center;
  padding: ${p => p.theme.spacing[3]};
  border-bottom: 1px solid ${p => p.theme.colors.border};
  font-size: ${p => p.theme.font.size.sm};
  transition: background-color ${p => p.theme.motion.fast};

  &:hover {
    background-color: ${p => p.theme.colors.surfaceHover};
  }

  ${p => p.theme.media.mobile} {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: ${p => p.theme.spacing[2]};
  }
`
```

(Preserve any extra rules from the existing `Row`; just add the media query.)

- [ ] **Step 5: Add a `Cell` wrapper so each rendered column carries its label on mobile**

The mobile card needs each value to show "Label: value" since the table heading is hidden. Read the rendering loop and wrap each cell value with a styled component that exposes a `data-label` for the mobile view.

If the existing render is something like:

```jsx
<Row key={t.id}>
  {columns.map(c => <span key={c.key}>{c.fn ? c.fn(t[c.key]) : t[c.key]}</span>)}
</Row>
```

Replace the inner `<span>` with a styled `Cell`:

```js
const Cell = styled.div`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${p => p.theme.media.mobile} {
    display: flex;
    justify-content: space-between;
    white-space: normal;

    &::before {
      content: attr(data-label);
      font-size: ${p => p.theme.font.size.xs};
      letter-spacing: ${p => p.theme.font.tracking.wider};
      text-transform: uppercase;
      color: ${p => p.theme.colors.textSubtle};
      margin-right: ${p => p.theme.spacing[2]};
    }

    &[data-label=""]::before,
    &[data-label="Name"]::before {
      display: none;
    }
  }
`
```

Then in the render loop:

```jsx
<Row key={t.id}>
  {columns.map(c => (
    <Cell
      key={c.key}
      data-label={typeof c.label === 'string' ? c.label : ''}
    >
      {c.fn ? c.fn(t[c.key]) : t[c.key]}
    </Cell>
  ))}
</Row>
```

(Some column labels are React elements like `<IoIosArrowRoundDown />`. For those, `typeof c.label === 'string'` is false and the `data-label` becomes empty — which hides the label via the rule above. That's the correct behavior since icon-only headers don't have a textual label to surface.)

If the existing render uses a different pattern (e.g., a dedicated `<Name>` cell or an inline action cluster), preserve that structure and only swap the column iteration to use `Cell` with `data-label`.

- [ ] **Step 6: Skip the empty Name label on mobile**

The Name column should display the torrent name without a "NAME:" prefix on mobile (it's already the most prominent line). The `&[data-label="Name"]::before { display: none; }` rule in Step 5 handles this; verify after rendering.

- [ ] **Step 7: Verify in browser**

Navigate to `/torrents` (admin only). At desktop width, the table should look identical to before (just with all columns visible since we removed the `hide` flag — that may or may not be the prior behavior; if any column was previously always-hidden on desktop, that should still be reflected via column definitions, not via `isMobile`).

At <600px, each torrent row should render as a stacked card: name on top, then a series of "LABEL: value" rows for size/ratio/rates/etc., then the actions cluster. No horizontal scroll. Tap the actions and confirm they still work.

- [ ] **Step 8: Commit**

```bash
git add src/components/Torrents.jsx
git commit -m "switch the torrents table to a stacked card layout below the mobile breakpoint so every column stays accessible on a phone instead of being hidden behind the isMobile gate, by exposing each cell's label via data-label and a css pseudo-element on the mobile view"
```

---

## Task 7: Stop Tippy from eating taps on touch devices

Tap-to-show-tooltip then second-tap-to-activate is the iOS Safari default. Switching action tooltips to `touch={['hold', 400]}` makes a tap activate the underlying button immediately while a press-and-hold still surfaces the label.

**Files:**
- Modify: `src/components/MediaModal.jsx`

- [ ] **Step 1: Add `touch={['hold', 400]}` to every action Tippy in `MediaModal.jsx`**

In `src/components/MediaModal.jsx`, find each `<Tippy>` that wraps an action affordance. After the edits in Task 4, the relevant Tippys are:
- "Close (Esc)" wrapping the close button
- "Cast" wrapping the cast link
- "MPV" wrapping the MPV link
- "VLC" wrapping the VLC link
- "Copy URL" wrapping the copy link (post Task 3)
- The watched-toggle Tippy with dynamic content

For each, add the `touch` prop. Example diff for the "MPV" tooltip:

```jsx
<Tippy content="MPV" theme="light" touch={['hold', 400]}>
  <a
    href={`mpv://${encodeURIComponent(v.url)}`}
    onClick={() => setWatched({ variables: { path: v.path, value: true } })}
  >
    <IoIosPlayCircle size={18} />
  </a>
</Tippy>
```

Do the same for every action Tippy. Leave the IMDB settings Tippy (which uses `trigger="click"` for a popover) untouched — it's not a tooltip.

- [ ] **Step 2: Verify in browser**

In DevTools, enable touch emulation (device mode). Tap an action icon. The action should fire on the first tap. Press-and-hold for half a second to surface the tooltip label.

On real iOS Safari (if available), confirm the same.

- [ ] **Step 3: Commit**

```bash
git add src/components/MediaModal.jsx
git commit -m "stop tippy from intercepting taps on the file-row actions by switching them to hold-to-show behavior so a single tap fires the action immediately on touch devices and the label is still discoverable via long press"
```

---

## Task 8: Drop the UA branch in MediaCard and uninstall react-copy-to-clipboard

Final cleanup. Card dimensions become single desktop constants; the dependency is removed.

**Files:**
- Modify: `src/components/MediaCard.js`
- Modify: `package.json`
- Modify: `package-lock.json` (regenerated by npm)

- [ ] **Step 1: Update `MediaCard.js` to drop `isMobile`**

Replace the contents of `src/components/MediaCard.js`:

```js
import styled from 'styled-components'

export const CARD_HEIGHT = 300
export const CARD_WIDTH = 200

export default styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: ${CARD_WIDTH} / ${CARD_HEIGHT};
  flex-shrink: 0;
  overflow: hidden;
  word-break: break-all;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: ${p => p.theme.radii.md};
  background-color: ${p => p.theme.colors.surface};
  background-image: ${p => (p.$bg ? `url(${p.$bg})` : 'none')};
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-clip: padding-box, border-box;
  border: 1px solid ${p => p.theme.colors.border};
  transition: transform ${p => p.theme.motion.base},
    border-color ${p => p.theme.motion.base},
    box-shadow ${p => p.theme.motion.base};

  ${p =>
    p.$interactive
      ? `
    cursor: pointer;
    will-change: transform;
    transform: translateZ(0);
    &:hover {
      transform: translate3d(0, -3px, 0);
      border-color: ${p.theme.colors.borderHover};
      box-shadow: ${p.theme.shadows.md};
    }
  `
      : ''}
`
```

- [ ] **Step 2: Uninstall `react-copy-to-clipboard`**

Run:

```bash
npm uninstall react-copy-to-clipboard
```

This updates `package.json` and `package-lock.json`.

- [ ] **Step 3: Confirm no lingering references**

Run:

```bash
grep -rn "react-copy-to-clipboard\|CopyToClipboard" src/
```

Expected: no output.

- [ ] **Step 4: Verify in browser**

Hard-reload the app (Vite should pick up the dependency change). Cards should look identical to before on desktop. The grid `minmax(200px, 1fr)` no longer scales down to 90px on mobile, but Task 5's `minmax(140px, 1fr)` mobile override takes precedence, so phones still get 2-3 columns. Test at 360px and 414px viewport widths.

- [ ] **Step 5: Commit**

```bash
git add src/components/MediaCard.js package.json package-lock.json
git commit -m "drop the user-agent branch in mediacard now that the home grid takes care of mobile sizing via its own breakpoint, and pull the unmaintained react-copy-to-clipboard dependency out of the lockfile since the copy button no longer needs it"
```

---

## Final manual verification

Open the app at each width and walk through the flows:

- [ ] **1440px (desktop)**: sidebar visible, grid wide, all tooltips on hover, copy button works.
- [ ] **1024px (tablet portrait)**: sidebar still visible (>900px), grid responds, no overlap.
- [ ] **800px (narrow desktop)**: sidebar still visible, grid tighter, no overlap. Previously this width got the "desktop" UA which left a wide sidebar — now CSS-driven so still desktop layout.
- [ ] **600px (breakpoint)**: at exactly the breakpoint, switch over. Test 599px and 601px.
- [ ] **414px (iPhone)**: bottom nav, 2-column grid, file rows wrap, torrents stack as cards. Copy button shows toast.
- [ ] **360px (Android)**: same as above, no horizontal scroll anywhere.

For each width, confirm:
- No content sitting underneath a fixed toolbar.
- Action icons in the file row are tappable.
- Toast appears on copy.
- Torrents are usable.
- Tippy doesn't block first tap.
