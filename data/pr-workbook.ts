export type Arena = "workbook" | "club" | "external";

export interface Milestone {
    n: number;
    title: string;
    goal: string;
    arena: Arena;
    /** Acceptance criteria. All must be true before the milestone is signed off. */
    done: string[];
    /** The specific way students fail this one. Written from real club PRs. */
    trap: string;
    /** Asked in addition to the five standard reflection fields. */
    reflect: string;
    est: string;
    /** The process, in order. Text between backticks renders as code. */
    steps: string[];
    /** Where the work happens, or where to go looking for it. */
    links?: { label: string; href: string }[];
}

export const ARENA_LABELS: Record<Arena, string> = {
    workbook: "This workbook",
    club: "A DevForge repo",
    external: "A real outside project",
};

/**
 * The 10 PR Journey.
 *
 * Ordering rules that produced this ladder:
 *  - Nobody touches an external repo before milestone 3. The first two PRs are
 *    supervised, because a cohort of beginners opening typo PRs at strangers is
 *    how a club gets a reputation it cannot undo.
 *  - Documentation is milestone 6, not 1. Docs written after you have been
 *    confused by a codebase are worth reading; typo fixes teach only git.
 *  - Tests come before fixes. A test PR has the highest acceptance rate of
 *    anything a beginner can open, and it forces you to read the code.
 *  - Milestone 9 cannot be completed by getting it right the first time.
 */
