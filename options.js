"use strict";

const COLORS = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];
const $ = (id) => document.getElementById(id);
const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.runtime;

const ICON = {
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5.5 20 2 13 2 13a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"></path><path d="M1 1l22 22"></path></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5 18 5.3 18 5.3c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"></path></svg>',
};

function uid() { return (crypto?.randomUUID?.() || ("t" + Date.now() + Math.random().toString(36).slice(2))); }
function initials(label) {
  const s = (label || "").trim();
  if (!s) return "GH";
  const parts = s.split(/[\s_\-/().]+/).map((p) => p.replace(/[^a-z0-9]/gi, "")).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return "GH";
}
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
  avatar.textContent = initials(data.label);

  const fields = document.createElement("div");
  fields.className = "fields";

  const label = document.createElement("input");
  label.className = "input t-label";
  label.placeholder = "Label (e.g. GamebasicsBV)";
  label.value = data.label || "";
  label.addEventListener("input", () => { avatar.textContent = initials(label.value); populateMappingSelects(); });

  const secret = document.createElement("div");
  secret.className = "secret";
  const value = document.createElement("input");
  value.className = "input t-value";
  value.type = "password";
  value.placeholder = "github_pat_… / ghp_…";
  value.autocomplete = "off";
  value.value = data.value || "";
  const eye = document.createElement("button");
  eye.type = "button"; eye.className = "icon-btn eye"; eye.title = "Show / hide"; eye.innerHTML = ICON.eye;
  eye.addEventListener("click", () => {
    const show = value.type === "password";
    value.type = show ? "text" : "password";
    eye.innerHTML = show ? ICON.eyeOff : ICON.eye;
  });
  secret.append(value, eye);
  fields.append(label, secret);

  const validate = document.createElement("button");
  validate.type = "button"; validate.className = "btn btn-ghost btn-sm t-validate"; validate.textContent = "Validate";

  const del = document.createElement("button");
  del.type = "button"; del.className = "icon-btn danger t-del"; del.title = "Remove token"; del.innerHTML = ICON.trash;
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
  el.innerHTML = `<span class="pdot"></span>`;
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

  // repo (top row, with delete)
  const fRepo = document.createElement("div");
  fRepo.className = "repo-field";
  fRepo.innerHTML = `<span class="field-label">Repository</span><div class="input-icon">${ICON.github}<input class="input f-repo" placeholder="owner/name"></div>`;
  fRepo.querySelector(".f-repo").value = data.repo || "";

  // group
  const fGroup = document.createElement("div");
  fGroup.innerHTML = `<span class="field-label">Tab group</span><input class="input f-group" list="groupNames" placeholder="Group name">`;
  fGroup.querySelector(".f-group").value = data.groupTitle || "";

  // color
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

  // token
  const fToken = document.createElement("div");
  fToken.innerHTML = `<span class="field-label">Token</span>`;
  const sel = document.createElement("select");
  sel.className = "select f-token";
  sel.dataset.selected = data.tokenId || "";
  fToken.appendChild(sel);

  const del = document.createElement("button");
  del.type = "button"; del.className = "icon-btn danger f-del"; del.title = "Remove repository"; del.innerHTML = ICON.trash;
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
function populateMappingSelects() {
  [...$("mapList").querySelectorAll(".f-token")].forEach((s) => fillTokenSelect(s));
}
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
  let txt = `Every ${v} min`;
  if (lastRun?.at) txt += ` · synced ${relTime(lastRun.at)}`;
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
    const row = document.createElement("div");
    row.className = "log-row";
    const isErr = !!r.error;
    const badges = [];
    if (isErr) badges.push(`<span class="tag rem">${r.error}</span>`);
    else {
      badges.push(`<span class="tag open">${r.openCount} open</span>`);
      if (r.added?.length) badges.push(`<span class="tag add">+${r.added.length}</span>`);
      if (r.removed?.length) badges.push(`<span class="tag rem">−${r.removed.length}</span>`);
    }
    row.innerHTML = `
      <span class="log-dot ${isErr ? "err" : "ok"}"></span>
      <div class="log-main">
        <div class="log-title"></div>
        <div class="log-sub"></div>
      </div>
      <div class="log-badges">${badges.join("")}</div>`;
    row.querySelector(".log-title").textContent = r.repo || "(unconfigured)";
    row.querySelector(".log-sub").textContent = r.title ? `→ ${r.title}` : "";
    log.appendChild(row);
  }
}

/* ---------------- groups datalist ---------------- */
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

/* ---------------- wire up ---------------- */
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
