# Contributing to DevForge

This repo is the club's website and member portal at [devforge.club](https://www.devforge.club). It's also where **milestone 2 of the [10 PR Journey](https://www.devforge.club/workbook)** happens: your first real code change, reviewed by a maintainer who wants you to succeed.

> Haven't done milestone 1 yet? Sign the workbook first: [NST-DEVFORGE/workbook](https://github.com/NST-DEVFORGE/workbook).

## 1. Pick an issue

- Browse [`good first issue`](https://github.com/NST-DEVFORGE/DevForge/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). Each one names the file, says what "done" means, and estimates the diff size.
- Comment **"I'd like to take this"** and **wait to be assigned**. No code before that. It stops two people fixing the same thing.
- One issue at a time. If you go quiet for a week, it gets unassigned so someone else can pick it up.
- Found something that isn't listed? Open an issue with the *Improvement* or *Bug report* template first.

## 2. Set up

You need **Node 24** and **npm**.

```bash
# fork on GitHub first, then:
git clone https://github.com/<you>/DevForge.git
cd DevForge
git remote add upstream https://github.com/NST-DEVFORGE/DevForge.git
npm install
npm run dev          # http://localhost:3000
```

**No secrets needed.** The public pages, the build and the tests all run without any `.env` file. Pages that need the member portal's database (sign-in, dashboard, admin) show an error locally. That's expected, and none of the `good first issue`s need them.

## 3. Make the change

```bash
git checkout main && git pull upstream main
git checkout -b fix/<issue-number>-<short-name>     # e.g. fix/37-navbar-next-image
```

- Keep it small: **under ~50 lines**, and only what the issue asks for. Found something else along the way? Open a new issue for it.
- Match the code around you: its naming, comment style and Tailwind patterns.

Before you push, run exactly what CI runs:

```bash
npm run lint     # ESLint
npm test         # Vitest unit tests (lib/**/*.test.ts)
npm run build    # type-check + production build
```

## 4. Open the pull request

- Title: what changed, e.g. `Navbar logo: use next/image`.
- Fill in the PR template. Include **`Fixes #<issue>`**, how you tested it, and a screenshot for anything visible.
- **CI must be green**: the Lint, Test and Type-check & build checks. If one fails, open the log, fix it and push again. Don't ask someone else to re-run it.

### "Pull request creation failed: must be a collaborator"

You opened the PR between two branches **of this repo** instead of from your fork. Only maintainers can do that. Go to **your fork**, click **Contribute → Open pull request**, and check the bar reads:

**base repository: `NST-DEVFORGE/DevForge` · base: `main`** ← **head repository: `<you>/DevForge` · compare: `<your branch>`**

If you only see branch dropdowns, click **compare across forks**. Never pick `main` as the *compare* side: that's our code, not yours.

## 5. Review

- A maintainer reviews it. Reply to **every** comment: change the code, or explain your reasoning once.
- Push follow-up commits to the **same branch**. Don't close the PR and open a new one.
- When it's merged, log the PR URL on milestone 2 of [the workbook](https://www.devforge.club/workbook) and write your reflection within 48 hours.

## Writing tests

Tests use [Vitest](https://vitest.dev) and live next to the code: `lib/foo.ts` → `lib/foo.test.ts`. See `lib/github-auth.test.ts` for the house style. A good test fails when the code is broken, so break the line you're testing on purpose once, and watch the test go red.

## Deployments

Only `main` deploys to [devforge.club](https://www.devforge.club), via Vercel. Pull requests don't get preview deployments; CI (GitHub Actions) is what checks your PR.
