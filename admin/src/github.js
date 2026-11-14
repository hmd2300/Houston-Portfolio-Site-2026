/* ---------- GitHub: sign-in, loading, drafts that follow you, and publishing ----------
   The site lives in a GitHub repository. The admin reads the content from it, keeps your unpublished edits on a branch
   of their own (admin-draft) so any device you sign in on picks them up, and publishes by opening a pull request,
   waiting for the site's own checks and a private preview build, and only then merging. Nothing reaches the site
   until every check has passed. The key you paste in stays on this device and is only ever sent to GitHub. */
const REPO = SAMPLE.repo || {}, API = 'https://api.github.com', DRAFT = 'admin-draft', PUB = 'admin-publish-';
const TOKEN_KEY = 'hd-admin-key', CONTENT = ['home', 'design', 'photo', 'video', 'navigation', 'pages', 'site', 'redirects'];
const NEED_CHECKS = ['Build and content rules', 'Browser checks (site)', 'Browser checks (sync)'];
let GH = { on: false, token: null, user: null, base: null, files: null, shas: null, draftSha: null, saving: false, dirty: false, saved: null, offline: false, stale: false };
const getKey = () => { try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
const putKey = (k, keep) => { try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); if (k) (keep ? localStorage : sessionStorage).setItem(TOKEN_KEY, k); } catch (e) {} };
const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };

