// ═══════════════════════════════════════════════
// HOVER TOOLTIP — enriched with full task info
// ═══════════════════════════════════════════════
function showTip(e, id) {
  if (drag) return;
  const t = taskMap.get(id);
  if (!t) return;
  const st = t.status||'todo';
  const level = getTaskLevel(t);
  const hasSub = hasChildren(t.id);

  // Date display
  let dateStr = '';
  if (proposeMode) {
    dateStr = `W${t.propFrom ?? '?'} → W${t.propTo ?? '?'}`;
  } else {
    dateStr = `${t.from||'?'} → ${t.to||'?'}`;
  }

  // Duration
  let durStr = '';
  if (proposeMode && t.propFrom != null && t.propTo != null) {
    durStr = `${t.propTo - t.propFrom + 1} weeks`;
  } else if (!proposeMode && t.from && t.to) {
    const d1 = new Date(t.from), d2 = new Date(t.to);
    const diff = Math.ceil((d2 - d1) / 86400000) + 1;
    durStr = `${diff} days`;
  }

  document.getElementById('tooltip').innerHTML = `
    <div class="tt-name">${esc(t.name)}</div>
    ${level > 0 ? '<div class="tt-badge">Sub-task</div>' : ''}
    ${hasSub ? '<div class="tt-badge tt-badge-parent">Parent</div>' : ''}
    <div class="tt-row"><span class="tt-muted">Category:</span> ${esc(t.category||'—')}</div>
    <div class="tt-row"><span class="tt-muted">PIC:</span> ${t.owner ? `<span class="tt-pic" style="background:${getPicColor(t.owner)}">${esc(t.owner)}</span>` : '—'}</div>
    <div class="tt-row"><span class="tt-muted">${proposeMode?'Weeks':'Dates'}:</span> ${dateStr}${durStr ? ` <span class="tt-muted">(${durStr})</span>` : ''}</div>
    <div class="tt-row" style="margin-top:4px">
      <span class="sbadge ${STATUS_CLS[st]}" style="pointer-events:none">${STATUS_LBL[st]}</span>
    </div>
    <div class="tt-pb">
      <span style="font-size:11px;color:#94a3b8">Progress:</span>
      <span style="font-weight:700;color:${pctCol(t.pct||0)}">${t.pct||0}%</span>
      <div class="tt-pb-bar"><div class="tt-pb-fill" style="width:${t.pct||0}%;background:${pctCol(t.pct||0)}"></div></div>
    </div>
    ${t.description?`<div class="tt-desc">${esc(t.description)}</div>`:''}
    ${t.notes?`<div class="tt-notes">${esc(t.notes)}</div>`:''}
  `;
  const r = e.currentTarget.getBoundingClientRect();
  let x=r.left, y2=r.bottom+8;
  if (x+270>window.innerWidth)  x  = window.innerWidth-280;
  if (y2+200>window.innerHeight) y2 = r.top-210;
  const tip = document.getElementById('tooltip');
  tip.style.cssText = `display:block;left:${x}px;top:${y2}px`;
}
function hideTip() { document.getElementById('tooltip').style.display='none'; }
