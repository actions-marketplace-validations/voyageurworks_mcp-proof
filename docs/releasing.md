# Releasing mcp-proof

Every step that goes outside this computer needs the owner's explicit yes, one step at a time.

## Where things stand (2026-11-03)
- The GitHub repository `voyageurworks/mcp-proof` exists and is **private**. It holds one clean first commit plus normal commits on top (author: `mcp-proof contributors <noreply@example.com>`). Only that history was pushed.
- The CI workflow is green on GitHub-hosted runners: Ubuntu, macOS and Windows, Node 22 and 24, the built-in stand-in client, the Action run from a packed tarball, and Claude Code 2.1.317 installed from its official npm package on each system.
- Nothing is tagged, released, published to npm, or public.
- Already set on the repository: Actions are limited to GitHub-owned actions with full-length commit SHAs required (the workflows use only `actions/*`, pinned), the default token is read-only, and workflows cannot approve pull requests. `npm publish --dry-run --access public` was run and shows 25 files.

## Why the repository has to be public before the release gates exist
GitHub's free plan does not offer required-reviewer environments, branch protection or private vulnerability reporting on a **private** repository (the API answers "billing plan" / "upgrade or make public"). They are free on a public one. So the order below matters: the approval gate that protects the release workflow cannot be created until the repository is public, and nothing may be published to npm before it exists.

## Steps left for the first release (owner steps, in this order)
1. **Make the repository public.** This is the launch decision: the code and its history become visible. It also ends the 10x macOS and 2x Windows billing of private-repo CI minutes.
2. **Immediately set the gates** (the commands are in the launch pack): create the `npm-publish` environment with yourself as required reviewer, protect `main` (no force-push, no deletion, CI required), turn on private vulnerability reporting, and turn on secret scanning with push protection.
3. On npmjs.com, with the `@voyageurworks` scope in place and you logged in (`npm login`, which only you do): hand-publish `0.1.0` once from a clean checkout of the released commit with `npm publish --access public` (trusted publishing needs an existing package; `package.json` also sets `publishConfig.access`). Then add the trusted publisher for `voyageurworks/mcp-proof`, workflow `release.yml`, environment `npm-publish`. Do not add the trusted publisher before step 2.
4. Tag `v0.1.0` and create the GitHub release. The release workflow sees the version is already on npm and skips publishing.
5. Create the `v0` tag that the Action's `@v0` refers to (a separate, deliberate step; move it on each later 0.x release).
6. Optional, each its own yes: list the Action on the GitHub Marketplace, and list the package in the MCP directories you use.

## macOS and the full matrix
GitHub's free macOS runners are scarce (a free plan gets at most 5 macOS jobs at once, and runs sometimes sit unassigned for 20 to 30 minutes and are then cancelled with "not acquired by Runner of type hosted"). So an ordinary push runs Ubuntu and Windows plus **one** macOS job; the **full** matrix (everything on all three systems, macOS on Node 22 and 24) runs when a `v*` tag is pushed, or by hand from Actions, CI, Run workflow, `full` = true.
- A cancelled macOS job is not a code failure. Re-run only the failed jobs and try again later; do not edit code for it. Never leave several macOS runs queued: the workflow cancels a stale run on the same ref.
- If macOS cannot run when you want to release, release anyway and say so by commit: name the last commit whose macOS jobs passed, its date, and that the release commit was not re-run on macOS. Do not claim more than ran.
- Evidence so far: the macOS jobs passed on commits `748fabd`, `2b106f2`, `e1e74ae` and `8914a09` (2026-11-03); the commits after that were docs, issue forms and workflow changes.

## Every later release
1. `pnpm check && pnpm test && pnpm build` on a clean checkout; the CI jobs must be green, and the full matrix (run on the tag, or by hand) should be green too.
2. Bump `version` in `package.json` (the CLI reads it, a test checks they agree) and update `CHANGELOG.md`.
3. Read `npm pack --dry-run`: the tarball must hold only `dist`, `README.md`, `LICENSE`, `CHANGELOG.md`, `SECURITY.md`, `docs` and `action.yml`.
4. If a recipe changed, run the real-client check on a machine that has the client (`node dist/main.js run --client claude-code --out proof -- <a known-good server>`) and update the README's "Checked" text with the version and system.
5. Tag `vX.Y.Z` and publish the GitHub release; the workflow pauses at the `npm-publish` environment. Before approving, check the tag, the version and the tarball.

## What 0.1.0 does and does not claim
It claims a `compat.json` schema 1 that is meant to stay stable, and honest labels. It supports one real client (Claude Code); the README says so. Under 0.x the command line may still change in a minor release; a 1.0 should wait until more than one real client has been run.