/* one call to GitHub, with errors turned into plain words */
async function gh(method, path, body, accept) {
  const url = API + path.replace('{repo}', `/repos/${REPO.owner}/${REPO.name}`);
  let r; try { r = await fetch(url, { method, cache: 'no-store', headers: { Authorization: `Bearer ${GH.token}`, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { const x = new Error('GitHub could not be reached. Check the connection and try again.'); x.offline = true; throw x; }
  if (r.status === 204) return null;
  if (!r.ok) { let m = ''; try { m = (await r.json()).message || ''; } catch (e) {}
    const x = new Error(r.status === 401 ? 'GitHub did not accept the key. It may have expired or been deleted.' : r.status === 403 && /rate limit/i.test(m) ? 'GitHub asked us to slow down. Wait a minute and try again.'
      : r.status === 403 ? 'The key is missing a permission. It needs Contents and Pull requests set to Read and write, plus Checks and Commit statuses set to Read.'
      : r.status === 404 && path.startsWith('{repo}') && !/\/(ref|contents|pulls\/\d|git\/refs)/.test(path) ? `The key cannot see ${REPO.owner}/${REPO.name}. Make sure that repository is selected for it.` : `GitHub said: ${m || r.status}`);
    x.status = r.status; x.gh = m; throw x; }
  return accept === 'raw' ? r.arrayBuffer() : r.json(); }
const getRef = async b => { try { return (await gh('GET', `{repo}/git/ref/heads/${b}`)).object.sha; } catch (e) { if (e.status === 404) return null; throw e; } };
const setRef = async (b, sha) => (await getRef(b)) ? gh('PATCH', `{repo}/git/refs/heads/${b}`, { sha, force: true }) : gh('POST', '{repo}/git/refs', { ref: `refs/heads/${b}`, sha });
const dropRef = async b => { try { await gh('DELETE', `{repo}/git/refs/heads/${b}`); } catch (e) { if (e.status !== 404 && e.status !== 422) throw e; } };
async function readJSON(path, ref) { const j = await gh('GET', `{repo}/contents/${path}?ref=${ref}`); return { data: JSON.parse(unb64(j.content)), sha: j.sha }; }

/* the content files at one commit, in the shape the admin edits */
async function loadAt(sha) {
  const F = {}, shas = {};
  await Promise.all(CONTENT.map(async n => { const r = await readJSON(`content/${n}.json`, sha); F[n] = r.data; shas[n] = r.sha; }));
  const order = (await readJSON('content/case-studies.json', sha)).data.order;
  F.studies = await Promise.all(order.map(async s => { const d = (await readJSON(`content/studies/${s}.json`, sha)).data; return { id: d.id, title: d.card.title, path: d.path }; }));
  return { F, shas }; }
const hasImage = p => !!(MEDIA[p] || (cur && cur._up && cur._up[p]));
function adopt(F, model) {                                     /* make F the starting point, and model (if any) the working copy */
  uid = 0; orig = tag(ROOT, clone(ADAPTER.toAdmin(F, hasImage)));
  if (model) { uid = 1e6; cur = tag(ROOT, model); } else cur = clone(orig);
  hist.length = 0; S = { ch: [], pr: [], changed: new Set(), bad: new Map() }; }

/* ---------- signing in ---------- */
async function connect(key, keep) {
  GH.token = key.trim(); const repo = await gh('GET', '{repo}');
  if (!repo.permissions || !repo.permissions.push) throw new Error('The key can read the site but not change it. Set Contents to Read and write.');
  GH.user = (await gh('GET', '/user')).login; putKey(GH.token, keep); GH.on = true; }
async function boot() {
  GH.loading = true; render();
  const main = await getRef('main'), draftHead = await getRef(DRAFT); let remote = null;
  if (draftHead) { try { remote = (await readJSON('draft.json', draftHead)).data; } catch (e) { remote = null; } }
  let local = null; try { local = JSON.parse(localStorage.getItem(KEY + '-gh') || 'null'); } catch (e) {}
  if (local && local.repo !== `${REPO.owner}/${REPO.name}`) local = null;
  /* a copy that already reached GitHub but is no longer there was published or cleared on another device: it is done */
  if (local && local.synced && (!remote || remote.savedAt > local.savedAt)) local = null;
  /* the newer of this device's copy and the one on GitHub wins; the other device's copy is never silently lost */
  const pick = remote && (!local || remote.savedAt >= local.savedAt) ? remote : local;
  GH.base = pick ? pick.base : main;
  const { F, shas } = await loadAt(GH.base); GH.files = F; GH.shas = shas; GH.draftSha = draftHead; GH.main = main;
  adopt(F, pick && pick.model); if (pick && pick.view) view = pick.view; GH.lastJSON = JSON.stringify(cur);
  GH.saved = pick ? pick.savedAt : null; GH.dirty = !!(pick === local && local && (!remote || local.savedAt > remote.savedAt));
  GH.loading = false; render(); if (GH.dirty) saveDraft();
  await resume(); }

/* ---------- drafts ---------- */
let draftT = null;
function draftChanged() { if (!GH.on || GH.loading) return; GH.dirty = true; GH.saved = Date.now();
  try { localStorage.setItem(KEY + '-gh', JSON.stringify(draftDoc())); } catch (e) {}
  clearTimeout(draftT); draftT = setTimeout(saveDraft, 2500); savedLine(); }
const draftDoc = () => ({ v: 1, repo: `${REPO.owner}/${REPO.name}`, base: GH.base, savedAt: GH.saved || Date.now(), device: navigator.userAgent.slice(0, 120), view, model: cur });
/* images added in this visit go up to GitHub as soon as the draft saves, so another device can publish them too */
async function uploadImages(paths, onEach) {
  for (const p of paths) { const u = cur._up[p], local = BLOBS.get(p); u.files = u.files || {};
    const kinds = local ? Object.keys(local.files) : Object.keys(u.files);
    for (const k of kinds) { if (u.files[k]) continue; if (!local) throw new Error(`“${fileName(p)}” was added on another device and did not finish uploading there. Add it again.`);
      const f = local.files[k], same = Object.keys(local.files).find(o => o !== k && local.files[o] === f && u.files[o]);
      u.files[k] = same ? u.files[same] : (await gh('POST', '{repo}/git/blobs', { content: b64(await f.blob.arrayBuffer()), encoding: 'base64' })).sha; }
    if (onEach) onEach(p); } }
async function saveDraft() {
  if (!GH.on || GH.saving || !GH.dirty || GH.stale) return; GH.saving = true; savedLine();
  try {
    const head = await getRef(DRAFT);
    if (GH.draftSha && head !== GH.draftSha) { GH.stale = true; GH.gone = !head; return staleDraft(!head); }
    if (!S.ch.length && !newImages().length) {                 /* nothing left to keep: the draft branch goes */
      if (head) await dropRef(DRAFT); GH.draftSha = null; GH.dirty = false; return; }
    const pending = Object.keys(cur._up || {}).filter(p => BLOBS.get(p) && Object.keys(BLOBS.get(p).files).some(k => !cur._up[p].files || !cur._up[p].files[k]));
    await uploadImages(pending);
    const doc = draftDoc(), tree = [{ path: 'draft.json', mode: '100644', type: 'blob', content: JSON.stringify(doc) },
      ...Object.values(cur._up || {}).flatMap(u => Object.entries(u.files || {}).map(([k, sha]) => ({ path: `images/${sha}`, mode: '100644', type: 'blob', sha })))];
    const seen = new Set(), t = await gh('POST', '{repo}/git/trees', { tree: tree.filter(x => !seen.has(x.path) && seen.add(x.path)) });
    const c = await gh('POST', '{repo}/git/commits', { message: 'Admin draft [skip ci] [skip netlify]', tree: t.sha, parents: head ? [head] : [] });
    await setRef(DRAFT, c.sha); GH.draftSha = c.sha; GH.dirty = JSON.stringify(doc.model) !== JSON.stringify(cur); GH.offline = false;
    try { localStorage.setItem(KEY + '-gh', JSON.stringify({ ...doc, synced: !GH.dirty })); } catch (e) {}
  } catch (e) { GH.offline = !!e.offline; GH.err = e.message; }
  finally { GH.saving = false; savedLine(); if (GH.dirty && !GH.stale) { clearTimeout(draftT); draftT = setTimeout(saveDraft, GH.offline ? 15000 : 2500); } } }
function staleDraft(gone) { savedLine();
  sheet(layer, 'sd-h', gone ? 'Published elsewhere' : 'Changed on another device', gone ? `<p>The draft this page opened with was published or cleared on another device. Load the site as it is now, or keep what is on this page as a new draft.</p>`
    : `<p>Your draft was saved from another device after this one opened it. Choose which one to keep.</p>`,
    `<button class="btn small line" data-stale="mine">Keep this one</button><button class="btn primary" data-stale="theirs">${gone ? 'Load the site as it is now' : 'Load the other one'}</button>`); }
async function discardDraft() { clearTimeout(draftT); GH.dirty = false; try { localStorage.removeItem(KEY + '-gh'); } catch (e) {} await dropRef(DRAFT); GH.draftSha = null; await boot(); }
function savedLine() { const el = $('saved'); if (!el) return; const ago = GH.saved ? Math.round((Date.now() - GH.saved) / 60000) : null;
  el.textContent = !GH.on ? (LIVE ? 'Not signed in. Edits stay on this device' : 'Draft saved on this device') : GH.loading ? 'Loading from GitHub' : GH.stale ? (GH.gone ? 'Draft published on another device' : 'Draft changed on another device')
    : GH.saving ? 'Saving draft' : GH.offline ? 'Offline. Draft kept on this device' : GH.err && GH.dirty ? 'Draft not saved yet' : !S.ch.length ? `Signed in as ${GH.user}` : `Draft saved${ago === 0 ? ' just now' : ago ? ` ${ago} min ago` : ''}`;
  el.classList.toggle('warnline', !!(GH.stale || GH.offline)); }
setInterval(savedLine, 30000);

/* ---------- publishing ---------- */
const STEP = { save: 'Saving your changes', up: n => `Uploading ${plural(n, 'image')}`, rules: 'Checking the content rules', preview: 'Building a private preview', layout: 'Checking layout at phone and desktop sizes', live: 'Publishing to houstondragna.com' };
const fixMsg = { 'Build and content rules': 'a content rule', 'Browser checks (site)': 'the layout check', 'Browser checks (sync)': 'the page check', preview: 'the preview build' };
function headline(list) { const t = list.filter(c => !c.note).map(c => c.s ? `${c.s.label}, ${c.t.charAt(0).toLowerCase()}${c.t.slice(1)}` : c.t); return t.length ? (t[0].length > 60 ? t[0].slice(0, 57).replace(/\s\S*$/, '') + '…' : t[0]) + (t.length > 1 ? ` (+${t.length - 1} more)` : '') : 'Admin changes'; }
async function publishGH() {
  refresh(); if (S.pr.length) return showProblem(S.pr[0]);
  const imgs = newImages(), steps = [STEP.save, ...(imgs.length ? [STEP.up(imgs.length)] : []), STEP.rules, STEP.preview, STEP.layout, STEP.live];
  pub = { step: 0, running: true, failed: false, steps, kinds: ['save', ...(imgs.length ? ['up'] : []), 'rules', 'preview', 'layout', 'live'] };
  closeAll(true); render(); toast('Publishing. You can keep working.');
  try {
    clearTimeout(draftT); await saveDraft(); if (GH.stale) throw new Error('Your draft was changed on another device. Choose which one to keep, then publish again.');
    const main = await getRef('main'), mainTree = (await gh('GET', `{repo}/git/commits/${main}`)).tree.sha;
    const F = ADAPTER.toFiles(cur, GH.files, { has: hasImage }), out = ADAPTER.changed(F, GH.files);
    if (main !== GH.base) {                                    /* the site moved on since this draft began: only a clash on the same file stops us */
      const clash = []; for (const path of Object.keys(out)) { const n = path.slice(8, -5), now = await gh('GET', `{repo}/contents/${path}?ref=${main}`).catch(() => null); if (!now || now.sha !== GH.shas[n]) clash.push(path.slice(8)); }
      if (clash.length) { const e = new Error(`The site changed since this draft began (${clash.join(', ')}), probably from a chat with Claude. Publishing now would undo that.`); e.clash = true; throw e; } }
    if (imgs.length) { pub.step = 1; bar(); statusIfOpen(); await heroCrops(imgs); await uploadImages(imgs); }
    const tree = Object.entries(out).map(([path, text]) => ({ path, mode: '100644', type: 'blob', content: text }));
    for (const p of imgs) { const u = cur._up[p], v = variantPaths(p, true), put = (path, sha) => sha && tree.push({ path: path.slice(1), mode: '100644', type: 'blob', sha });
      put(p, u.files.full); put(v.view, u.files.view); put(v.thumb, u.files.thumb); if (u.files.hero) put(v.hero, u.files.hero); }
    const t = await gh('POST', '{repo}/git/trees', { base_tree: mainTree, tree }), list = S.ch;
    const body = list.map(c => `- ${c.t}`).join('\n') + (imgs.length ? `\n- ${plural(imgs.length, 'new image')}` : '') + `\n\nPublished from the site admin by ${GH.user}.`;
    const c = await gh('POST', '{repo}/git/commits', { message: `Admin: ${headline(list)}\n\n${body}`, tree: t.sha, parents: [main] });
    for (const old of await openPublishes()) { await gh('PATCH', `{repo}/pulls/${old.number}`, { state: 'closed' }).catch(() => {}); await dropRef(old.head.ref).catch(() => {}); }
    const branch = PUB + stamp(); await setRef(branch, c.sha);
    const pr = await gh('POST', '{repo}/pulls', { title: `Admin: ${headline(list)}`, head: branch, base: 'main', body });
    Object.assign(pub, { pr: pr.number, url: pr.html_url, head: c.sha, branch, step: pub.kinds.indexOf('rules'), done: list.map(x => x.t) });
    bar(); statusIfOpen(); await watch();
  } catch (e) { fail(e.message, e.clash ? 'clash' : null); } }
/* a new hero slide gets its phone crop cut again if the framing was moved after it was added */
async function heroCrops(imgs) { for (const s of cur.home.slides) { const u = cur._up[s.image], local = BLOBS.get(s.image);
  if (!u || !u.hero || !local || (s.phone == null ? 50 : s.phone) === (local.heroAt == null ? 50 : local.heroAt)) continue;
  const bmp = await createImageBitmap(local.files.full.blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0);
  const t = heroCrop(c, s.phone); local.files = { ...local.files, hero: { blob: await webp(t), w: t.width, h: t.height } }; local.heroAt = s.phone; delete u.files.hero; } }
const openPublishes = async () => (await gh('GET', `{repo}/pulls?state=open&base=main&per_page=50`)).filter(p => p.head && p.head.ref.startsWith(PUB));
function statusIfOpen() { if ($('st-h')) statusSheet(); }
function fail(msg, kind, link) { pub = { ...(pub || { steps: [], kinds: [] }), running: false, failed: true, msg, kind, link }; bar(); statusIfOpen(); toast('Not published. Tap the chip to see why.'); }
async function watch() {
  const t0 = Date.now();
  while (pub && pub.running && pub.head) {
    let runs, st; try { runs = (await gh('GET', `{repo}/commits/${pub.head}/check-runs?per_page=100`)).check_runs; st = (await gh('GET', `{repo}/commits/${pub.head}/status`)).statuses; }
    catch (e) { if (e.offline) { await sleep(10000); continue; } throw e; }
    const run = n => runs.filter(r => r.name === n).sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''))[0];
    const prev = st.find(s => /deploy-preview$/.test(s.context));
    const bad = NEED_CHECKS.map(n => [n, run(n)]).find(([, r]) => r && r.status === 'completed' && !['success', 'neutral', 'skipped'].includes(r.conclusion));
    if (bad) { pub.step = pub.kinds.indexOf(bad[0] === NEED_CHECKS[0] ? 'rules' : 'layout'); return fail(`One check failed: ${fixMsg[bad[0]]}. Your draft is safe. Ask Claude to look at it, or fix the content and publish again.`, 'check', bad[1].html_url); }
    if (prev && ['failure', 'error'].includes(prev.state)) { pub.step = pub.kinds.indexOf('preview'); return fail(`The private preview did not build, usually because of a content rule. Your draft is safe. Ask Claude to look at it.`, 'check', prev.target_url); }
    const ok = n => { const r = run(n); return r && r.status === 'completed' && ['success', 'neutral', 'skipped'].includes(r.conclusion); };
    const done = { rules: ok(NEED_CHECKS[0]), preview: !!(prev && prev.state === 'success'), layout: ok(NEED_CHECKS[1]) && ok(NEED_CHECKS[2]) };
    let i = pub.kinds.indexOf('rules'); while (pub.kinds[i] !== 'live' && done[pub.kinds[i]]) i++;
    if (i !== pub.step) { pub.step = i; if (prev) pub.preview = prev.target_url; bar(); statusIfOpen(); }
    if (pub.kinds[i] === 'live') return goLive();
    if (Date.now() - t0 > 25 * 60000) return fail('The checks are taking far longer than usual. Your draft is safe. Ask Claude to look at it.', 'slow', pub.url);
    await sleep(6000); } }
async function goLive() {
  const m = await gh('PUT', `{repo}/pulls/${pub.pr}/merge`, { merge_method: 'squash', sha: pub.head, commit_title: `Admin: ${headline((pub.done || []).map(t => ({ t })))}` });
  await dropRef(pub.branch).catch(() => {}); pub.merged = m.sha; bar(); statusIfOpen();
  /* the change is in; now wait until the live site has actually rebuilt with it */
  const t0 = Date.now(), site = SAMPLE.siteUrl || '';
  while (Date.now() - t0 < 12 * 60000) { await sleep(8000);
    try { const b = await (await fetch(`${site}/admin/build.json?t=${Date.now()}`, { cache: 'no-store' })).json(); if (b.build === m.sha) break; } catch (e) {} }
  const live = Date.now() - t0 < 12 * 60000;
  Object.values(cur._up || {}).forEach(u => u.t && Object.keys(cur._up).forEach(p => { if (cur._up[p] === u) MEDIA[p] = { t: u.t, w: u.w, h: u.h, kb: u.kb }; }));
  clearTimeout(draftT); GH.dirty = false; try { localStorage.removeItem(KEY + '-gh'); } catch (e) {} await dropRef(DRAFT).catch(() => {}); GH.draftSha = null;
  const keepView = view, keepEd = editing; editing = null; await boot(); view = keepView;
  pub = { ...pub, running: false, failed: false, step: pub.steps.length, slow: !live }; render(); if (keepEd && resolve(keepEd)) openEditor(keepEd);
  statusIfOpen(); toast(live ? 'Live. Your changes are on the site.' : 'Published. The site is still updating and should catch up in a few minutes.');
  setTimeout(() => { if (pub && !pub.running && !pub.failed) { pub = null; bar(); } }, 8000); }
/* came back while a publish was still going (another tab, a reload, another device): pick it up */
async function resume() { if (pub && pub.running) return; let open; try { open = await openPublishes(); } catch (e) { return; } if (!open.length) return;
  const p = open[0], steps = [STEP.save, STEP.rules, STEP.preview, STEP.layout, STEP.live];
  pub = { step: 1, running: true, failed: false, steps, kinds: ['save', 'rules', 'preview', 'layout', 'live'], pr: p.number, url: p.html_url, head: p.head.sha, branch: p.head.ref, done: (p.body || '').split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2)) };
  bar(); try { await watch(); } catch (e) { fail(e.message); } }
