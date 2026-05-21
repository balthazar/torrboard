# Mobile responsive overhaul + copy-to-clipboard fix

Date: 2026-05-21

## Problem

1. The app's layout is "mobile aware" via `react-device-detect` (UA sniffing), but narrow desktop windows, tablets, and rotated devices don't get a compact layout. The decision is taken once at module load.
2. `src/index.jsx:34` interpolates `margin-left: ${TOOLBAR_WIDTH};` without a unit. Browsers ignore unitless lengths, so the main content sits underneath the fixed toolbar on all viewports.
3. The copy URL button in `MediaModal.jsx` doesn't work. It uses `react-copy-to-clipboard@5.0.2`, which clones its child to inject an `onClick`. That pattern is fragile under React 19, and there's no user feedback when copy succeeds.
4. Other mobile rough edges: `FileRow` overflows on phones (5 icons + `nowrap` title); Tippy tooltips require a double-tap on touch devices; the Torrents grid-table is unusable narrow; the grid `minmax(200px, 1fr)` gives a single oversized card per row on phones.

## Goal

Make the entire layout responsive to viewport width (not user agent), fix the copy button with a success toast, and remove `react-copy-to-clipboard`.

## Out of scope

- Tests (codebase has none).
- Visual redesign beyond responsive behavior.
- Refactoring `config.client.js` further than removing the UA-derived `TOOLBAR_WIDTH`.

## Design

### A. Breakpoint system (foundation)

Add to `theme.js`:

```js
breakpoints: { mobile: '600px', tablet: '900px' },
media: {
  mobile: '@media (max-width: 600px)',
  tablet: '@media (max-width: 900px)',
},
```

Drop `react-device-detect` usage for **layout decisions**. Keep it only where the behavior is genuinely UA-bound:
- `Toolbar.jsx` — `navigator.mediaSession` + `fakeAudio` effect (mobile audio session integration).
- `SearchInput.jsx` — `autoFocus` (mobile keyboard pop-up is annoying).

Everywhere else, replace `isMobile ? a : b` with CSS media queries inside the styled component.

### B. Root layout (`src/index.jsx`)

Replace the broken `margin-left: ${TOOLBAR_WIDTH};` with a CSS-variable shell:

```js
const Container = styled.div`
  --toolbar-w: 100px;
  --bottombar-h: 0px;

  ${p => p.theme.media.mobile} {
    --toolbar-w: 0px;
    --bottombar-h: 56px;
  }

  display: flex;
  min-height: 100vh;

  > div:last-child {
    flex-grow: 1;
    padding-left: var(--toolbar-w);
    padding-bottom: var(--bottombar-h);
    padding-top: ${p => p.theme.spacing[5]};
    padding-right: ${p => p.theme.spacing[5]};

    ${p => p.theme.media.mobile} {
      padding-top: ${p => p.theme.spacing[3]};
      padding-right: ${p => p.theme.spacing[3]};
      padding-left: ${p => p.theme.spacing[3]};
    }
  }
`
```

(The existing code uses the shorthand `padding: spacing[5]`. We split it so the toolbar-side padding can be driven by the var while the other sides keep their inner spacing.)

The signed-out shell stays unchanged (no toolbar).

### C. Toolbar (`Toolbar.jsx`, `Logo.jsx`)

Two layouts driven by the same media query:

- **Desktop (>=600px)**: fixed left sidebar (current design, width 100px).
- **Mobile (<600px)**: fixed bottom nav, full width, ~56px tall. Items spread evenly with `flex: 1`. Logo and Stats hidden. Disconnect remains.

Implementation: same component, styled with media queries. `Container` switches between `position: fixed; left: 0; width: 100px; height: 100vh` and `position: fixed; left: 0; right: 0; bottom: 0; height: 56px; flex-direction: row`. `Menu` and `NavItem` widths/heights flip with the same query.

`Logo.jsx` is rendered only on desktop (CSS `display: none` under the breakpoint). Drop the hard-coded `TOOLBAR_WIDTH / 2` math in favor of a fixed 50px square.

`config.client.js`: remove the `TOOLBAR_WIDTH` export and the `react-device-detect` import.

### D. Copy URL fix (`MediaModal.jsx`)

Replace:

