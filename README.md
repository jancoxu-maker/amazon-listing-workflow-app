# Vistamz

Internal Amazon listing image workflow app for generating and reviewing main image / A+ image sets from product photos and product claims.

## Current Release Target

This codebase is preparing for a v0.1 internal beta, not a full production release.

The beta goal is to let a small internal team test the complete workflow:

- Create one product project.
- Upload product reference images.
- Generate or edit the product claim ledger.
- Choose main-image or A+ planning mode.
- Generate 7 image directions.
- Generate image candidates through the local image API.
- Run AI pre-review and human review.
- Export approved image files as a ZIP package.

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Create local environment config.

```bash
cp .env.local.example .env.local
```

3. Fill in `.env.local`.

Required for Gemini image generation:

```text
IMAGE_API_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
```

4. Start the API server.

```bash
npm run api
```

5. Start the frontend in another terminal.

```bash
npm run dev -- --port 5173
```

Open:

```text
http://localhost:5173/
```

## Release Check

Run this before every beta handoff:

```bash
npm run check
```

This checks the local API server syntax and builds the frontend.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `IMAGE_API_PROVIDER` | `gemini` or `openai`. Current beta defaults to Gemini. |
| `GEMINI_API_KEY` | Server-side Gemini API key. Do not expose this in frontend code. |
| `GEMINI_TEXT_MODEL` | Gemini model for planning and AI review. |
| `GEMINI_IMAGE_MODEL` | Gemini model for image generation. |
| `OPENAI_API_KEY` | Optional OpenAI API key if switching provider. |
| `OPENAI_IMAGE_MODEL` | Optional OpenAI image model. |
| `API_PORT` | Local API server port. Default: `5174`. |
| `PUBLIC_BASE_URL` | Public URL used in generated image and export download links. |
| `CORS_ORIGIN` | Allowed frontend origin. Use the beta app URL after deployment. |
| `GENERATED_IMAGE_DIR` | Server-side generated image directory. |
| `EXPORT_DIR` | Server-side export package directory. |
| `VITE_IMAGE_API_BASE_URL` | Frontend API base URL. |

## Data Notes

Current beta storage is still local-first:

- Project drafts are stored in browser `localStorage`.
- Generated images are saved by the local API server.
- Export ZIP files are saved by the local API server.
- There is no shared database yet.

For company-wide internal beta, the next platform step is to add server-side project storage, accounts, and role-based review flow.

## Publishing Notes

Safe to commit to GitHub after confirming these files are not included:

- `.env.local`
- `generated-images/`
- `exports/`
- `backups/`
- `node_modules/`
- `dist/`

The `.gitignore` already excludes them.

## Beta Deployment Shape

Recommended internal beta architecture:

- One frontend app URL.
- One backend API service.
- One server-side API key managed by the company, not by each user.
- Internal login and project assignment added before wider team use.
- Object storage or server disk for generated images and export ZIPs.
- Database for projects, claim ledgers, review history, brand library, and user roles.

## Vercel + Render Beta Deployment

Recommended order:

1. Deploy the backend API on Render from this GitHub repository.
2. Copy the Render service URL, for example `https://listingflow-api.onrender.com`.
3. Deploy the frontend on Vercel from the same GitHub repository.
4. Set the Vercel environment variable:

```text
VITE_IMAGE_API_BASE_URL=https://your-render-api-url.onrender.com
```

5. Redeploy the Vercel frontend after setting the environment variable.

Render backend environment variables:

```text
IMAGE_API_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_TEXT_MODEL=gemini-3.5-flash
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
```

Optional after the Vercel URL is known:

```text
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

For the first beta, generated images and ZIP exports use the Render service filesystem. This is enough for smoke testing, but not a durable multi-user storage plan. Use object storage or a persistent disk before wider rollout.

## Known Gaps Before Wider Rollout

- No account login yet.
- No shared project database yet.
- No per-user design / operation assignment yet.
- No immutable audit log yet.
- Brand library is still local storage.
- Visual generation quality still depends on model output and prompt iteration.
