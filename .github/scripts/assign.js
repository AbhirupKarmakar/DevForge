// Self-service assignment for issues, run by .github/workflows/assign.yml.
//
//   /assign  (or "I'd like to take this" / "assign me")  → assigns the commenter
//   /unassign                                            → releases the issue
//
// One open issue per person at a time, so issues don't get hoarded; people with
// write access to the repo are exempt. GitHub lets anyone who has commented on
// an issue in a public repo be assigned to it, so no collaborator access is needed.

const ASSIGN = /^\s*\/assign\b|\bi['’]?d like to (?:take|work on) this\b|\bassign (?:this )?(?:to )?me\b/i;
const UNASSIGN = /^\s*\/unassign\b/i;

module.exports = async ({ github, context }) => {
    const { issue, comment } = context.payload;
    const { owner, repo } = context.repo;
    const user = comment.user.login;

    if (issue.pull_request || comment.user.type === "Bot") return;

    const reply = (body) =>
        github.rest.issues.createComment({ owner, repo, issue_number: issue.number, body });
    const assignees = (issue.assignees || []).map((a) => a.login.toLowerCase());
    const mine = assignees.includes(user.toLowerCase());

    if (UNASSIGN.test(comment.body)) {
        if (!mine) return;
        await github.rest.issues.removeAssignees({ owner, repo, issue_number: issue.number, assignees: [user] });
        return reply(`@${user} you've been unassigned. This issue is open for someone else to pick up.`);
    }

    if (!ASSIGN.test(comment.body)) return;

    if (issue.state !== "open") {
        return reply(`@${user} this issue is closed. Have a look at the [open good first issues](https://github.com/${owner}/${repo}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee).`);
    }
    if (mine) return;
    if (assignees.length > 0) {
        return reply(
            `@${user} this one is already taken by @${issue.assignees[0].login}. ` +
                `Pick another from the [unassigned good first issues](https://github.com/${owner}/${repo}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+no%3Aassignee).`,
        );
    }

    const { data: perm } = await github.rest.repos.getCollaboratorPermissionLevel({ owner, repo, username: user });
    const maintainer = ["admin", "maintain", "write"].includes(perm.permission);

    if (!maintainer) {
        const open = await github.paginate(github.rest.issues.listForRepo, {
            owner,
            repo,
            assignee: user,
            state: "open",
            per_page: 100,
        });
        const current = open.find((i) => !i.pull_request && i.number !== issue.number);
        if (current) {
            return reply(
                `@${user} you're already assigned to #${current.number}. It's one issue at a time: ` +
                    `finish that one (or comment \`/unassign\` on it) and then come back.`,
            );
        }
    }

    await github.rest.issues.addAssignees({ owner, repo, issue_number: issue.number, assignees: [user] });
    return reply(
        `@${user} it's yours! 🎉\n\n` +
            `1. Fork the repo and create a branch: see [CONTRIBUTING.md](https://github.com/${owner}/${repo}/blob/main/CONTRIBUTING.md).\n` +
            `2. Open your PR **from your fork** into \`main\`, with \`Fixes #${issue.number}\` in the description.\n` +
            `3. Make sure CI (Lint, Test, Type-check & build) is green.\n\n` +
            `Can't finish it? Comment \`/unassign\` so someone else can pick it up.`,
    );
};

module.exports.ASSIGN = ASSIGN;
module.exports.UNASSIGN = UNASSIGN;