```jsx
<CopyToClipboard text={v.url}>
  <a><MdContentCopy size={16} /></a>
</CopyToClipboard>
```

with:

```jsx
<a onClick={() => copyUrl(v.url)}>
  <MdContentCopy size={16} />
</a>
```

Where `copyUrl` is defined in the component:

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

Drop the `CopyToClipboard` import. Remove `react-copy-to-clipboard` from `package.json` dependencies.

The Tippy "Copy URL" tooltip wrapper stays (it's the visual affordance), and the `<span>` wrapper around it can be removed since we no longer need a non-`a` parent for cloneElement compatibility.

### E. MediaModal `FileRow` on mobile

Under `theme.media.mobile`, switch `FileRow` from one row to two:

- Row 1: episode label + title + resolution badge. Title becomes `white-space: normal; word-break: break-word`.
- Row 2: `FileActions` reflows below, left-aligned, with `gap: spacing[2]` instead of `spacing[1]`. Touch targets grow from 30x30 to 36x36.

Implementation: `flex-wrap: wrap` on `FileRow`; under the breakpoint, `FileActions` gets `flex-basis: 100%; justify-content: flex-start` and its children get `width: 36px; height: 36px`.

### F. Home grid (`Home.jsx`)

Under 600px:
- `Grid` `minmax(140px, 1fr)` and `gap: spacing[2]` (down from `spacing[3]`).
- `ExpansionContent` `padding: spacing[3]` (down from `spacing[5]`).
- `ControlBar` `gap: spacing[3]` (down from `spacing[5]`); `SearchSlot` drops the `margin-left: auto` so it flows naturally on a new line.

### G. Torrents (`Torrents.jsx`)

Under 600px, switch from grid-table to stacked cards. Each `Row` becomes a card with:
- Line 1: name (full width, can wrap).
- Line 2: meta (ETA, state color dot, progress %).
- Line 3: actions (right-aligned).

Implementation: keep the existing `Row` component. Add a `@media (max-width: 600px)` block that overrides `grid-template-columns: none`, sets `display: flex; flex-direction: column`, and reorders/relabels children with CSS. The column-hide logic (`hide: isMobile`) is removed; instead, mobile-only columns are styled to display as inline meta on the mobile card.

This is the riskiest piece. If it gets messy, fall back to two separate render branches gated by a `useMediaQuery('(max-width: 600px)')` hook. Decision deferred to the plan.

### H. Tippy on touch

Pass `touch={['hold', 400]}` to action-icon `Tippy` instances (MPV, VLC, Copy, Watched, Cast, Close, IMDB settings). This means tap-and-hold shows the tooltip, single tap activates the action immediately. Hover behavior on mouse devices is unchanged.

For tooltips that don't gate an action (e.g., a label-only tippy), no change needed.

### I. Cleanup

- `MediaCard.js`: drop `CARD_HEIGHT = isMobile ? 135 : 300`. Keep single desktop constants (300x200) which are used by the Home grid `minmax` and the MediaModal hero cover. Modal hero already adapts via existing container queries.
- Remove `react-copy-to-clipboard` from `package.json` and run `npm install` once.

## Architecture notes

- Single source of truth for breakpoints lives in `theme.js`. All styled components reference `theme.media.mobile` rather than inlining magic numbers.
- No new dependencies. No new files (changes are additive to existing styled-components).
- `react-device-detect` stays a dep (used by the audio session feature) — we just stop using it for layout.

## Risk and rollback

Each section is independent and self-contained in 1-2 files:
- A (theme), B (index.jsx), C (Toolbar/Logo/config) — must land together since they share the breakpoint contract.
- D (copy fix) — independent, can ship alone.
- E, F, G, H, I — independent of each other, can ship individually.

If a piece misbehaves, revert that section's commit. No data migrations, no API changes.

## Verification

Manual: open at 1440px, 1024px, 800px, 600px, 414px (iPhone), 360px (Android). Check:
1. No content under the toolbar at any width.
2. Toolbar flips from sidebar to bottom nav at 600px.
3. Copy button shows success toast.
4. FileRow doesn't overflow horizontally at any width.
5. Torrents view is usable on a phone (no horizontal scroll, actions tappable).
6. Tippy tooltips don't block taps on iOS Safari.
