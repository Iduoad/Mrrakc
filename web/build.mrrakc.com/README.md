# build.mrrakc.com

The public contribution form at <https://build.mrrakc.com>. Visitors pick a
point on the map, describe the place, and submit it to `api.mrrakc.com` for
review.

It is a fully static single-page app: no server of its own, no filesystem
access, no privileged routes. Everything it needs at runtime is the Google Maps
API and the submission endpoint.

## Running it

```sh
bun install
cp .env.example .env.local   # Google Maps key + Turnstile site key
bun run dev
bun run build                # → dist/, deployed to Cloudflare Pages
```

`predev`/`prebuild` copy `scripts/mappings/provinces.geojson` into `public/`,
which the app uses to resolve a clicked point to a province.

## Maintainer tools live elsewhere

This app used to also host dev-only editors that read and wrote the repo's
`data/` directory through a Vite middleware (`?editor`, `?editor=plans`,
`?editor=events`). Those were removed so the deployed app stays static.

Their replacement is **`web/build.localhost`**, a local-only directory of tools
over the same dataset. The places editor has been migrated there as *Places
Updater*; the plans and events editors have not been ported yet and can be
recovered from git history (last present in `c8f8041`).