export const milestones: Milestone[] = [
    {
        n: 1,
        title: "Sign the workbook",
        goal: "Open a pull request to the NST-DEVFORGE/workbook repo that adds your own signature file. Your first PR is to us, not to a stranger.",
        arena: "workbook",
        done: [
            "You worked on a branch, not on main — your PR shows one file changed, not forty",
            "The Validate signature check is green",
            "If the bot asked for fixes, you pushed them to the same PR (not a new one)",
            "The bot merged your PR",
        ],
        trap: "Committing to main on your fork, then wondering why the PR contains everyone else's work. If your diff has files you did not touch, close it and start the branch again.",
        reflect: "Which part of fork → branch → commit → PR did you have to look up? Be honest — everyone looks something up here.",
        est: "One evening",
        steps: [
            "Open the workbook repo (link below) and read its README once, top to bottom.",
            "Click Fork. You now own a copy at `github.com/<you>/workbook`.",
            "Clone your fork, not ours: `git clone https://github.com/<you>/workbook.git`, then `cd workbook`.",
            "Make a branch before touching anything: `git checkout -b sign/<your-github-username>`.",
            "Copy the template to a file named after your exact GitHub username: `cp signatures/_template.md signatures/<your-github-username>.md`. Case matters.",
            "Fill it in: your name as the heading, then Batch, one honest line for I'm here to, and One thing I've built (\"nothing yet\" is fine). Keep the `- **GitHub:** @<your-github-username>` line exactly — the automated check reads it.",
            "Commit and push: `git add signatures/<your-github-username>.md`, then `git commit -m 'Sign the workbook: <your name>'`, then `git push -u origin sign/<your-github-username>`.",
            "On GitHub, click Compare & pull request. Base: `NST-DEVFORGE/workbook` · `main`. Head: your fork · your branch. Files changed must show exactly one file. Fill in the PR template.",
            "Within a minute the Validate signature check runs and the workbook bot comments on your PR. If something is wrong, the comment lists every problem and how to fix it.",
            "Fix what the bot lists on the same branch, commit, push. The check re-runs and the comment updates — do not open a second PR.",
            "Once the check is green, the bot merges your PR automatically and leaves a few polish tips.",
            "Once it is merged, paste the PR URL (`https://github.com/NST-DEVFORGE/workbook/pull/<number>`) into milestone 1 below and write your reflection.",
        ],
        links: [
            { label: "Sign here: NST-DEVFORGE/workbook", href: "https://github.com/NST-DEVFORGE/workbook" },
            { label: "Signature template", href: "https://github.com/NST-DEVFORGE/workbook/blob/main/signatures/_template.md" },
        ],
    },
    {
        n: 2,
        title: "Fix something that is ours",
        goal: "A real code change in a DevForge repo — the portal, a club project, a script. Real review, forgiving maintainer.",
        arena: "club",
        done: [
            "An issue exists and is assigned to you before you write code",
            "The diff is under ~50 lines",
            "CI is green without anyone re-running it for you",
            "Reviewed by a maintainer and merged",
        ],
        trap: "Picking something too big because it sounded more impressive. If your diff passes 100 lines at milestone 2, you chose wrong — split it or pick again.",
        reflect: "How long between understanding the bug and having a fix? Where did that time actually go — reading, setup, or typing?",
        est: "Two to four evenings",
        steps: [
            "Browse the DevForge repos and their open issues. Look for `good first issue`, or something small you have hit yourself on the portal.",
            "If there is no issue for it, open one: what is wrong, where, and how you would fix it.",
            "Comment `/assign` on the issue. A bot assigns you if it is free: one open issue per person, and `/unassign` hands it back. No code before you are assigned.",
            "Fork the repo on GitHub, clone your fork, and get it running locally (`npm install`, then `npm run dev`). Setup is part of the milestone.",
            "Branch off the latest `main`: `git checkout -b fix/<short-description>`.",
            "Make the smallest change that fixes it — under ~50 lines. Run `npm run lint`, `npm test` and `npm run build` before pushing: they are exactly what CI runs.",
            "Open the PR from your fork into `NST-DEVFORGE/DevForge` · `main` (\"compare across forks\"), with `Fixes #<issue number>`, a one-line summary, and a screenshot if anything visible changed.",
            "Wait for CI (Lint, Test, Type-check & build) to go green. If a check fails, open its log and fix it yourself.",
            "Address the review on the same branch until it is merged, then submit the PR URL here.",
        ],
        links: [
            { label: "DevForge issues", href: "https://github.com/NST-DEVFORGE/DevForge/issues" },
            { label: "All DevForge repos", href: "https://github.com/NST-DEVFORGE" },
        ],
    },
    {
        n: 3,
        title: "File a bug nobody can dismiss",
        goal: "A reproducible issue on a real outside project. No code in this milestone at all.",
        arena: "external",
        done: [
            "Exact version, OS, and commit SHA",
            "Minimal steps a stranger can follow without asking you anything",
            "Expected behaviour vs. what actually happened, stated separately",
            "You searched the existing issues first and linked the closest one you found",
            "A maintainer responded — any response counts, including 'duplicate'",
        ],
        trap: "\"It doesn't work.\" Also: filing before searching. Being a duplicate is fine if you say what you searched for; being unreproducible is not.",
        reflect: "Paste the maintainer's first reply verbatim. What did it assume you already knew?",
        est: "About a week of watching one repo",
        steps: [
            "Pick one outside project you actually use, or one from our starter list, and plan to stay in it for several milestones.",
            "Read its README, CONTRIBUTING.md and issue templates before anything else.",
            "Use the project until something breaks, or reproduce an open bug on the latest release.",
            "Search open and closed issues for it. Note the search terms you used and the closest issue you found.",
            "Cut the reproduction down to the fewest steps that still show the bug.",
            "File the issue using their template: version, OS, commit SHA, numbered steps, expected vs. actual as separate sections, and a link to the closest existing issue.",
            "Watch it and reply promptly to any question. Once a maintainer responds — even with 'duplicate' — submit the issue URL here.",
        ],
        links: [
            { label: "Starter repos we recommend", href: "/learn#starter-repos" },
            { label: "Search good first issues", href: "https://github.com/search?q=label%3A%22good+first+issue%22+state%3Aopen&type=issues" },
        ],
    },
    {
        n: 4,
        title: "Add a test for something that already works",
        goal: "Cover existing untested behaviour. No behaviour change. This is the highest-acceptance PR a beginner can open.",
        arena: "external",
        done: [
            "You broke a line of the source on purpose and watched your test fail — output pasted in the reflection",
            "It follows the repo's existing test conventions, not your own",
            "You can run the full suite locally",
            "CI green",
        ],
        trap: "Writing a test that passes even when the feature is broken. If you did not watch it fail, you did not write a test — you wrote a comment that takes 40ms to run.",
        reflect: "What did reading the test suite tell you about this codebase that reading the source did not?",
        est: "About a week",
        steps: [
            "Stay in the same project. Clone it and get the full test suite passing locally before you change anything.",
            "Find behaviour with no test: run coverage if the project has it, or read a module and then look for its test file.",
            "Read three or four existing tests and copy their structure, naming and helpers exactly.",
            "Write your test and watch it pass.",
            "Break the source line it covers on purpose and watch the test fail. Copy that failure output for your reflection, then revert.",
            "Commit only the test file(s), open a PR titled something like `test: cover <behaviour>`, and explain what is now covered.",
            "Get CI green, respond to review, then submit the PR URL here.",
        ],
        links: [
            { label: "Starter repos we recommend", href: "/learn#starter-repos" },
        ],
    },
    {
        n: 5,
        title: "Fix the bug",
        goal: "Fix the issue you filed at milestone 3, or a good-first-issue that a maintainer assigned to you.",
        arena: "external",
        done: [
            "You commented on the issue and got a reply before writing code",
            "The fix ships with a test — the skill you built at milestone 4",
            "The PR closes the issue with 'Fixes #N'",
            "At least one round of review that you responded to",
        ],
        trap: "Opening the PR before commenting on the issue. Two people silently fixing the same bug is how contributors burn out and how maintainers stop labelling issues for beginners.",
        reflect: "What was the actual root cause, and what did you believe it was during the first hour?",
        est: "About two weeks",
        steps: [
            "Take the issue you filed at milestone 3, or a `good first issue` in the same project.",
            "Comment on it: say what you think the cause is and how you would fix it, and ask to take it.",
            "Wait for a maintainer to reply. If someone else is already on it, pick a different issue.",
            "Write a failing test that reproduces the bug first, then write the fix that makes it pass.",
            "Open the PR with `Fixes #<issue number>`, the root cause in one or two sentences, and how you tested it.",
            "Respond to every review comment — change the code or explain why not — until it is merged or closed. Then submit the PR URL here.",
        ],
        links: [
            { label: "Search good first issues", href: "https://github.com/search?q=label%3A%22good+first+issue%22+state%3Aopen&type=issues" },
        ],
    },
    {
        n: 6,
        title: "Write the documentation you needed",
        goal: "Document the exact thing that confused you at milestone 4 or 5. Now you have earned this PR.",
        arena: "external",
        done: [
            "Not a typo fix — a new explanation, a worked example, or a section you rewrote",
            "You can name the moment you were confused and link the code that confused you",
            "Merged, or carrying maintainer feedback you have responded to",
        ],
        trap: "This is the milestone that looks easy and is not. If you cannot point at the hour you were stuck, you have not earned it yet — go back and finish 4.",
        reflect: "What did the existing docs assume about the reader that turned out to be untrue for you?",
        est: "Three to five days",
        steps: [
            "Go back to your notes from milestones 4 and 5 and find the moment you were stuck the longest.",
            "Find where the docs should have explained it: the README, the docs site, a docstring, CONTRIBUTING.md.",
            "For anything larger than a paragraph, open an issue first proposing the change.",
            "Write it for the person you were that day: a worked example, a new section, or a rewrite of the confusing part.",
            "Open the PR and link the code or issue that confused you. Say who the change is for.",
            "Respond to the maintainer's feedback, then submit the PR URL here.",
        ],
    },
    {
        n: 7,
        title: "Ship a feature you negotiated first",
        goal: "A change the maintainers agreed to before you built it. The conversation is the milestone; the code is the receipt.",
        arena: "external",
        done: [
            "An issue or discussion where you proposed it and a maintainer said some version of yes",
            "The scope you shipped matches the scope that was agreed",
            "The PR links that conversation",
            "Merged, or open with active maintainer engagement",
        ],
        trap: "Building first and asking after. Second trap: the unsolicited refactor. If your PR title starts with 'refactor' and nobody asked for it, expect it closed. Refactor when a reviewer asks, inside the PR they asked in.",
        reflect: "What did the maintainer change about your proposal before agreeing to it?",
        est: "Three to four weeks",
        steps: [
            "Find a missing feature in the same project — ideally one users have already asked for in issues.",
            "Open an issue or discussion proposing it: the problem, the proposed behaviour, and what is out of scope.",
            "Wait for a maintainer to agree. Adjust the scope they push back on — that negotiation is the milestone.",
            "Build only the agreed scope. Add tests and docs as the project expects.",
            "Open the PR linking the conversation, and state which parts of the agreed scope it covers.",
            "Keep engaging on review until it is merged, or open with a maintainer actively reviewing it. Then submit the PR URL here.",
        ],
    },
    {
        n: 8,
        title: "Review someone else's work",
        goal: "Two reviews: one on a club member's PR, one on a stranger's. Sit on the other side of the table.",
        arena: "external",
        done: [
            "Each review carries at least one specific, actionable comment — 'LGTM' is not a review",
            "You ran or genuinely read the code, and can say which",
            "You asked at least one real question about something you did not understand",
        ],
        trap: "Rubber-stamping, and its mirror image — nitpicking whitespace and naming that a linter already handles. Both tell the author you did not read it.",
        reflect: "What did you fail to understand in their code, and did you say so out loud in the review?",
        est: "About a week",
        steps: [
            "Club review: pick an open PR on a DevForge repo, check out the branch locally and run it.",
            "Stranger review: pick an open PR in your outside project, in an area you now know.",
            "Read the linked issue first so you know what the PR is meant to do.",
            "Leave at least one specific, actionable comment on a line of code, and one real question about something you did not understand.",
            "Say in the review whether you ran the code or only read it.",
            "Submit the stranger's PR URL here (it must be outside DevForge), and put both review links in your reflection.",
        ],
        links: [
            { label: "Open DevForge PRs", href: "https://github.com/NST-DEVFORGE/DevForge/pulls" },
        ],
    },
    {
        n: 9,
        title: "Survive a hard review",
        goal: "A PR that took three or more rounds, or one that got closed. This is the only milestone you cannot complete by getting it right first time.",
        arena: "external",
        done: [
            "Three or more rounds of review that you worked through — or a closed PR",
            "A closed PR completes this milestone in full. That is the point of it",
            "You did not argue past the second 'no', and you did not disappear",
        ],
        trap: "Arguing, or ghosting. They end the same way, and maintainers remember both.",
        reflect: "Quote the harshest piece of feedback you received. Was it right? What would you tell yourself the day before you opened that PR?",
        est: "However long it takes",
        steps: [
            "This one is not planned — it happens to one of your PRs. Any PR from milestone 5 onward can count.",
            "When a review pushes back, answer every comment: change the code, or explain your reasoning once.",
            "If the answer is still no after the second round, accept it. Thank them, and close or narrow the PR.",
            "Never go quiet for more than a few days in an active review. If you need time, say so.",
            "Once it reaches three or more rounds, or gets closed, submit the PR URL and write the reflection honestly.",
        ],
    },
    {
        n: 10,
        title: "The one you would defend",
        goal: "A contribution the project actually keeps, and that you can talk about for fifteen minutes without notes.",
        arena: "external",
        done: [
            "Merged, and shipped in a release or a release branch",
            "You can explain the root cause, the approaches you rejected, and what a reviewer caught that you missed",
            "You presented it to the club in five minutes and took questions",
        ],
        trap: "Choosing the largest diff instead of the one you understand best. Nobody in an interview counts your lines.",
        reflect: "This is your interview answer. Write it as one, out loud, and time yourself.",
        est: "The rest of the semester",
        steps: [
            "Choose the contribution you understand best from the project you have stayed in — not the biggest one.",
            "Make sure it is merged and has shipped in a release or a release branch.",
            "Write down the root cause, the approaches you rejected and why, and what a reviewer caught that you missed.",
            "Build a 5-minute talk: the problem, the investigation, the fix, the review.",
            "Present it at a club session and take questions.",
            "Submit the PR URL and write your reflection as your interview answer.",
        ],
    },
];

