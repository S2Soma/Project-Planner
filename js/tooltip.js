// ═══════════════════════════════════════════════
// HOVER TOOLTIP
// ═══════════════════════════════════════════════
function showTip(e, id) {
  if (drag) return;
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const st = t.status||'todo';
  document.getElementById('tooltip').innerHTML = `
    <div class="tt-name">${esc(t.name)}</div>
    <div class="tt-row"><span class="tt-muted">Category:</span> ${esc(t.category||'—')}</div>
    <div class="tt-row"><span class="tt-muted">PIC:</span> ${esc(t.owner||'—')}</div>
    <div class="tt-row"><span class="tt-muted">Dates:</span> ${t.from} → ${t.to}</div>
    <div class="tt-row" style="margin-top:4px">
      <span class="sbadge ${STATUS_CLS[st]}" style="pointer-events:none">${STATUS_LBL[st]}</span>
    </div>
    <div class="tt-pb">
      <span style="font-size:11px;color:#94a3b8">Progress:</span>
      <span style="font-weight:700;color:${pctCol(t.pct||0)}">${t.pct||0}%</span>
      <div class="tt-pb-bar"><div class="tt-pb-fill" style="width:${t.pct||0}%;background:${pctCol(t.pct||0)}"></div></div>
    </div>
    ${t.description?`<div style="font-size:11px;color:#64748b;margin-top:5px;border-top:1px solid #f1f5f9;padding-top:5px">${esc(t.description)}</div>`:''}
  `;
  const r = e.currentTarget.getBoundingClientRect();
  let x=r.left, y2=r.bottom+8;
  if (x+270>window.innerWidth)  x  = window.innerWidth-280;
  if (y2+200>window.innerHeight) y2 = r.top-210;
  const tip = document.getElementById('tooltip');
  tip.style.cssText = `display:block;left:${x}px;top:${y2}px`;
}
function hideTip() { document.getElementById('tooltip').style.display='none'; }
