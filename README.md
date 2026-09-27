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


## Production build

For the recommended same-origin Nginx deployment, leave `VITE_API_BASE_URL` blank so browser requests use `/api/` on the same HTTPS host.

```bash
npm ci
npm audit --audit-level=high
npm run build
```

Deploy the generated `dist/` directory behind HTTPS. The backend repository contains `deploy/nginx-flexee.conf`, which serves this build and proxies `/api/` to Gunicorn on `127.0.0.1:8000`.
