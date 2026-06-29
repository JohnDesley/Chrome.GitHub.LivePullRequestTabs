const GH_COLORS = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];

const $ = (id) => document.getElementById(id);
const rowsEl = $("rows");

function makeRow(data = {}) {
  const row = document.createElement("div");
  row.className = "row";

  const repo = document.createElement("input");
  repo.type = "text";
  repo.placeholder = "owner/name";
  repo.value = data.repo || "";
  repo.className = "f-repo";

  const group = document.createElement("input");
  group.type = "text";
  group.placeholder = "My PRs";
  group.setAttribute("list", "groupNames");
  group.value = data.groupTitle || "";
  group.className = "f-group";

  const color = document.createElement("select");
  for (const c of GH_COLORS) {
    const o = document.createElement("option");
    o.value = c; o.textContent = c;
    if (c === (data.color || "grey")) o.selected = true;
    color.appendChild(o);
  }
  color.className = "f-color";

  const del = document.createElement("button");
  del.textContent = "✕";
  del.className = "iconbtn";
  del.title = "Remove";
  del.addEventListener("click", () => row.remove());

  row.append(repo, group, color, del);
  return row;
}

function readRows() {
  return [...rowsEl.querySelectorAll(".row")].map((r) => ({
    repo: r.querySelector(".f-repo").value.trim(),
    groupTitle: r.querySelector(".f-group").value.trim(),
    color: r.querySelector(".f-color").value,
  })).filter((m) => m.repo || m.groupTitle);
}

async function load() {
  const c = await chrome.storage.local.get({ token: "", intervalMinutes: 5, mappings: [], lastRun: null });
  $("token").value = c.token || "";
  $("interval").value = c.intervalMinutes || 5;
  rowsEl.innerHTML = "";
  const mappings = c.mappings.length ? c.mappings : [{ repo: "", groupTitle: "", color: "blue" }];
  for (const m of mappings) rowsEl.appendChild(makeRow(m));
  renderLastRun(c.lastRun);
  refreshGroups();
}

function renderLastRun(lastRun) {
  if (!lastRun) { $("status").textContent = "No runs yet."; return; }
  const when = new Date(lastRun.at).toLocaleString();
  const lines = (lastRun.results || []).map((r) => {
    if (r.error) return `• ${r.repo || "?"} -> ${r.title || "?"}: ERROR ${r.error}`;
    const add = r.added?.length ? ` +[${r.added.join(",")}]` : "";
    const rem = r.removed?.length ? ` -[${r.removed.join(",")}]` : "";
    const chg = add || rem ? `${add}${rem}` : " no change";
    return `• ${r.repo} -> ${r.title}: ${r.openCount} open,${chg}`;
  });
  $("status").textContent = `Last run: ${when}\n` + lines.join("\n");
}

async function refreshGroups() {
  const resp = await chrome.runtime.sendMessage({ type: "listGroups" }).catch(() => null);
  const dl = $("groupNames");
  dl.innerHTML = "";
  if (resp?.ok) {
    for (const g of resp.groups) {
      if (!g.title) continue;
      const o = document.createElement("option");
      o.value = g.title;
      dl.appendChild(o);
    }
  }
}

$("addRow").addEventListener("click", () => rowsEl.appendChild(makeRow({ color: "blue" })));
$("refreshGroups").addEventListener("click", refreshGroups);

$("validate").addEventListener("click", async () => {
  const token = $("token").value.trim();
  const el = $("tokenStatus");
  if (!token) { el.textContent = "Enter a token first."; el.className = "err"; return; }
  el.textContent = "Validating…"; el.className = "muted";
  const resp = await chrome.runtime.sendMessage({ type: "validateToken", token }).catch(() => null);
  if (resp?.ok) { el.textContent = `OK — signed in as ${resp.login}`; el.className = "ok"; }
  else { el.textContent = `Invalid token${resp?.status ? " (HTTP " + resp.status + ")" : ""}`; el.className = "err"; }
});

$("save").addEventListener("click", async () => {
  const token = $("token").value.trim();
  const intervalMinutes = Math.max(1, Number($("interval").value) || 5);
  const mappings = readRows();
  await chrome.storage.local.set({ token, intervalMinutes, mappings });
  const el = $("saveStatus");
  el.textContent = "Saved. Syncing…"; el.className = "ok";
  const resp = await chrome.runtime.sendMessage({ type: "syncNow" }).catch(() => null);
  if (resp?.ok) { renderLastRun({ at: Date.now(), results: resp.results }); el.textContent = "Saved & synced."; }
  else { el.textContent = "Saved."; }
  refreshGroups();
});

$("syncNow").addEventListener("click", async () => {
  const el = $("saveStatus");
  el.textContent = "Syncing…"; el.className = "muted";
  const resp = await chrome.runtime.sendMessage({ type: "syncNow" }).catch(() => null);
  if (resp?.ok) { renderLastRun({ at: Date.now(), results: resp.results }); el.textContent = "Synced."; el.className = "ok"; }
  else { el.textContent = "Sync failed."; el.className = "err"; }
  refreshGroups();
});

load();
