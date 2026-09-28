# Chirag UI Maker — Antigravity skill

Install one of these ways:

- **This project only:** copy the `chirag-ui-maker/` folder to `<your-project>/.agents/skills/chirag-ui-maker/`
- **All projects (Antigravity IDE):** copy it to `~/.gemini/antigravity/skills/chirag-ui-maker/`
- **Antigravity CLI:** `~/.gemini/antigravity-cli/skills/chirag-ui-maker/`

Then ask Antigravity something like *"Use Chirag UI Maker to build a landing page and 3D game for …"*.
The agent loads `SKILL.md` automatically when a task matches its description.

Contents: `SKILL.md` (workflow), `references/playbook.md` (full recipes and pitfalls),
`scripts/responsive-audit.mjs` (overflow and clipped-text checker), `scripts/make-fake-camera.py` (fake webcam clips for testing).
