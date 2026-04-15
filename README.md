# PDF Forge

A Vercel-ready Next.js web app to manage PDFs directly in the browser.

## Features

- Merge PDFs with no hard file-count limit in the app (you can select very large batches like 200 files, subject to browser memory).
- Reorder files before merging (drag-and-drop and move up/down).
- Merge progress bar optimized for large batches.
- Edit a PDF by:
- Inserting pages in between existing pages (from another PDF).
- Removing individual pages.
- Thumbnail previews for each page in the remove-pages workflow.
- Download output as a new PDF.
- Home page with two clear options: Merge PDFs and Edit Pages.

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- `pdf-lib` for client-side PDF processing

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production Build Check

```bash
npm run build
```

## Deploy on Vercel

1. Push this project to a Git repository (GitHub, GitLab, or Bitbucket).
2. Import the repository in Vercel.
3. Keep framework preset as `Next.js`.
4. Use default build settings:
- Build Command: `next build` (or `npm run build`)
- Output Directory: `.next`
5. Deploy.

No server-side PDF service is required because processing happens in the browser.
# PDF-Editor
