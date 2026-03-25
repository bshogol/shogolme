# Design System: dFlux

**Philosophy:** Dark-first, content-focused, clean sans-serif typography. Minimal borders, subtle surfaces, bold blue accent.

## Foundations

### Typography
- **Primary font:** Inter (sans-serif everywhere)
- **Monospace:** SF Mono, Fira Code, JetBrains Mono (code blocks only)
- **Headings:** Bold, tight tracking (`tracking-[-0.03em]`), `#fafafa`
- **Body:** 15px, `#a1a1a1`, `leading-relaxed`
- **Captions:** 13px, `#666666`

### Primary Color: `#0069FF`
- Hover: `#0055d4`
- Dark: `#0050c8`
- Used for: nav background, links, tags, buttons, section labels, focus rings
- Text on primary: white

### Palette

| Token | Value | Usage |
|-------|-------|-------|
| bg | `#000000` | Page background |
| surface | `#080808` | Alternate section bg |
| surface-alt | `#0a0a0a` | Cards, panels |
| border | `rgba(255,255,255,0.08)` | Dividers, card borders |
| border-hover | `rgba(255,255,255,0.16)` | Hover state borders |
| text | `#a1a1a1` | Body text |
| text-dim | `#666666` | Labels, captions |
| text-bright | `#fafafa` | Headings, emphasis |
| text-muted | `#555555` | Tertiary info |
| accent | `#0069FF` | Primary |
| green | `#34d399` | Success |
| yellow | `#fbbf24` | Warnings |
| red | `#f85149` | Errors |
| divider | `rgba(255,255,255,0.06)` | Section separators |

### Syntax Highlighting

| Token | Color | Usage |
|-------|-------|-------|
| keywords | `#d2a8ff` | `if`, `func`, `return` |
| strings | `#a5d6ff` | String literals |
| numbers | `#fbbf24` | Numeric values |
| comments | `#555555` | Comments |
| functions | `#79c0ff` | Function names |
| builtins | `#79c0ff` | Built-in types |

## Layout

- **Nav:** Fixed top, `h-14`, solid `#0069FF` bg, full-width
- **Content:** `max-w-4xl` to `max-w-6xl`, centered
- **Section padding:** `py-24 sm:py-32`
- **Card padding:** `p-5` to `p-8`

## Components

### Navigation
- Solid `#0069FF` background, `fixed top-0 w-full z-50`
- Logo: `text-[16px] font-bold text-white` with white circle icon
- Links: `text-[15px] font-semibold text-white`, hover `text-white/80`
- No borders, no backdrop blur

### Buttons
- Primary: `bg-[#0069FF] text-white rounded-full px-8 py-3 text-[15px] font-medium`
- Secondary: `border border-white/[0.15] rounded-full px-8 py-3 text-[15px] text-white`

### Tags/Badges
- `rounded-full`, `border border-white/[0.08]`, `text-[13px]`
- No hash symbol, just the tag name
- Hover: `border-white/[0.16]`

### Cards/Surfaces
- `border border-white/[0.08] rounded-xl`
- Hover: `border-white/[0.16] bg-white/[0.02]`
- Background: transparent or `bg-white/[0.02]`

### Code Blocks
- `rounded-[10px]`, `border border-white/[0.08]`, `bg-white/[0.02]`
- Language label: top-left, `text-[10px] uppercase tracking-wider`
- Copy button: top-right, appears on hover
- Font: monospace, `13px`, `line-height: 1.7`

### Section Labels
- `text-[13px] text-[#0069FF] font-medium tracking-widest uppercase`
- Placed above section heading

### Footer
- `bg-white/[0.02]`, `border-t border-white/[0.06]`
- Links: `text-[14px] text-[#666666] hover:text-[#a1a1a1]`

## Interactive States
- Hover on cards: `bg-white/[0.02] border-white/[0.16]`
- Hover on nav items: `text-white/80` or `bg-white/[0.1]`
- Active/selected: `text-[#0069FF]`

## Tech Stack (React)
- Tailwind CSS 4 with `@theme` directive
- Colors as CSS custom properties mapped to `--color-df-*`
- `clsx` + `tailwind-merge` for conditional classes
- Inter loaded from Google Fonts
