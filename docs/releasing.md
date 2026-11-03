# Releasing mcp-proof

Nothing here has been done yet. Every step that goes outside this computer needs the owner's explicit yes, one step at a time.

## Before the first release (owner steps)
1. Create the GitHub repository `voyageurworks/mcp-proof` (public, MIT) from the brand login. Check that the name is free on GitHub and npm first.
2. Push the single clean history (the first commit message must not hold a personal name; the local repo already uses the neutral identity `mcp-proof contributors <noreply@example.com>`). Do not push any other history.
3. Turn on private vulnerability reporting, branch protection for `main`, and create the `npm-publish` environment with a required reviewer.
4. On npmjs.com: hand-publish `0.1.0` once (trusted publishing needs an existing package), then add the trusted publisher for `voyageurworks/mcp-proof`, workflow `release.yml`, environment `npm-publish`. The scope `@voyageurworks` must exist.
5. Optional: list the Action on the GitHub Marketplace, and the package in the MCP directories you use. Each listing is its own yes.

## Every release
1. `pnpm check && pnpm test && pnpm build` on a clean checkout; the CI matrix (3 systems, Node 22 and 24, plus the stand-in self-proof) must be green.
2. Bump `version` in `package.json` (the CLI reads it, a test checks they agree) and update `CHANGELOG.md`.
3. Read `npm pack --dry-run`: the tarball must hold only `dist`, `README.md`, `LICENSE`, `CHANGELOG.md`, `SECURITY.md`, `docs` and `action.yml`.
4. Run the real-client check on a machine that has the client: `node dist/main.js run --client claude-code --out proof -- <a known-good server>`. Update the README's "Checked" text with the version and system you ran.
5. Tag `vX.Y.Z`, publish the GitHub release; the workflow pauses at the `npm-publish` environment. Before approving, check the tag, the version and the tarball. Moving the `v0` Action tag is a separate, deliberate step.

## What 0.1.0 does and does not claim
It claims a `compat.json` schema 1 that is meant to stay stable, and honest labels. It supports one real client (Claude Code); the README says so. Under 0.x the command line may still change in a minor release; a 1.0 should wait until more than one real client has been run. The CI matrix (3 systems, Node 22 and 24, the stand-in, the Action from a tarball, and Claude Code 2.1.317 on each system) was green on a private repository on 2026-11-03.
