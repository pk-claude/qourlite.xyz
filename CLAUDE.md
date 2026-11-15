# qourlite.xyz: rules for every session

This repo IS the live site. Vercel deploys `main` to qourlite.xyz on every merge, and the site is exactly
what is in the repo: a page that is not committed here does not exist after the next merge.

In October 2026 most of the site went offline because its pages lived only on Vercel deployments and a git
deploy replaced them. Do not repeat that.

## How to publish
- Add or change files on a branch, open a pull request, merge it. Start from a fresh `origin/main`; other
  sessions merge here often.
- Never deploy to the Vercel project directly (CLI, REST API, drag-and-drop). A direct deploy that holds only
  your files takes every other page offline, and your page disappears again on the next merge.
- Never force-push `main` or rewrite its history.

## Do not remove what is already here
- Each top-level folder is a separate page or game owned by some earlier piece of work (`vault/`, `reports/`,
  `think/`, `live/`, `solo/`, `hub/`, `kaiju/`, `monopoly/`, `replyall/`, `snoozebutt/`, `pollposition/`, `wfo/`,
  `q2/`, `go/`, `join/`, `docs/`, `api/`, `home/`). Do not delete, move or rename a folder you were not asked
  to change, even if it looks old or unused.
- "Redo the homepage" means edit `index.html`. It does not mean clear out the repo.
- `vercel.json` holds the short links (`/cat`, `/egg`, `/spill`, ...) and the function settings. Add to it;
  do not replace it.
- If a task really needs a page removed, ask the owner first and say which URLs will stop working.

## Adding a new page
- Put it in its own top-level folder with an `index.html`.
- Add a card for it to `index.html` (copy an existing `<a class="card">` block; the image goes in `home/` as an
  800x500 `.webp`).
- This repo is public. Do not commit secrets, API keys or personal data; keys belong in Vercel environment
  variables.

## Before merging
- Check the Vercel preview on the pull request, and check that the pages you did not touch still load there.
