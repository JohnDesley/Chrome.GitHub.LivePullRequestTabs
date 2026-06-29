// GitHub PR Tab Group Sync - background service worker
// Pure deterministic poll-and-reconcile. No external services.

const ALARM_NAME = "gh-pr-sync";
const GH_COLORS = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];

// ---------- storage helpers ----------
// Config shape:
// {
//   tokens: [{ id, label, value }],   // one or more PATs (fine-grained tokens are scoped per owner/org)
//   intervalMinutes: number,
//   mappings: [{ repo, groupTitle, color, tokenId }]
// }
async function getConfig() {
  const c = await chrome.storage.local.get(["token", "tokens", "intervalMinutes", "mappings"]);
  let tokens = Array.isArray(c.tokens) ? c.tokens.filter((t) => t && t.value) : [];
  // Migrate legacy single-token config.
  if (!tokens.length && c.token) {
    tokens = [{ id: "legacy", label: "Default", value: c.token }];
  }
  return {
    tokens,
    intervalMinutes: Math.max(1, Number(c.intervalMinutes) || 5),
    mappings: Array.isArray(c.mappings) ? c.mappings : [],
  };
}

async function setLastRun(results) {
  await chrome.storage.local.set({ lastRun: { at: Date.now(), results } });
}

// ---------- GitHub API ----------
async function fetchOpenPRNumbers(repo, token) {
  const numbers = new Set();
  for (let page = 1; page <= 10; page++) {
    let res;
    try {
      res = await fetch(
        `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
    } catch (e) {
      return { error: "network_error" };
    }
    if (res.status === 401) return { error: "bad_token" };
    if (res.status === 403) return { error: "forbidden_or_rate_limited" };
    if (res.status === 404) return { error: "repo_not_found_or_no_access" };
    if (!res.ok) return { error: "http_" + res.status };
    let arr;
    try { arr = await res.json(); } catch (e) { return { error: "parse_error" }; }
    if (!Array.isArray(arr)) return { error: "unexpected_response" };
    for (const pr of arr) numbers.add(Number(pr.number));
    if (arr.length < 100) break;
  }
  return { numbers };
}

// ---------- tab/group helpers ----------
function prNumberFromUrl(url, repo) {
  if (!url) return null;
  const esc = repo.replace(/[.]/g, "\\.");
  const m = url.match(new RegExp(`github\\.com/${esc}/pull/(\\d+)`));
  return m ? Number(m[1]) : null;
}

async function groupStartIndex(groupId) {
  const tabs = await chrome.tabs.query({ groupId });
  if (!tabs.length) return undefined;
  return Math.min(...tabs.map((t) => t.index));
}

async function syncOne(mapping, token) {
  const repo = (mapping.repo || "").trim();
  const title = (mapping.groupTitle || "").trim();
  const color = GH_COLORS.includes(mapping.color) ? mapping.color : "grey";
  if (!repo || !title) return { repo, title, error: "incomplete_mapping" };
  if (!token) return { repo, title, error: "no_token_selected" };

  const open = await fetchOpenPRNumbers(repo, token);
  if (open.error) return { repo, title, error: open.error };
  const openSet = open.numbers;

  // Locate the group (first match across windows).
  let groups = await chrome.tabGroups.query({ title });
  let group = groups[0] || null;
  let tabsInGroup = group ? await chrome.tabs.query({ groupId: group.id }) : [];

  const existing = new Map(); // prNumber -> tab
  for (const t of tabsInGroup) {
    const n = prNumberFromUrl(t.url, repo);
    if (n != null) existing.set(n, t);
  }

  // ----- ADD missing PRs, ascending so the highest (newest) ends on top (prepend) -----
  const toAdd = [...openSet].filter((n) => !existing.has(n)).sort((a, b) => a - b);
  const added = [];
  for (const n of toAdd) {
    const url = `https://github.com/${repo}/pull/${n}`;
    try {
      if (!group) {
        const tab = await chrome.tabs.create({ url, active: false });
        const gid = await chrome.tabs.group({ tabIds: [tab.id] });
        await chrome.tabGroups.update(gid, { title, color });
        group = await chrome.tabGroups.get(gid);
      } else {
        const start = await groupStartIndex(group.id);
        const tab = await chrome.tabs.create({
          url,
          active: false,
          windowId: group.windowId,
          index: start,
        });
        await chrome.tabs.group({ tabIds: [tab.id], groupId: group.id });
        const newStart = await groupStartIndex(group.id);
        if (newStart != null) await chrome.tabs.move(tab.id, { index: newStart });
      }
      added.push(n);
    } catch (e) {
      // Idempotent: retried next cycle.
    }
  }

  // ----- REMOVE PRs no longer open (API response is authoritative) -----
  const removed = [];
  const toRemove = [];
  for (const [n, t] of existing) {
    if (!openSet.has(n)) {
      toRemove.push(t.id);
      removed.push(n);
    }
  }
  if (toRemove.length) {
    try { await chrome.tabs.remove(toRemove); } catch (e) {}
  }

  return { repo, title, openCount: openSet.size, added, removed };
}

async function syncAll(reason = "alarm") {
  const cfg = await getConfig();
  if (!cfg.tokens.length || !cfg.mappings.length) {
    await setLastRun([{ error: "not_configured" }]);
    return;
  }
  const byId = new Map(cfg.tokens.map((t) => [t.id, t.value]));
  const onlyToken = cfg.tokens.length === 1 ? cfg.tokens[0].value : null;
  const results = [];
  for (const m of cfg.mappings) {
    // Resolve the token for this mapping; fall back to the sole token if unset.
    const token = byId.get(m.tokenId) ?? onlyToken ?? null;
    results.push(await syncOne(m, token));
  }
  await setLastRun(results);
  return results;
}

// ---------- scheduling ----------
async function rescheduleAlarm() {
  const cfg = await getConfig();
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: cfg.intervalMinutes,
    delayInMinutes: 0.1,
  });
}

chrome.runtime.onInstalled.addListener(() => { rescheduleAlarm(); });
chrome.runtime.onStartup.addListener(() => { rescheduleAlarm(); });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) syncAll("alarm");
});

// Clicking the toolbar icon opens the full-width options page (no cramped popup).
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.intervalMinutes) rescheduleAlarm();
  if (changes.mappings || changes.tokens || changes.token) syncAll("config_change");
});

// Messages from the options/popup page.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "syncNow") {
      const results = await syncAll("manual");
      sendResponse({ ok: true, results });
    } else if (msg?.type === "validateToken") {
      try {
        const res = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${msg.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });
        if (!res.ok) { sendResponse({ ok: false, status: res.status }); return; }
        const u = await res.json();
        sendResponse({ ok: true, login: u.login });
      } catch (e) {
        sendResponse({ ok: false, error: "network_error" });
      }
    } else if (msg?.type === "listGroups") {
      const groups = await chrome.tabGroups.query({});
      sendResponse({ ok: true, groups: groups.map((g) => ({ id: g.id, title: g.title, color: g.color })) });
    } else {
      sendResponse({ ok: false, error: "unknown_message" });
    }
  })();
  return true; // async
});
