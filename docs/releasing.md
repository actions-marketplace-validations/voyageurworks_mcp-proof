# Releasing mcp-proof

Every step that goes outside this computer needs the owner's explicit yes, one step at a time.

## Where things stand (2026-11-03)
- The GitHub repository `voyageurworks/mcp-proof` exists and is **private**. It holds one clean first commit plus normal commits on top (author: `mcp-proof contributors <noreply@example.com>`). Only that history was pushed.
- The CI workflow is green on GitHub-hosted runners: Ubuntu, macOS and Windows, Node 22 and 24, the built-in stand-in client, the Action run from a packed tarball, and Claude Code 2.1.317 installed from its official npm package on each system.
- Nothing is tagged, released, published to npm, or public.

## Steps left for the first release (owner steps)
1. Decide whether to make the repository public. While it is private, GitHub bills macOS runner minutes at ten times and Windows at twice the normal rate against the free plan's allowance; a public repository has no such cost.
2. Turn on private vulnerability reporting and branch protection for `main`, and create the `npm-publish` environment with a required reviewer.
3. On npmjs.com, with the `@voyageurworks` scope in place: hand-publish `0.1.0` once from a clean checkout of the released commit with `npm publish --access public` (trusted publishing needs an existing package; `package.json` also sets `publishConfig.access`). Then add the trusted publisher for `voyageurworks/mcp-proof`, workflow `release.yml`, environment `npm-publish`.
4. Tag `v0.1.0` and create the GitHub release. The release workflow sees the version is already on npm and skips publishing.
5. Create the `v0` tag that the Action's `@v0` refers to (a separate, deliberate step; move it on each later 0.x release).
6. Optional, each its own yes: list the Action on the GitHub Marketplace, and list the package in the MCP directories you use.

## Every later release
1. `pnpm check && pnpm test && pnpm build` on a clean checkout; the whole CI matrix must be green.
2. Bump `version` in `package.json` (the CLI reads it, a test checks they agree) and update `CHANGELOG.md`.
3. Read `npm pack --dry-run`: the tarball must hold only `dist`, `README.md`, `LICENSE`, `CHANGELOG.md`, `SECURITY.md`, `docs` and `action.yml`.
4. If a recipe changed, run the real-client check on a machine that has the client (`node dist/main.js run --client claude-code --out proof -- <a known-good server>`) and update the README's "Checked" text with the version and system.
5. Tag `vX.Y.Z` and publish the GitHub release; the workflow pauses at the `npm-publish` environment. Before approving, check the tag, the version and the tarball.

## What 0.1.0 does and does not claim
It claims a `compat.json` schema 1 that is meant to stay stable, and honest labels. It supports one real client (Claude Code); the README says so. Under 0.x the command line may still change in a minor release; a 1.0 should wait until more than one real client has been run.
