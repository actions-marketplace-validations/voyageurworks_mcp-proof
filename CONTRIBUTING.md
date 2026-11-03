# Contributing

Thanks for helping. The short version:

- Node 22 or newer and pnpm. `pnpm install`, then `pnpm test` (it builds first) and `pnpm check`.
- **Add a client only after running the real product.** A new recipe in `src/recipes/` needs: detection with the client's version, a throwaway-home run, the commands recorded, and a note in the README table saying which version and system you ran it on. Do not add a recipe from documentation alone.
- **Keep the promises.** Nothing but method names, directions, kinds and integer ids may reach a log or `compat.json`. Never pass the caller's environment to a client; extend the allow-list in `src/home.ts` only for variables a client cannot start without. No telemetry, no network calls of mcp-proof's own, no installs.
- Tests use obviously fake values built at run time. Never put a real token, name, address or path in a test, fixture or issue, not even your own.
- Write a failing test first. Keep changes small and say in the pull request what you ran.

Be kind: see the [code of conduct](CODE_OF_CONDUCT.md).
