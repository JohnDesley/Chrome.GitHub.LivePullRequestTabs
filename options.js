"use strict";

const COLORS = ["grey", "blue", "red", "yellow", "green", "pink", "cyan", "orange"];
const $ = (id) => document.getElementById(id);
const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.runtime;

// Octicons (viewBox 0 0 16 16)
const P = {
  pullRequest: "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z",
  repo: "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25v3.25a.25.25 0 0 0 .4.2l1.45-1.087a.25.25 0 0 1 .3 0L8.6 15.7a.25.25 0 0 0 .4-.2v-3.25a.25.25 0 0 0-.25-.25h-3.5a.25.25 0 0 0-.25.25Z",
  key: "M10.5 0a5.499 5.499 0 1 1-1.288 10.848l-.932.932a.749.749 0 0 1-.53.22H7v.75a.749.749 0 0 1-.22.53l-.5.5a.749.749 0 0 1-.53.22H5v.75a.749.749 0 0 1-.22.53l-.5.5a.749.749 0 0 1-.53.22h-2A1.75 1.75 0 0 1 0 14.25v-2c0-.199.079-.389.22-.53l4.932-4.932A5.5 5.5 0 0 1 10.5 0Zm0 1.5a3.999 3.999 0 0 0-3.834 5.166.75.75 0 0 1-.198.744L1.5 12.378v1.872c0 .138.112.25.25.25h1.872l.5-.5V12.75a.75.75 0 0 1 .75-.75h1.25v-1.25a.75.75 0 0 1 .75-.75h1.378l.744-.744a.75.75 0 0 1 .744-.198A4 4 0 1 0 10.5 1.5Zm1 2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
  sync: "M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .655-.835ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z",
  plus: "M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z",
  trash: "M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.748 1.748 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z",
  eye: "M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.824.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z",
  checkFill: "M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72-4.5 4.5a.75.75 0 0 1-1.06 0l-2-2a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018l1.47 1.47 3.97-3.97a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z",
  xFill: "M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z",
};
const svg = (path, w = 16) => `<svg viewBox="0 0 16 16" width="${w}" height="${w}" fill="currentColor" aria-hidden="true"><path d="${path}"></path></svg>`;

function uid() { return (crypto?.randomUUID?.() || ("t" + Date.now() + Math.random().toString(36).slice(2))); }
async function sendMsg(payload) { if (!hasChrome) return null; return chrome.runtime.sendMessage(payload).catch(() => null); }