export interface ReflectionField {
    label: string;
    limit: string;
    hint: string;
}

/**
 * Five fields, hard caps, filed within 48 hours of the review.
 * Free-form journals die in week three; a short fixed template survives a semester.
 */
export const reflectionTemplate: ReflectionField[] = [
    {
        label: "What I tried",
        limit: "100 words",
        hint: "The approach you took — including the one you abandoned before it.",
    },
    {
        label: "What broke",
        limit: "100 words",
        hint: "The error, the wrong assumption, or the dead end. \"Nothing\" is not an answer; if nothing broke, the task was too small.",
    },
    {
        label: "What the reviewer said",
        limit: "verbatim",
        hint: "Paste the actual comment. Do not paraphrase — paraphrasing sands the lesson off.",
    },
    {
        label: "What I would do differently",
        limit: "60 words",
        hint: "One concrete change to how you'd approach the next one.",
    },
    {
        label: "The numbers",
        limit: "one line",
        hint: "Hours spent · rounds of review · status (merged / open / closed).",
    },
];

/** The rules that stop this becoming a checklist people game. */
export const rules: { rule: string; why: string }[] = [
    {
        rule: "A closed PR still counts.",
        why: "Every milestone except the last completes on a good reflection, not on a merge. You do not control whether a maintainer merges you; you control what you learned.",
    },
    {
        rule: "No pull request before the issue.",
        why: "From milestone 3 onward you comment first and wait for a reply. Unannounced PRs are the single fastest way to waste a maintainer's afternoon.",
    },
    {
        rule: "One repo, at least three milestones.",
        why: "Depth beats breadth. Maintainers review known names properly and drive-by contributors barely at all — and you cannot do milestone 10 in a codebase you met last week.",
    },
    {
        rule: "Milestones 1 and 2 stay in-house on purpose.",
        why: "You do not take training wheels into a stranger's repository. Learn the mechanics where the cost of getting it wrong is a teammate's five minutes.",
    },
    {
        rule: "Reflections are due within 48 hours of the review.",
        why: "Written at the end of the semester they are fiction. Written the same week they are the thing you actually bring to an interview.",
    },
    {
        rule: "The goal is one deep story, not ten checkmarks.",
        why: "No interviewer is moved by ten pull requests. They are moved by one you can explain for fifteen minutes. The other nine are what make that one possible.",
    },
];

export const workbookMeta = {
    slug: "pr-workbook",
    cadence: "Roughly one milestone every two weeks — about a semester. Milestones 7, 9 and 10 will overlap, and should.",
    notThis: "This is not a course, and finishing it is not a certificate. Nothing here is completed by watching a video.",
};
