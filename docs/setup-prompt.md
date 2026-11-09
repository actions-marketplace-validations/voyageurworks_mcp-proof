# Let your AI assistant do the first run

If you use an assistant that can run commands (Claude Code, Codex, Cursor's agent, OpenClaw), paste the block below into it. It asks which server you want to prove, runs the guided `setup` command and the proof, and explains the result in plain words.

mcp-proof starts every client in a throwaway home and never installs a client or touches your real client settings. The block also tells the assistant not to put your API keys on the command line.

```
Please prove that my MCP server starts in real clients, using mcp-proof. It starts each client in a throwaway home, never installs a client and never touches my real client settings.
1. Run: npx -y @voyageurworks/mcp-proof setup --help
2. Ask me for the command that starts my MCP server (for example: npx -y my-mcp-server). If this folder has a package.json, offer its name as the default.
3. Run: npx -y @voyageurworks/mcp-proof setup --server "<that command>", then run each step it prints, one at a time. If the server is started with npx, run the warm-up step first.
4. Do not pass my API keys, tokens or other secrets on the command line. If the server needs one, tell me and wait.
5. Tell me in plain words which clients verified, which were not installed, which failed and why, and how to paste the table into my README.
```

Prefer to do it yourself? Run `npx -y @voyageurworks/mcp-proof setup` in a terminal: it asks the same questions and prints every step.
