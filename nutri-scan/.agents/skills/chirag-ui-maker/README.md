# Chirag UI Maker — Antigravity skill

Install one of these ways:

- **This project only:** copy the `chirag-ui-maker/` folder to `<your-project>/.agents/skills/chirag-ui-maker/`
- **All projects (Antigravity IDE):** copy it to `~/.gemini/antigravity/skills/chirag-ui-maker/`
- **Antigravity CLI:** `~/.gemini/antigravity-cli/skills/chirag-ui-maker/`

Then ask Antigravity something like *"Use Chirag UI Maker to build a landing page and 3D game for …"*.
The agent loads `SKILL.md` automatically when a task matches its description.

Contents:
- `SKILL.md`: the workflow and how to pick a house style.
- `references/playbook.md`: Style A recipes and pitfalls.
- `references/scan-app-patterns.md`: Style B (Nutri Scan) palette, Fluent Emoji 3D, and every signature element.
- `assets/Emoji3D.tsx`: a 3D emoji component with system-emoji fallback.
- `scripts/get-fluent-3d.sh`: fetches only the 3D emoji you use (MIT, Microsoft).
- `scripts/responsive-audit.mjs`: overflow and clipped-text checker.
- `scripts/make-fake-camera.py`: fake webcam clips for testing.
