/* ---------- review, publish, and what happens when a check says no ---------- */
function sheet(l, id, title, body, foot, big) { l.innerHTML = `<div class="scrim" id="${l === layer ? 'scrim' : 'scrim2'}"><div class="sheet${big ? ' big' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}"><div class="sheet-head"><h2 id="${id}">${title}</h2><button class="iconbtn" ${l === layer ? 'id="rv-back"' : 'data-close2'} aria-label="Close">${I.x}</button></div><div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}</div></div>`; }
function review() { refresh(); const all = S.ch, by = SECTIONS.map(s => [s, all.filter(c => c.s === s)]).filter(x => x[1].length), n = all.filter(c => !c.note).length, ni = newImages(), w = ni.reduce((a, p) => a + cur._up[p].kb, 0);
  sheet(layer, 'rv-h', `Publish ${plural(n, 'change')}?`, `${by.map(([s, l]) => `<div><div class="sechead"><h3 class="mono">${s.label}</h3><button class="linkbtn" data-revert="${s.key}">Undo all of ${s.label}</button></div><ul class="changes">${l.map(c => `<li class="${c.note ? 'note' : ''}">${esc(c.t)}</li>`).join('')}</ul></div>`).join('')}
    ${ni.length ? `<ul class="changes"><li class="note">${plural(ni.length, 'new image')} will be uploaded in every size the site uses, ${size(w * 1024)} in total.</li></ul>` : ''}
    <p class="fine">This counts as one publish, however many things you changed. Your changes go to a private preview, the site's checks run on it, and only then does it reach houstondragna.com. Usually about five minutes. You can close this and carry on.</p>
    ${GH.on ? '' : LIVE ? `<div class="alert"><strong>Sign in to publish.</strong> This list is what would go out. Your edits stay on this device.</div>` : `<label class="check fine"><input type="checkbox" id="rv-fail">Prototype only: make a check fail, to see what that looks like</label>`}`,
    `<button class="btn small line" id="rv-keep">Keep editing</button>${LIVE && !GH.on ? `<button class="btn primary" id="ac-in">Sign in</button>` : `<button class="btn primary" id="rv-go">Publish</button>`}`);
  ($('rv-go') || $('rv-keep')).focus({ preventScroll: true }); }
function statusSheet() { if (!pub) return; const li = pub.steps.map((s, i) => `<li class="${pub.failed && i === pub.step ? 'fail' : i < pub.step ? 'done' : i === pub.step && pub.running ? 'now' : ''}"><i></i>${s}</li>`).join('');
  const link = (u, t) => u ? `<a class="linkbtn" href="${esc(u)}" target="_blank" rel="noopener">${t}</a>` : '';
  sheet(layer, 'st-h', pub.failed ? 'Not published' : pub.running ? 'Publishing' : pub.slow ? 'Published' : 'Live', `<ol class="steps">${li}</ol>
    ${pub.failed ? `<div class="alert"><strong>${pub.kind === 'clash' ? 'Not published.' : 'The site is unchanged.'}</strong> ${esc(GH.on ? pub.msg : 'One check failed: the Photo page ran 724px past the edge on a 1024px screen. Your changes are still here as a draft. Fix it and publish again.')}</div>
      <div class="posrow">${link(pub.link, 'See the details on GitHub')}${pub.kind === 'clash' ? '<button class="btn small line" id="ac-fresh">Start over from the live site</button>' : ''}${pub.pr ? '<button class="btn small line" id="st-abandon">Close this attempt</button>' : ''}</div>`
    : pub.running ? `<p class="fine">You can close this, or even this page. Publishing carries on, and the chip in the top bar keeps you posted.</p>${link(pub.preview, 'Open the private preview')}`
    : pub.slow ? `<p>Your changes are published. The site is still updating and should show them within a few minutes.</p>` : `<p>Your changes are on the site.</p>`}
    ${GH.on ? '' : '<p class="fine">Prototype. Nothing is being sent anywhere.</p>'}`); }
