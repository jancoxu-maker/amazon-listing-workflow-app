# Product Backlog

## Deferred Workflow Changes

- Defer the final-candidate selection flow for now. Do not build `set as final image`, final-image locking, or export gating refinements until the current generation UI/UX and core run loop are stable.
- Image review should record reviewer identity by role. Recommended flow: design review first, operations review second, then final export.
- Export should require both design and operations approval for every final image.
- Keep this logic separate from the current UI/UX cleanup pass; implement after the visual flow feels clear.

## Completed

- In the 7-image plan stage, `needs revision` now regenerates only the current image slot plan and resets that slot to pending confirmation, without changing other slots or existing generation records.
- In the generation stage, the unreviewed candidate queue is now visible in the main workflow, issue states no longer auto-advance before reasons are selected, and selected failure reasons can be applied directly as prompt-tuning rules for the current image slot.
- Listing strategy rules now prioritize visual proof over explanatory text and forbid visual implication of blocked claims. Standard listing images keep a unified title/typography system, while A+ output is treated as a richer content module that does not require first-image white background, can place headings according to layout, and may combine related allowed claims.
- Brand library colors now require HEX color values with usage ratios. Brand-mode generation prompts strictly constrain backgrounds, labels, icons, callouts, and accents to the configured palette. Uploaded logos are only allowed in A+ output mode and are forbidden in main-image or non-A+ listing images.
- Brand palette data is now treated as internal art direction only. Generation prompts forbid visible HEX codes, color percentages, palette swatches, style-guide panels, or other prompt metadata, and AI pre-review flags that leakage as a text-risk failure.
- AI pre-review now uses a stricter production-gate standard. Any failed check forces an overall failure, any warning prevents a pass, and common product-drift, physics, prompt-leak, text, and aesthetic issues map into human review reasons more aggressively.
- Review has been simplified to a single human approval flow for the current app stage. Storyboard planning no longer shows design/ops pending labels, review cards include candidate image previews, generation can jump to review once every slot has a usable human-approved candidate, and export gates use human approval instead of dual role approval.
- Local draft deletion now allows the project list to become truly empty. Deleting the last draft no longer recreates the sample project, and the sidebar shows an empty-state prompt instead.
- Empty projects no longer fall back to the sample learning-tower reference image. Reference panels now show an upload placeholder until the user uploads an actual product image.
- Output type selection now happens in the storyboard planning stage. Main-image plans and A+ plans use different planning rules, generated briefs carry the selected output preset, generation follows the planned output type, and switching output type clears old briefs/candidates to prevent rule mismatch.
