# GitHub PR Tab Group Sync (Chrome MV3 extension)

A tiny, token-free Chrome/Aside extension that keeps a **tab group per GitHub repo**
mirroring that repo's **open pull requests** — one tab per PR.

- New PRs are **added to the top** of the group (newest first).
- Closed/merged PRs are **removed**.
- If the target tab group doesn't exist, it is **created automatically** from the first PR.
- Polling runs natively via `chrome.alarms` — no agent, no LLM, no tokens spent per run.

## How it works
1. On a timer (default every 5 min) it calls the GitHub REST API:
   `GET /repos/{owner}/{repo}/pulls?state=open` (paginated, authoritative).
2. It compares the open-PR set to the tabs currently in the mapped group.
3. It adds tabs for new PRs (prepended) and removes tabs for PRs that closed/merged.
   Because the API list is authoritative, there are no false wipes; a failed/rate-limited
   call simply skips that cycle and the next run self-heals.

## Getting the code
This lives in the private repo **`JohnDesley/Chrome.GitHub.LivePullRequestTabs`**. Two ways to get it onto your machine:

- **Download ZIP:** on the repo page click the green **Code** button → **Download ZIP**, then unzip it somewhere permanent (don't load from a temp/Downloads folder you'll clean out — the extension must keep pointing at this folder).
- **Clone:** `git clone https://github.com/JohnDesley/Chrome.GitHub.LivePullRequestTabs.git`

## Install (Developer Mode, load unpacked)
Chrome only allows loading an unpacked extension folder when Developer Mode is on. Step by step:

1. Open Chrome and go to **`chrome://extensions`** (or menu **⋮ → Extensions → Manage Extensions**).
2. In the **top-right corner**, turn on the **Developer mode** toggle. Three new buttons appear: *Load unpacked*, *Pack extension*, *Update*.
3. Click **Load unpacked**.
4. In the file picker, select the **folder** that contains `manifest.json` (the unzipped/cloned `Chrome.GitHub.LivePullRequestTabs` folder) and click **Select / Open**.
5. The extension card **“GitHub PR Tab Group Sync”** now appears in the list. Make sure its toggle is **on** (blue).
6. (Optional) Click the **puzzle-piece icon** in the Chrome toolbar and **pin** the extension so you can open its config with one click.
7. Open the config screen: click the pinned icon, **or** on the extension card click **Details → Extension options**.
8. Enter your **personal access token**, click **Validate token**, add your repo→group **mappings**, set the interval, and click **Save**.

### Updating after code changes
If you pull new code (or edit files), go back to `chrome://extensions` and click the **refresh/↻ icon** on the extension card (or the **Update** button) so Chrome reloads it.

### Notes for Developer Mode
- Keep the extension folder in a stable location; if you move or delete it, Chrome disables the extension.
- Chrome may show a “Disable developer mode extensions” warning on startup — that's expected for unpacked extensions; you can dismiss it.
- No Web Store account or publishing is required.

## Configure
- **Personal access token**: create at https://github.com/settings/tokens
  - Fine-grained: grant **Pull requests: Read-only** (and **Contents: Read** for private repos),
    scoped to the repos you want.
  - Classic: `repo` scope covers private repos.
  - Click **Validate token** to confirm it works.
- **Mappings**: one row per repo.
  - **Repo**: `owner/name` exactly as in the GitHub URL.
  - **Tab group name**: pick an existing group from the dropdown or type a new name (created if missing).
  - **Color**: any Chrome tab-group color.
- **Schedule**: minutes between checks (min 1; 5 recommended).
- Click **Save** (saves + syncs immediately) or **Sync now** to run on demand.

The token is stored only in this browser via `chrome.storage.local`. Nothing is sent anywhere
except `api.github.com`.

## Notes / limits
- Handles up to ~1000 open PRs per repo (10 pages × 100). Raise the page cap in `background.js` if needed.
- If a repo has **0 open PRs**, its group becomes empty and Chrome removes the group; it is recreated
  when a PR opens again.
- Tabs are real browser tabs, so opening 50 PRs creates 50 tabs. Keep mappings to repos you actively review.

## Files
- `manifest.json` — MV3 manifest (permissions: tabs, tabGroups, storage, alarms; host: api.github.com).
- `background.js` — service worker: scheduling + fetch + reconcile.
- `options.html` / `options.js` — configuration screen.
