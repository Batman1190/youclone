# YouClone

YouClone is a lightweight, front-end YouTube-style SPA (Single Page App) with a searchable feed and a watch page. It uses the YouTube Data API v3 when API keys are available and automatically falls back to an Invidious instance when not.

## Features
- Home feed (Most Popular) and Search results
- Watch view with embedded player
- Sidebar with collapse/persist
- Rotating YouTube API keys with automatic failover
- Invidious fallback for anonymous usage

## Project Structure
- `index.html` – App shell and routed view containers
- `style.css` – Responsive layout and components
- `script.js` – SPA router, fetching, rendering, key rotation

## Running Locally
Static files can be served by any web server. From the project root:

- Node (npx):
```bash
npx serve .
```
- Python 3:
```bash
python -m http.server 8080
```
Then open `http://localhost:8080`.

Tip: Opening `index.html` directly with `file://` can break network requests in some browsers. Prefer a local server as above.

## API Keys and Rotation
The app includes a rotating list of YouTube Data API keys and will automatically try the next key when quota/limit errors occur. The last successful key index is persisted in `localStorage` to avoid always starting from the first key.

Override the first-try key (optional):
```js
localStorage.setItem('YOUCLONE_YT_API_KEY', 'YOUR_PREFERRED_KEY');
location.reload();
```

Change Invidious instance (optional):
```js
localStorage.setItem('YOUCLONE_INVIDIOUS', 'https://yewtu.be');
location.reload();
```

## Deploying to GitHub Pages
1. Create a public repo on GitHub (e.g., `youclone`).
2. Commit and push the files: `index.html`, `style.css`, `script.js`, `README.md`.
3. In the GitHub repo: Settings → Pages → Build and deployment → Source: `Deploy from a branch`.
4. Select branch `main` (or `master`) and folder `/ (root)`, then Save.
5. Wait for the page to build; your site will be available at the Pages URL.

Updates are deployed automatically on each push to the selected branch.

## Branding
The app name is “YouClone” and uses your existing play button logo. If you want theme colors or typography tweaked, adjust the relevant rules in `style.css`.

## Notes
- This is a client-only app; keep API keys usage within acceptable quotas and terms.
- If the YouTube API is unavailable or all keys are exhausted, Invidious is used as a transparent fallback for feed/search.

## License
MIT


