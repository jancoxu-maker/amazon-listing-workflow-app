# Vistamz Internal Beta Plan

## Phase 1: Local Release Readiness

- [x] Create a local backup before release work.
- [x] Confirm build passes.
- [x] Keep API keys out of source control.
- [x] Add deploy-oriented environment variables.
- [x] Update README to match the current workflow.
- [ ] Confirm three product categories can complete the workflow.
- [ ] Confirm export ZIP contains only approved final images.
- [ ] Confirm generated image and export URLs work outside localhost when `PUBLIC_BASE_URL` is set.

## Phase 2: GitHub Preparation

- [ ] Initialize Git repository if needed.
- [ ] Commit only source, config examples, docs, and public static assets.
- [ ] Confirm `.env.local`, `generated-images`, `exports`, `backups`, `node_modules`, and `dist` are excluded.
- [ ] Push to a private company GitHub repository.

## Phase 3: Internal Beta Platform Requirements

- [ ] Add user login.
- [ ] Add roles: designer, operator, admin.
- [ ] Add project owner and reviewer assignment.
- [ ] Move projects from browser localStorage to a server database.
- [ ] Move brand library from localStorage to database.
- [ ] Store generated images and export packages in server storage or object storage.
- [ ] Add audit records for image generation, AI review, human review, and export.

## Phase 4: Deployment Shape

- Frontend: static app hosted behind company internal URL.
- Backend: Node API service with one company-managed image API key.
- Storage: server disk for beta, object storage for larger rollout.
- Database: SQLite or Postgres for beta, Postgres recommended for multi-user rollout.
- Access: private network or login-gated internal app.

## Phase 4A: Vercel + Render Smoke Deployment

- [x] Add Render backend Blueprint config.
- [x] Add Vercel frontend project config.
- [ ] Deploy Render web service from GitHub.
- [ ] Set `GEMINI_API_KEY` in Render.
- [ ] Confirm `GET /api/health` returns `ok: true`.
- [ ] Deploy Vercel frontend from GitHub.
- [ ] Set `VITE_IMAGE_API_BASE_URL` in Vercel to the Render URL.
- [ ] Redeploy Vercel after setting the API URL.
- [ ] Generate one full image candidate online.
- [ ] Export one ZIP online.

## Phase 5: Beta Acceptance Criteria

- A designer can create a project and submit generated images.
- An operator can review the assigned project.
- Only fully approved images can be exported.
- Export ZIP downloads successfully.
- API key is never visible in the browser.
- Different products do not inherit each other's images, claims, or storyboards.