function toast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="tdot"></span><span></span>`;
  t.querySelector("span:last-child").textContent = msg;
  $("toasts").appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 300); }, 2600);
}

/* ---------------- tokens ---------------- */
function makeTokenCard(data = {}) {
  const card = document.createElement("div");
  card.className = "token";
  card.dataset.id = data.id || uid();

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = svg(P.key);

  const fields = document.createElement("div");
  fields.className = "fields";

  const label = document.createElement("input");
  label.className = "input t-label";
  label.placeholder = "Label (e.g. GamebasicsBV)";
  label.value = data.label || "";

  const secret = document.createElement("div");
  secret.className = "secret";
  const value = document.createElement("input");
  value.className = "input t-value";
  value.type = "password";
  value.placeholder = "github_pat_… / ghp_…";
  value.autocomplete = "off";
  value.value = data.value || "";
  const eye = document.createElement("button");
  eye.type = "button"; eye.className = "icon-btn eye"; eye.title = "Show / hide"; eye.innerHTML = svg(P.eye);
  eye.addEventListener("click", () => { value.type = value.type === "password" ? "text" : "password"; });
  secret.append(value, eye);
  fields.append(label, secret);

  const validate = document.createElement("button");
  validate.type = "button"; validate.className = "btn btn-sm t-validate"; validate.textContent = "Validate";

  const del = document.createElement("button");
  del.type = "button"; del.className = "icon-btn danger t-del"; del.title = "Remove token"; del.innerHTML = svg(P.trash);
  del.addEventListener("click", () => { card.remove(); updateCounts(); populateMappingSelects(); });

  const status = document.createElement("span");
  status.className = "pill t-status hidden";

  validate.addEventListener("click", async () => {
    const token = value.value.trim();
    if (!token) { setPill(status, "warn", "Enter a token"); return; }
    setPill(status, null, "Validating…");
    const resp = await sendMsg({ type: "validateToken", token });
    if (resp?.ok) setPill(status, "ok", `@${resp.login}`);
    else setPill(status, "err", resp?.status ? `Invalid (HTTP ${resp.status})` : "Invalid token");
  });

  const actions = document.createElement("div");
  actions.className = "token-actions";
  actions.append(validate, del);

  const main = document.createElement("div");
  main.className = "token-main";
  main.append(avatar, fields, actions);
  card.append(main, status);
  return card;
}
function setPill(el, type, text) {
  el.className = "pill t-status" + (type ? " " + type : "");
  const icon = type === "ok" ? svg(P.checkFill, 14) : type === "err" ? svg(P.xFill, 14) : "";
  el.innerHTML = icon;
  el.appendChild(document.createTextNode(text));
  el.classList.remove("hidden");
}
function readTokens() {
  return [...$("tokenList").querySelectorAll(".token")].map((c) => ({
    id: c.dataset.id,
    label: c.querySelector(".t-label").value.trim() || "(unnamed)",
    value: c.querySelector(".t-value").value.trim(),
  })).filter((t) => t.value);
}
function currentTokenList() {
  return [...$("tokenList").querySelectorAll(".token")].map((c) => ({
    id: c.dataset.id,
    label: c.querySelector(".t-label").value.trim() || "(unnamed)",
  }));
}

/* ---------------- mappings ---------------- */
function makeMappingCard(data = {}) {
  const card = document.createElement("div");
  card.className = "mapping";

  const fRepo = document.createElement("div");
  fRepo.className = "repo-field";
  fRepo.innerHTML = `<span class="field-label">Repository</span><div class="input-icon">${svg(P.repo)}<input class="input f-repo" placeholder="owner/name"></div>`;
  fRepo.querySelector(".f-repo").value = data.repo || "";

  const fGroup = document.createElement("div");
  fGroup.innerHTML = `<span class="field-label">Tab group</span><input class="input f-group" list="groupNames" placeholder="Group name">`;
  fGroup.querySelector(".f-group").value = data.groupTitle || "";

  const fColor = document.createElement("div");
  fColor.innerHTML = `<span class="field-label">Color</span>`;
  const swatches = document.createElement("div");
  swatches.className = "swatches";
  const chosen = COLORS.includes(data.color) ? data.color : "blue";
  swatches.dataset.color = chosen;
  for (const c of COLORS) {
    const b = document.createElement("button");
    b.type = "button"; b.className = `swatch c-${c}`; b.title = c;
    b.setAttribute("aria-pressed", String(c === chosen));
    b.addEventListener("click", () => {
      swatches.dataset.color = c;
      [...swatches.children].forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });
    swatches.appendChild(b);
  }
  fColor.appendChild(swatches);

  const fToken = document.createElement("div");
  fToken.innerHTML = `<span class="field-label">Token</span>`;
  const sel = document.createElement("select");
  sel.className = "select f-token";
  sel.dataset.selected = data.tokenId || "";
  fToken.appendChild(sel);

  const del = document.createElement("button");
  del.type = "button"; del.className = "icon-btn danger f-del"; del.title = "Remove repository"; del.innerHTML = svg(P.trash);
  del.addEventListener("click", () => { card.remove(); updateCounts(); });

  const top = document.createElement("div");
  top.className = "map-top";
  top.append(fRepo, del);

  const rest = document.createElement("div");
  rest.className = "map-rest";
  rest.append(fGroup, fColor, fToken);

  card.append(top, rest);
  fillTokenSelect(sel, data.tokenId || "");
  return card;
}
function fillTokenSelect(sel, desiredId) {
  const tokens = currentTokenList();
  const prev = desiredId || sel.value || sel.dataset.selected || "";
  sel.innerHTML = "";
  if (!tokens.length) {
    const o = document.createElement("option");
    o.value = ""; o.textContent = "— add a token —";
    sel.appendChild(o); sel.value = ""; return;
  }
  for (const t of tokens) {
    const o = document.createElement("option");
    o.value = t.id; o.textContent = t.label;
    sel.appendChild(o);
  }
  sel.value = tokens.some((t) => t.id === prev) ? prev : tokens[0].id;
  sel.dataset.selected = sel.value;
}
function populateMappingSelects() { [...$("mapList").querySelectorAll(".f-token")].forEach((s) => fillTokenSelect(s)); }
function readMappings() {
  return [...$("mapList").querySelectorAll(".mapping")].map((c) => ({
    repo: c.querySelector(".f-repo").value.trim(),
    groupTitle: c.querySelector(".f-group").value.trim(),
    color: c.querySelector(".swatches").dataset.color,
    tokenId: c.querySelector(".f-token").value,
  })).filter((m) => m.repo || m.groupTitle);
}

function updateCounts() {
  $("tokenCount").textContent = String($("tokenList").querySelectorAll(".token").length);
  $("mapCount").textContent = String($("mapList").querySelectorAll(".mapping").length);
}

/* ---------------- schedule ---------------- */
function setInterval_(min) {
  const v = Math.max(1, Math.round(Number(min) || 5));
  $("interval").value = v;
  [...$("chips").children].forEach((ch) => ch.setAttribute("aria-pressed", String(Number(ch.dataset.min) === v)));
  updateSchedStatus();
}
function updateSchedStatus(lastRun) {
  const v = Math.max(1, Number($("interval").value) || 5);
  let txt = `Checks every ${v} min`;
  if (lastRun?.at) txt += ` · last sync ${relTime(lastRun.at)}`;
  $("schedStatusText").textContent = txt;
}
function relTime(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

/* ---------------- activity ---------------- */
function renderLastRun(lastRun) {
  const log = $("log");
  if (!lastRun || !Array.isArray(lastRun.results)) { log.innerHTML = `<div class="log-empty">Save or run a sync to see results here.</div>`; return; }
  $("lastRunWhen").textContent = `Last run ${relTime(lastRun.at)} · ${new Date(lastRun.at).toLocaleString()}`;
  log.innerHTML = "";
  for (const r of lastRun.results) {
    const isErr = !!r.error;
    const row = document.createElement("div");
    row.className = "log-row";
    const badges = [];
    if (isErr) badges.push(`<span class="tag rem">${r.error}</span>`);
    else {
      badges.push(`<span class="tag open">${r.openCount} open</span>`);
      if (r.added?.length) badges.push(`<span class="tag add">+${r.added.length}</span>`);
      if (r.removed?.length) badges.push(`<span class="tag rem">&minus;${r.removed.length}</span>`);
    }
    row.innerHTML = `
      <span class="log-ic ${isErr ? "err" : "ok"}">${svg(isErr ? P.xFill : P.checkFill)}</span>
      <div class="log-main"><div class="log-title"></div><div class="log-sub"></div></div>
      <div class="log-badges">${badges.join("")}</div>`;
    row.querySelector(".log-title").textContent = r.repo || "(unconfigured)";
    row.querySelector(".log-sub").textContent = r.title ? `→ ${r.title}` : "";
    log.appendChild(row);
  }
}

async function refreshGroups() {
  const resp = await sendMsg({ type: "listGroups" });
  const dl = $("groupNames");
  dl.innerHTML = "";
  if (resp?.ok) for (const g of resp.groups) { if (!g.title) continue; const o = document.createElement("option"); o.value = g.title; dl.appendChild(o); }
}

/* ---------------- load / save ---------------- */
async function load() {
  let c = { token: "", tokens: [], intervalMinutes: 5, mappings: [], lastRun: null };
  if (hasChrome) c = await chrome.storage.local.get(c);

  let tokens = Array.isArray(c.tokens) ? c.tokens : [];
  if (!tokens.length && c.token) tokens = [{ id: "legacy", label: "Default", value: c.token }];
  $("tokenList").innerHTML = "";
  if (!tokens.length) tokens = [{ id: uid(), label: "", value: "" }];
  for (const t of tokens) $("tokenList").appendChild(makeTokenCard(t));

  $("mapList").innerHTML = "";
  const mappings = c.mappings?.length ? c.mappings : [{ repo: "", groupTitle: "", color: "blue", tokenId: "" }];
  for (const m of mappings) $("mapList").appendChild(makeMappingCard(m));

  setInterval_(c.intervalMinutes || 5);
  populateMappingSelects();
  updateCounts();
  renderLastRun(c.lastRun);
  updateSchedStatus(c.lastRun);
  refreshGroups();
}

async function save() {
  const tokens = readTokens();
  const intervalMinutes = Math.max(1, Number($("interval").value) || 5);
  const mappings = readMappings();
  if (hasChrome) await chrome.storage.local.set({ tokens, intervalMinutes, mappings, token: "" });
  toast("Saved. Syncing…", "info");
  const resp = await sendMsg({ type: "syncNow" });
  if (resp?.ok) { const lr = { at: Date.now(), results: resp.results }; renderLastRun(lr); updateSchedStatus(lr); toast("Saved & synced", "ok"); }
  else if (hasChrome) toast("Saved", "ok");
  refreshGroups();
}

async function syncNow() {
  toast("Syncing…", "info");
  const resp = await sendMsg({ type: "syncNow" });
  if (resp?.ok) { const lr = { at: Date.now(), results: resp.results }; renderLastRun(lr); updateSchedStatus(lr); toast("Synced", "ok"); }
  else toast("Sync failed", "err");
  refreshGroups();
}

/* ---------------- init ---------------- */
$("ghMark").innerHTML = svg(P.pullRequest, 20);
$("addToken").innerHTML = svg(P.plus) + "Add token";
$("addRow").innerHTML = svg(P.plus) + "Add repository";
$("syncNow").innerHTML = svg(P.sync) + "Sync now";

$("addToken").addEventListener("click", () => { $("tokenList").appendChild(makeTokenCard({ id: uid() })); updateCounts(); populateMappingSelects(); });
$("addRow").addEventListener("click", () => { $("mapList").appendChild(makeMappingCard({ color: "blue" })); updateCounts(); });
$("refreshGroups").addEventListener("click", () => { refreshGroups(); toast("Groups refreshed", "info"); });
$("save").addEventListener("click", save);
$("syncNow").addEventListener("click", syncNow);
$("minUp").addEventListener("click", () => setInterval_(Number($("interval").value) + 1));
$("minDown").addEventListener("click", () => setInterval_(Number($("interval").value) - 1));
$("interval").addEventListener("input", () => setInterval_($("interval").value));
[...$("chips").children].forEach((ch) => ch.addEventListener("click", () => setInterval_(Number(ch.dataset.min))));

load();
