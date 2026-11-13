# houstondragna.com

The site is generated. Nothing in `dist/` is written by hand.

## Where things live

| Folder | What it holds |
| --- | --- |
| `content/` | Everything that changes: videos, images and their order, copy, headings, menu, page names and addresses. Plain JSON. |
| `src/template.html` | The design: layout, styles, and the page script. |
| `src/static/` | Pages that ship as they are: 404, Privacy, Accessibility, Brand Standards. |
| `ASSETS/`, `ebay/`, `public/` | Files that ship as they are. |
| `build/` | The build step. No dependencies. |
| `tools/qa/` | The browser checks. Not published. |

## Build

```
node build/build.mjs
```

Reads `content/` and `src/`, checks all of it, and writes the finished site to `dist/`.
If a content file has a mistake (a missing image, a bad video ID, a link to a page
that does not exist, an address that would break an old link) the build stops with a
plain-language message and writes nothing. The host runs the same command, so a
change that fails here cannot go live.

## Checks

```
cd tools/qa && npm ci && npx playwright install chromium && npm test
```

The checks read their expectations from `content/`, so changing content never fails
a check for the wrong reason. They also run on GitHub for every push.

## Rules the build enforces

- Every image named in the content exists, and has a description.
- Every video ID is a real YouTube ID, and no film is in the grid twice.
- Every menu and footer link points at a page that exists.
- Page addresses are lowercase with hyphens, and never collide.
- An address that has ever been live keeps working: remove or rename a page and the
  build asks for a redirect before it will publish. See `content/redirects.json`.
- No em dashes, no doubled spaces.
- Every internal link in the finished pages lands on a real file.
