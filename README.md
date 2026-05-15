# VeriFlow UI

Version 1 React UI for the invoice extraction service.

## Included screens

- Landing page / website intro
- Sign in / sign up page
- Dashboard with upload list
- Upload form for invoice extraction
- Detail view with file preview and extracted fields
- Settings panel for backend URLs

## Default backend URLs in development

- Auth API: `/auth-api`
- OCR API: `/ocr-api`

The Vite dev server proxies these to:

- `/auth-api` -> `http://localhost:8080`
- `/ocr-api` -> `http://localhost:8081`

You can still change both from the dashboard settings panel.

## Run

Install a package manager first because this environment currently has `node` but not `npm`.

Then inside `/Users/shashank.cs/Downloads/project_ocr/ui`:

```bash
npm install
npm run dev
```

Or with another package manager:

```bash
yarn
yarn dev
```

## Notes

- The UI stores auth and settings in `localStorage`.
- Sign in and sign up call the existing Spring auth backend.
- Uploads call the async invoice endpoint and poll jobs.
- Preview mode works without login so you can show the flow before wiring everything.
