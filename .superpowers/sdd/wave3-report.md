# Wave 3 report: mobile member summary

Files: src/components/community/MemberCard.tsx, src/app/(site)/c/[handle]/community/layout.tsx

- MemberCard.tsx: shared `Details` content; `MemberCard` (desktop `<section class="card hidden lg:block">`, same markup/aria as before) and new `MemberCardCompact` (`<details class="group card lg:hidden">`, closed by default, summary "Level N · P points · S-day streak", streak omitted at 0, tabular-nums, min-h-10, focusRing, chevron with group-open:rotate-90).
- layout.tsx: DOM order is now nav, compact summary (`lg:hidden` wrapper), feed, desktop card (wrapper `hidden ... lg:block`, display:none below lg so it takes no grid gap/AT exposure). `order-first`/`lg:order-none` removed. lg/xl grid templates and sticky/col/row classes on desktop wrappers unchanged.
- Checks: typecheck, lint, test (541 passed, 1 skipped), build all pass.
- Not verified in a browser (no browser tool available): controller should measure 375/1024/1280 on /c/asha-rao/community/general.
