# Decisions

- **Stack:** React + TypeScript + Vite, Tailwind v4, Zod, Vitest; Vercel Functions in `/api`. Same stack as our previous project, to avoid learning new tools during the hackathon.
- **LLM provider:** Groq free tier (OpenAI-compatible) running open models. Featherless has no free API plan, so it is not used. The provider is a setting (`LLM_BASE_URL`), so switching is two env vars.
- **The LLM only labels lines.** It returns tactics + stage ids as strict JSON. The playbook engine (plain TypeScript, unit-tested) owns the risk score and the prediction.
- **Playbooks are TypeScript objects**, not JSON files, so the Vercel function can import them without JSON-module issues. They are validated with Zod at load time.
- **Relative imports use `.js` extensions** in `src/engine`, `src/server` and `api`, because Vercel runs functions as Node ES modules.
- **Keyword fallback tagger:** if the API fails, lines are tagged with keyword rules and marked `[keywords]` in the UI.
- **Model choice:** _fill in after `npm run model-test`._
