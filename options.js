const GH_COLORS = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];

const $ = (id) => document.getElementById(id);
const tokenRowsEl = $("tokenRows");
const rowsEl = $("rows");

function uid() {
  return (crypto?.randomUUID?.() || ("t" + Date.now() + Math.random().toString(36).slice(2)));
}

// ---------- token rows ----------
function makeTokenRow(data = {}) {
  const row = document.createElement("div");
  row.className = "trow";
  row.dataset.id = data.id || uid();

  const label = document.createElement("input");
  label.type = "text";
  label.placeholder = "e.g. GamebasicsBV";
  label.value = data.label || "";
  label.className = "t-label";
  label.addEventListener("input", populateMappingSelects);

  const value = document.createElement("input");
  value.type = "password";
  value.placeholder = "github_pat_… or ghp_…";
  value.autocomplete = "off";
  value.value = data.value || "";
  value.className = "t-value";

  const validate = document.createElement("button");
  validate.textContent = "Validate";
  validate.className = "small";
  validate.type = "button";

  const status = document.createElement("span");
  status.className = "tstatus muted";

  const del = document.createElement("button");
  del.textContent = "✕";
  del.className = "iconbtn";
  del.title = "Remove token";
  del.type = "button";
  del.addEventListener("click", () => { row.remove(); populateMappingSelects(); });

  validate.addEventListener("click", async () => {
    const token = value.value.trim();
    if (!token) { status.textContent = "Enter a token first."; status.className = "tstatus err"; return; }
    status.textContent = "Validating…"; status.className = "tstatus muted";
    const resp = await chrome.runtime.sendMessage({ type: "validateToken", token }).catch(() => null);
    if (resp?.ok) { status.textContent = `OK — signed in as ${resp.login}`; status.className = "tstatus ok"; }
    else { status.textContent = `Invalid${resp?.status ? " (HTTP " + resp.status + ")" : ""}`; status.className = "tstatus err"; }
  });

  row.append(label, value, validate, del, status);
  return row;
}

function readTokens() {
  return [...tokenRowsEl.querySelectorAll(".trow")].map((r) => ({
    id: r.dataset.id,
    label: r.querySelector(".t-label").value.trim() || "(unnamed)",
    value: r.querySelector(".t-value").value.trim(),
  })).filter((t) => t.value);
}

function currentTokenList() {
  // includes empty-value rows so the select reflects what's on screen
  return [...tokenRowsEl.querySelectorAll(".trow")].map((r) => ({
    id: r.dataset.id,
    label: r.querySelector(".t-label").value.trim() || "(unnamed)",
  }));
}

// ---------- mapping rows ----------
function makeMappingRow(data = {}) {
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
    if (c === (data.color || "blue")) o.selected = true;
    color.appendChild(o);
  }
  color.className = "f-color";

  const token = document.createElement("select");
  token.className = "f-token";
  token.dataset.selected = data.tokenId || "";

  const del = document.createElement("button");
  del.textContent = "✕";
  del.className = "iconbtn";
  del.title = "Remove mapping";
  del.type = "button";
  del.addEventListener("click", () => row.remove());

  row.append(repo, group, color, token, del);
  fillTokenSelect(token, data.tokenId || "");
  return row;
}

function fillTokenSelect(sel, desiredId) {
  const tokens = currentTokenList();
  const prev = desiredId || sel.value || sel.dataset.selected || "";
  sel.innerHTML = "";
  if (!tokens.length) {
    const o = document.createElement("option");
    o.value = ""; o.textContent = "(add a token above)";
    sel.appendChild(o);
    sel.value = "";
    return;
  }
  for (const t of tokens) {
    const o = document.createElement("option");
    o.value = t.id; o.textContent = t.label;
    sel.appendChild(o);
  }
  // restore previous selection, else default to the only/first token
  if (tokens.some((t) => t.id === prev)) sel.value = prev;
  else sel.value = tokens[0].id;
  sel.dataset.selected = sel.value;
}

function populateMappingSelects() {
  [...rowsEl.querySelectorAll(".f-token")].forEach((sel) => fillTokenSelect(sel));
}

function readMappings() {
  return [...rowsEl.querySelectorAll(".row")].map((r) => ({
    repo: r.querySelector(".f-repo").value.trim(),
    groupTitle: r.querySelector(".f-group").value.trim(),
    color: r.querySelector(".f-color").value,
    tokenId: r.querySelector(".f-token").value,
  })).filter((m) => m.repo || m.groupTitle);
}

// ---------- load / save ----------
async function load() {
  const c = await chrome.storage.local.get({ token: "", tokens: [], intervalMinutes: 5, mappings: [], lastRun: null });

  // tokens (migrate legacy single token)
  let tokens = Array.isArray(c.tokens) ? c.tokens : [];
  if (!tokens.length && c.token) tokens = [{ id: "legacy", label: "Default", value: c.token }];
  tokenRowsEl.innerHTML = "";
  if (!tokens.length) tokens = [{ id: uid(), label: "", value: "" }];
  for (const t of tokens) tokenRowsEl.appendChild(makeTokenRow(t));

  // mappings
  rowsEl.innerHTML = "";
  const mappings = c.mappings.length ? c.mappings : [{ repo: "", groupTitle: "", color: "blue", tokenId: "" }];
  for (const m of mappings) rowsEl.appendChild(makeMappingRow(m));

  $("interval").value = c.intervalMinutes || 5;
  populateMappingSelects();
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

$("addToken").addEventListener("click", () => { tokenRowsEl.appendChild(makeTokenRow({ id: uid() })); populateMappingSelects(); });
$("addRow").addEventListener("click", () => rowsEl.appendChild(makeMappingRow({ color: "blue" })));
$("refreshGroups").addEventListener("click", refreshGroups);

$("save").addEventListener("click", async () => {
  const tokens = readTokens();
  const intervalMinutes = Math.max(1, Number($("interval").value) || 5);
  const mappings = readMappings();
  // clear legacy single-token key so it can't shadow the new list
  await chrome.storage.local.set({ tokens, intervalMinutes, mappings, token: "" });
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
