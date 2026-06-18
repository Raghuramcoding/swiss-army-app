# Workbench

A toolbox of utilities and AI-powered tools for code and everyday tasks.
Works two ways:

1. **Free, bring your own key** — fully static, no account, no backend.
   Settings lets you connect Anthropic, OpenRouter, or a local Ollama server.
2. **Pro** — sign in, subscribe, and AI tools run through a hosted backend
   with no personal API key needed. Requires deploying `workbench-backend`
   separately (see that project's README) — the frontend works fine without
   it, Pro upgrade just won't be available.

## Local development

```
npm install
cp .env.example .env   # optional — only needed if testing the Pro/backend flow
npm run dev
```

## Deploying as a static site

```
npm run build
```

This produces a `dist/` folder you can drag onto Netlify, deploy via Vercel,
or push to GitHub Pages. No server-side rendering, no Node runtime needed —
it's a plain static site.

- **Vercel**: import the repo, framework preset "Vite", no other config needed.
- **Netlify**: build command `npm run build`, publish directory `dist`.
- **GitHub Pages**: build locally, then push the contents of `dist/` to a
  `gh-pages` branch (or use an action like `peaceiris/actions-gh-pages`).

If you set `VITE_API_URL` and `VITE_STRIPE_PUBLISHABLE_KEY` as environment
variables in your hosting provider's dashboard before building, the Pro
upgrade flow will work. If you don't, the app still works fully in
bring-your-own-key mode — the "Upgrade to Pro" button just won't have
anywhere to send people, so consider hiding it (see `App.jsx`,
`AccountMenu`) until your backend is live.

## What you still need to do yourself

This is real code, not a hosted product — a few things only you can do:

- Register and deploy `workbench-backend` (Railway) if you want the Pro tier.
- Create a Stripe account, product, and prices (see backend README).
- Buy/point a domain if you want something nicer than the free subdomain.
- Decide on and test actual pricing — $9/mo and 500 calls/month in the
  `.env` files are placeholders, not a recommendation.
