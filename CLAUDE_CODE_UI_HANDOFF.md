# Claude Code UI Handoff

## Project Goal

This app is an internal Amazon listing image workflow platform.

Core user goal:
1. Upload product reference photos.
2. Collect selling points from manual input, SKU/ERP data, or Amazon competitor research.
3. Confirm which claims can be used in images.
4. Generate a flexible 7-image plan.
5. Generate candidate listing images or A+ images.
6. Human review and export final images as ZIP.

The app must support many product categories, not only one product type.

## Current Product Direction

The app should feel like a practical internal production tool for designers and operators.

Avoid:
- Dense dashboards on every step.
- Showing backend quality metrics to normal users by default.
- Marketing landing-page composition.
- Nested cards inside cards.
- Decorative gradients/orbs without functional purpose.
- Fixed product-category language such as "foldable" when a product may not fold.

Prefer:
- Clear step-by-step workflow.
- One obvious primary action per page.
- Compact but readable operational UI.
- Collapsible advanced details.
- Strong text truncation and no overflow.
- Stable button, card, and status systems.

## Current Navigation

Main 6-step workflow:
1. 项目资料
2. 卖点确认
3. 图片方案
4. 生成图片
5. 审核图片
6. 导出图片

Global tools in the sidebar:
- 质量 Console
- 品牌库

Do not turn Brand Library or Quality Console into main workflow steps.

## Files To Focus On

Main app:
- `src/main.jsx`

Styles:
- `src/styles.css`

Do not modify API/server logic unless absolutely necessary:
- `api-server.mjs`

## Recent UI Changes Already Made

- Top workflow steps were changed into compact horizontal navigation.
- Status pills were normalized visually.
- Project intake page was simplified:
  - First layer keeps the core project form.
  - Create mode, image audit, draft stats, and ERP/evidence details are now collapsible.
- Quality metrics, CSV import/export, failure leaderboard, and prompt tuning were moved into `质量 Console`.
- Brand Library stays as a global sidebar tool.
- Storyboard cards hide low-value dark overlay labels.
- Desktop and mobile overflow checks passed after the last update.

## Known UI/UX Problems To Improve Next

1. Overall visual style still feels inconsistent.
2. Some pages still show too much text at once.
3. Page hierarchy can be calmer:
   - Step title
   - Current action
   - Current content
   - Optional details
4. Buttons and controls should feel more polished and consistent.
5. The app needs better onboarding for first-time users without adding explanatory marketing blocks.
6. Review and generation pages should reduce repeated status text.
7. Storyboard/plan cards should feel like direction cards, not final image cards.
8. Empty states should tell the user what to do next in one sentence.

## Business Logic Boundaries

Please do not break these:

- Image generation has two modes:
  - Single selling point generates multiple candidates.
  - Each selling point/image slot generates one candidate.
- Generated images should be auto pre-reviewed by AI.
- Manual review remains the final decision.
- Product reference photos must remain the source of truth.
- 01 main image must remain pure white background.
- Other listing images can use scene/background/brand color when appropriate.
- Visible text in generated images should be English.
- User inputs may be Chinese; professional terms may stay English.
- The app should eventually support SKU/ERP mode and no-SKU mode.
- Brand Library will later drive logo/color/style rules.

## Suggested Claude Code Task

Please improve the UI/UX without changing core business logic.

Priority:
1. Create a more coherent visual system across pages.
2. Reduce visual noise and repeated text.
3. Make cards, buttons, status pills, and page headers consistent.
4. Keep first-time user guidance lightweight and action-oriented.
5. Preserve all existing functionality.
6. After changes, run `npm run build`.

## Validation Checklist

After editing:
- `npm run build` passes.
- No obvious text overflow on desktop.
- No horizontal page overflow on mobile width around 390px.
- Main 6-step flow is still present.
- `质量 Console` and `品牌库` remain global sidebar tools.
- Project intake still supports product reference images and selling point input.
- Generation page still has both generation modes.
- Export still downloads final images ZIP.

## Local Backup

Before this handoff, the current `src/main.jsx` and `src/styles.css` were copied to:

`backups/ui-handoff-20260616/`
