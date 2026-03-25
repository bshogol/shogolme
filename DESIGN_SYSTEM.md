# Design System: Monoblue

**Philosophy:** Terminal-inspired, content-first, monospace typography. Dark only. Clean, compact, no visual noise.

## Foundations

### Typography
- Primary font: `JetBrains Mono` (monospace everywhere — headings, body, UI)
- Load from Google Fonts: `JetBrains Mono:ital,wght@0,300..800;1,300..800`
- Base size: 14px / 0.875rem for body, smaller (11-12px) for UI chrome

### Primary Color: `#0069ff`
- Used for: header background, links, tags, active states, accents, focus rings
- Text on primary: white

### Palette

| Token | Value | Usage |
|-------|-------|-------|
| bg | `#000000` | Page background |
| surface | `#000000` | Content panels (seamless with bg) |
| border | `#1b2230` | Dividers, card borders |
| text | `#c9d1d9` | Body text |
| text-dim | `#6e7681` | Secondary text, metadata |
| text-bright | `#e6edf3` | Headings, emphasis |
| accent | `#0069ff` | Primary/links/interactive |
| green | `#3fb950` | Success, terminal prompt `$` |
| yellow | `#d29922` | Warnings |
| red | `#f85149` | Errors, destructive |
| purple | `#bc8cff` | Syntax: keywords |
| cyan | `#39c5cf` | Syntax: builtins, inline code |
| orange | `#d18616` | Syntax: numbers |
| code-bg | `#161b22` | Code block background |
| selection | `rgba(88, 166, 255, 0.3)` | Text selection |

## Layout

- Max content width: `max-w-5xl` (1024px)
- Centered on page with left/right borders (`border-x`)
- Header: full-width `#0069ff` background, white text, sticky
- Footer: minimal, single line, dimmed text
- Spacing: compact — `py-8 px-4` for page content

## Components

### Header
Solid `#0069ff` background. White text and icons. Navigation items are `white/70` default, `white` on hover/active with `bg-white/10` or `bg-white/20`.

### Tags/Badges
Small pills with `border border-{border}`, accent text color, hover to accent border. Format: `#tagname`.

### Code Blocks
Rounded corners (`rounded-md`), border, `code-bg` background. Language label top-left (uppercase, 10px). Copy button top-right (appears on hover). Syntax highlighting uses palette colors (purple for keywords, green for strings, orange for numbers, dim for comments).

### Cards/Surfaces
`bg-surface`, `border border-{border}`, `rounded-lg`, minimal padding.

### Interactive States
Hover uses `bg-accent/10` for surfaces or `bg-white/10` on accent backgrounds. Active/current uses `bg-accent/20` or `bg-white/20`.

### Terminal Aesthetic Elements
- Prompt indicators: `$` in green before command-like headers
- Blinking cursor: `▊` with `animate-pulse`
- Monospace everything — no sans-serif fonts anywhere
- Index numbers: zero-padded (`00`, `01`, `02`)

## Tech Stack (when building with React)
- Tailwind CSS 4 with `@theme` directive for CSS custom properties
- Colors defined as CSS variables (`--t-bg`, `--t-accent`, etc.) mapped to Tailwind via `--color-terminal-*`
- `clsx` + `tailwind-merge` for conditional classes