function publish(fail) { const ni = newImages().length, steps = ['Saving your changes as a draft', ...(ni ? [`Uploading ${plural(ni, 'image')}`] : []), 'Checking the content rules', 'Building a private preview', 'Checking layout at phone and desktop sizes', 'Publishing to houstondragna.com'];
  pub = { step: 0, running: true, failed: false, steps }; closeAll(true); render(); toast('Publishing. You can keep working.');
  const tick = () => { if (fail && pub.step === steps.length - 2) { pub.running = false; pub.failed = true; bar(); if ($('st-h')) statusSheet(); return toast('Not published. Tap the chip to see why.'); }
    pub.step++; if (pub.step >= steps.length) { pub.running = false; cur = JSON.parse(JSON.stringify(cur, (k, v) => k === '_new' ? undefined : v)); for (const k in orig) delete orig[k]; Object.assign(orig, clone(cur)); hist.length = 0; const st = !!$('st-h'); if (!layer2.firstChild && !editing) { render(); if (st) statusSheet(); } else bar(); toast('Live. Your changes are on the site.'); return setTimeout(() => { if (pub && !pub.running && !pub.failed) { pub = null; bar(); } }, 4000); }
    bar(); if ($('st-h')) statusSheet(); setTimeout(tick, 1000); }; setTimeout(tick, 1000); }
function sections() { refresh(); const by = {}, bad = {}; S.ch.filter(x => !x.note).forEach(x => by[x.s.key] = (by[x.s.key] || 0) + 1); S.pr.forEach(x => bad[x.s.key] = (bad[x.s.key] || 0) + 1);
  sheet(layer, 'sx-h', 'Sections', `<div class="rail" style="display:grid;position:static;padding:0">${railHTML(by, bad, secOf(view).key)}</div>
    ${LIVE ? `<button class="btn small line" id="acct" style="justify-self:start">${GH.on ? 'Account: ' + esc(GH.user) : 'Sign in'}</button>` : ''}`); }
function showProblem(p) { if (!p) return; if (view !== p.screen || (editing && editing !== p.open)) go(p.screen, true); if (p.open) openEditor(p.open);
  const el = p.k ? document.querySelector(`[data-f="${fid(p.at, p.k)}"]`) : p.at && $(gid(p.at)) || (p.ids.length && document.querySelector(`.item[data-id="${p.ids[p.ids.length - 1]}"]`));
  if (el) { el.scrollIntoView({ block: 'center' }); const i = el.querySelector('input,textarea,select,button'); if (i && innerWidth >= 900) i.focus({ preventScroll: true }); } if (!p.k || !el) toast(p.t); }
$('review').addEventListener('click', review); $('switch').addEventListener('click', sections);
$('count').addEventListener('click', () => { if (pub) return statusSheet(); refresh(); if (S.pr.length) showProblem(S.pr[0]); else if (S.ch.length) review(); });
$('undo').addEventListener('click', () => { const now = JSON.stringify(cur); let j; do { j = hist.pop(); } while (j !== undefined && j === now); if (j === undefined) return bar(); cur = JSON.parse(j); closeTop(); if (editing && !resolve(editing)) closeEditor(); render(); if (editing) { redrawEditor(); markEditing(); } });
$('rail').addEventListener('click', e => { const b = e.target.closest('button[data-go]'); if (b) go(b.dataset.go); });
layer.addEventListener('click', e => { const t = e.target, b = t.closest('button') || t;
  if ((t.id === 'scrim' && (!t.classList.contains('side') || innerWidth < 900)) || b.id === 'rv-back' || b.id === 'rv-keep') return closeLayer();
  if (b.id === 'ed-close' || b.id === 'ed-done') return closeLayer();
  if (b.id === 'rv-go') return GH.on ? publishGH() : publish($('rv-fail') && $('rv-fail').checked);
  if (b.dataset.revert) { snap(); cur[b.dataset.revert] = clone(orig[b.dataset.revert]); render(); refresh(); return S.ch.length ? review() : (layer.innerHTML = '', toast('Changes undone')); }
  if (b.dataset.go) return go(b.dataset.go);
  if (b.dataset.pos) return moveTo(b.dataset.pos === 'first' ? 0 : 1e9);
  if (b.tagName === 'BUTTON' && shared(b)) return;
  if (b.id === 'ed-remove') return removeItem(editing); });
function toast(t, undo) { document.querySelectorAll('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.innerHTML = `<span>${esc(t)}</span>${undo ? '<button>Undo</button>' : ''}`;
  if (undo) d.querySelector('button').onclick = () => { $('undo').click(); d.remove(); }; else d.style.padding = '12px 16px'; document.body.appendChild(d); setTimeout(() => d.remove(), undo ? 7000 : 3200); }
