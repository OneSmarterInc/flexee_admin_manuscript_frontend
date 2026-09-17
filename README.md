# Flexee manuscript React frontend

This React/Vite frontend preserves the public editorial content from the source `flxee_manuscript` repository while using the Django API in `../backend`.

Routes:
- `/` — manuscript landing page
- `/submit-book` — full Five Zero Books submission content and simulation catalog
- `/submit-article` — full Field Notes Journal submission guidance
- `/admin` — password + TOTP review dashboard

The primary Flexee navigation/footer links continue to point to the live `flexee.org` product pages, just as the source submission pages do.

## Run

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```
