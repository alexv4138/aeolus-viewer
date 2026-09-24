# Visual experiments (isolated beta snapshot)

This folder copies the beta React frontend, its components and CSS. It runs as a **static Vite app** with a frozen, local telemetry snapshot; no auth, database, live endpoint or backend is needed. Mock users use `example.invalid`; notes stay in browser local storage. This does not modify or deploy `/` or `/beta`.

```powershell
cd C:\Users\alexv\Desktop\GPT-Projects\turbina\experiments
npm install
npm run dev
```

Open the local URL Vite prints. For a static distributable, run `npm run build`; output is `dist/`. Use `npm run preview` to view that build.

Edit `app/optimized/page.tsx`, `app/optimized/optimized.module.css`, `components/dashboard-opt/`, or `globals.css`. The original copies outside this folder are independent. `main.tsx` substitutes the API calls; `public/telemetry.json` is fixed test data. Refreshing does not generate new samples.

This is a visual sandbox, not a production backend or auth test. The copied version switcher is display-only.
