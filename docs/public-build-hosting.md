# Public Build Hosting

GT Anywhere ships as a static browser build. The public release package is the `dist/` directory produced by Vite, and it can be hosted on any static file host that can serve a chosen base path consistently.

## Public Build Package

- Root-path build: `npm run build`
- Nested-path build: `npm run build -- --base=/your/public/path/`
- Browser validation: `npm run test:browser`

`dist/` contains three release surfaces:

- `index.html`: the bootstrap document for the session shell
- `assets/`: hashed JavaScript, CSS, and WASM emitted by Vite
- `data/`: runtime-fetched JSON for location presets and vehicle tuning

## Host Contract

- Serve the exact `dist/` contents without rewriting file names.
- If the build uses a nested base path, host the app at that same prefix. Example: `vite build --base=/gt-anywhere/` must be served from `/gt-anywhere/`, not `/`.
- Do not move runtime logic into a backend just to host the build. GT Anywhere remains client-heavy and static-host friendly.
- Preserve standard content types, especially `application/wasm` for the Havok WASM payload and `application/json` for runtime data.

## Caching

- `index.html` should be revalidated on every navigation or kept on a very short TTL.
- Vite-hashed files under `assets/` can be cached aggressively with `Cache-Control: public, max-age=31536000, immutable`.
- Runtime JSON under `data/` is intentionally fetched at runtime and is not content-hashed today. Serve it with revalidation-friendly caching such as `Cache-Control: no-cache` or `Cache-Control: max-age=0, must-revalidate`.
- Do not mark `index.html` immutable. Public-build stale chunk recovery assumes the browser can pick up fresh HTML after a deploy.

## Compression

- Enable Brotli or gzip for `.js`, `.css`, `.json`, and `.wasm` when the host supports it.
- Compression is strongly recommended for the Babylon runtime chunks and Havok WASM payload.

## Release Metadata

- Public builds expose release metadata through shell/render-host/canvas datasets.
- The build identifier is derived from `package.json` version plus git commit metadata at build time.
- Testers can verify the active build from the shell copy (`Build ...`) or from `data-release-id`, `data-app-version`, and related dataset fields.

## Deploy-Safe Recovery

- GT Anywhere handles stale lazy-chunk failures as a recoverable public-build error and presents a reload action instead of a blank page.
- This recovery path is only reliable if `index.html` can refresh to the latest deployment.

## Local Validation

- Root-path validation is covered by the built smoke suite.
- Nested-path validation is covered by `npm run test:browser`, which also builds with `/public-build/` and serves the app from that subpath shape.

## Recommended Headers Summary

- `index.html`: `Cache-Control: no-cache`
- `assets/*` hashed files: `Cache-Control: public, max-age=31536000, immutable`
- `data/*.json`: `Cache-Control: max-age=0, must-revalidate`
- `.wasm`: `Content-Type: application/wasm`

## Non-Goals

- No required backend runtime
- No required analytics vendor
- No required hosting provider
- No service-worker or offline-first release contract for v1