async function abandon() { if (!pub || !pub.pr) { pub = null; return bar(); } await gh('PATCH', `{repo}/pulls/${pub.pr}`, { state: 'closed' }).catch(() => {}); await dropRef(pub.branch).catch(() => {}); pub = null; closeLayer(); toast('That attempt was closed. Your draft is still here.'); }

/* ---------- the sign-in screen ---------- */
const NEW_KEY = 'https://github.com/settings/personal-access-tokens/new';
function signInHTML(err) { return `<div class="signin"><div class="sec-head"><h1>Sign in</h1></div>
  <p>The admin publishes through GitHub, where the site lives. It needs a key from your GitHub account that can change this one repository and nothing else.</p>
  <ol class="howto"><li>Open <a href="${NEW_KEY}" target="_blank" rel="noopener">GitHub, new fine-grained token</a>. Name it <b>Site admin</b> and pick an expiry.</li>
    <li>Under Repository access choose <b>Only select repositories</b> and pick <b>${esc(REPO.owner)}/${esc(REPO.name)}</b>.</li>
    <li>Under Permissions set <b>Contents</b> and <b>Pull requests</b> to Read and write, and <b>Checks</b> and <b>Commit statuses</b> to Read.</li>
    <li>Create it, copy it, and paste it here.</li></ol>
  <form id="si-form" class="card" novalidate><div class="field${err ? ' bad' : ''}"><div class="lab"><label class="mono" for="si-key">GitHub key</label></div>
    <input type="password" id="si-key" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="github_pat_…" required>${err ? `<p class="msg">${esc(err)}</p>` : ''}
    <p class="hint">It is kept on this device only and is sent nowhere but GitHub. You can delete it on GitHub at any time.</p></div>
    <label class="check"><input type="checkbox" id="si-keep" checked>Keep me signed in on this device</label>
    <div class="posrow"><button class="btn primary" id="si-go" type="submit">Connect</button><button class="btn small line" type="button" id="si-look">Look around first</button></div></form></div>`; }
