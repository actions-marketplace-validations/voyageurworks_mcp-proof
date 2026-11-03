# Changelog

## 0.1.0 (not yet released)
First release. While the version is 0.x, the command line may still change in a minor release; `compat.json` schema 1 is meant to stay stable.

- `mcp-proof run` starts each client in a fresh throwaway home, has it run your server through a method-name-only wrapper, and labels the result `verified`, `started`, `failed` or `not-installed`.
- Clients: Claude Code (driven with `claude mcp add` and `claude mcp list`; checked on version 2.1.317 by hand on Windows 11 and in CI on Ubuntu, macOS and Windows) and a built-in stand-in client.
- Outputs: a terminal summary, `compat.json` (schema 1), a README-ready Markdown table and static SVG badges with Shields endpoint JSON.
- `mcp-proof table`, `badge` and `validate` work from a saved `compat.json`.
- A reusable GitHub Action (`action.yml`), run for real in CI from a packed tarball on Linux, macOS and Windows.
- A timeout or Ctrl-C stops the server and the client and removes the run's throwaway folders (Linux and macOS tested in CI).
- On Windows, server and client command lines run through `cmd.exe` are quoted word by word and passed verbatim, so an argument containing `&`, `|`, `<`, `>`, `^`, `(`, `)` or a space reaches the program intact and cannot start a second command. `table` shows text from a `compat.json` as plain text (no raw HTML, no forged rows).
- Environment allow-list for clients, credential-looking arguments redacted in the record, no runtime dependencies, no network calls of its own.
