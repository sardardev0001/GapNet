# GapNet — UI Design Specification

## Approved directions

1. Minimal **light mode** throughout, **including the outer right sidebar**. Never make the rail dark navy.
2. Hairline outlines, white surfaces, restrained sky-blue call-to-action buttons, no neon effects.
3. Persian-first true RTL layout. The logo «GapNet» stays on the left side of the top bar; «گپ‌نت» and status are right-aligned.
4. Keep the header as a **single native draggable chrome region** when packaged with Electron.
5. Three-column desktop shell: far-right vertical rail (~107px), chat list (~398px), content stage (remaining).
6. Welcome illustration is an **inline original SVG** of overlapping chat bubbles, not a blurry screenshot.

## Palette (Colorion minimal #686)

| Token | Hex | Use |
| --- | --- | --- |
| `--navy` | `#102235` | Primary text |
| `--mid` | `#7F93A7` | Secondary slate accent |
| `--background` | `#F8FAFA` | Light canvas |
| `--muted` | `#97A0A8` | Quiet supporting text |
| `--sky` | `#53A6E8` | CTAs, active navigation |
| `--line` | `#CDD9E6` | Panel hairlines |
| `--soft-line` | `#E3EBF3` | Separators |
| `--pale` | `#EEF7FF` | Blue tint |

## Desktop reference

`frontend/src/styles.css` implements the design. At 1680px desktop width, topbar ~75px, sidebar ~107px, conversation column ~398px; chat-stage width fills the rest. On mobile, bottom navigation replaces the rail; active conversations use a full-screen pane.

## Interaction states

- Login / Signup form validation, accessible errors and loading state
- Chat hover and selected states
- New user search dialog and group member selection
- Composing, pending attachment, upload errors and text message input
- Incoming and outgoing bubbles, edited/deleted states
- Read/unread counts and online badges
- Failed network connection indicator in the topbar and toast errors