async function trySignIn(key, keep) { const b = $('si-go'); if (b) { b.disabled = true; b.textContent = 'Checking'; }
  try { await connect(key, keep); toast(`Signed in as ${GH.user}`); await boot(); }
  catch (e) { GH.token = null; GH.on = false; $('main').innerHTML = signInHTML(e.message); const k = $('si-key'); if (k) k.focus(); } }
function account() { sheet(layer, 'ac-h', GH.on ? GH.user : 'Not signed in', GH.on ? `<p class="fine">Signed in to GitHub. Edits are saved to a draft there, so any device you sign in on picks them up.</p>
    <div class="posrow"><button class="btn small line" id="ac-fresh">Start over from the live site</button><button class="btn small danger" id="ac-out">Sign out</button></div>
    <p class="fine">Start over throws away the draft on every device. Sign out removes the key from this device only.</p>`
    : `<p class="fine">You are looking around. Edits stay on this device and cannot be published.</p><button class="btn primary" id="ac-in">Sign in</button>`); }
document.addEventListener('submit', e => { if (e.target.id !== 'si-form') return; e.preventDefault(); const k = $('si-key').value; if (k.trim()) trySignIn(k, $('si-keep').checked); });
document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'si-look') { GH.look = true; render(); }
  if (b.id === 'acct') account();
  if (b.id === 'ac-in') { closeLayer(); GH.look = false; render(); }
  if (b.id === 'ac-out') { putKey(null); GH = { on: false }; closeLayer(); GH.look = false; render(); toast('Signed out. The key is gone from this device.'); }
  if (b.id === 'ac-fresh') { if (!b.dataset.sure && S.ch.length) { b.dataset.sure = 1; b.textContent = 'Tap again to throw the draft away'; b.classList.add('danger'); return; }
    closeLayer(); discardDraft().then(() => toast('Back to the live site.')); }
  if (b.dataset.stale === 'theirs') { GH.stale = false; GH.gone = false; closeLayer(); try { localStorage.removeItem(KEY + '-gh'); } catch (e) {} boot(); }
  if (b.dataset.stale === 'mine') { GH.stale = false; GH.gone = false; getRef(DRAFT).then(h => { GH.draftSha = h; GH.dirty = true; closeLayer(); saveDraft(); }); }
  if (b.id === 'st-abandon') abandon(); });

/* on opening: a key kept on this device signs straight in */
if (LIVE && REPO.owner) { const k = getKey(); if (k) { GH.loading = true; GH.token = k;
  connect(k, (() => { try { return !!localStorage.getItem(TOKEN_KEY); } catch (e) { return false; } })()).then(boot)
    .catch(e => { GH = { on: false, signErr: e.offline ? e.message : `${e.message} Paste a new key to sign in again.` }; if (!e.offline) putKey(null); render(); }); } }
