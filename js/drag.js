// ═══════════════════════════════════════════════
// DRAG & DROP (horizontal = dates, vertical = reorder)
// ═══════════════════════════════════════════════
function startDrag(e, id) {
  if (e.button!==0) return;
  e.preventDefault(); e.stopPropagation(); hideTip();
  const t=tasks.find(t=>t.id===id); if(!t) return;
  const bar=barFor(t); if(!bar) return;

  // Bulk drag: if this task is selected and multiple selected
  const isBulk = selectedIds.has(id) && selectedIds.size > 1;
  let peers = [];
  if (isBulk) {
    peers = [...selectedIds]
      .filter(pid => pid !== id)
      .map(pid => {
        const pt = tasks.find(t => t.id === pid);
        if (!pt) return null;
        const pb = barFor(pt);
        if (!pb) return null;
        return { taskId: pid, origSi: pb.si, span: pb.span };
      })
      .filter(Boolean);
  }

  drag = { type:'move', taskId:id, startX:e.clientX, startY:e.clientY, origSi:bar.si, span:bar.span, delta:0, moved:false, bulk:isBulk, peers };
  document.body.style.userSelect='none';
}
function startResize(e, id) {
  if (e.button!==0) return;
  e.preventDefault(); e.stopPropagation(); hideTip();
  const t=tasks.find(t=>t.id===id); if(!t) return;
  const bar=barFor(t); if(!bar) return;
  drag = { type:'resize', taskId:id, startX:e.clientX, startY:e.clientY, origSi:bar.si, span:bar.span, delta:0, moved:false, bulk:false, peers:[] };
  document.body.style.cursor='ew-resize';
  document.body.style.userSelect='none';
}
document.addEventListener('mousemove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;

  if (!drag.moved) {
    if (Math.abs(dx)<5 && Math.abs(dy)<5) return;

    // Vertical drag on a 'move' bar → convert to reorder
    if (drag.type==='move' && Math.abs(dy) > Math.abs(dx)) {
      const taskId = drag.taskId;
      const isBulk = drag.bulk;
      const origStartY = drag.startY;
      drag = null;

      const row = document.querySelector(`.task-row[data-id="${taskId}"]`);
      if (!row) { document.body.style.userSelect=''; return; }

      reorder = {
        taskId,
        startY: origStartY,
        row,
        moved: false,
        targetId: null,
        targetCategory: null,
        insertBefore: true,
        bulk: isBulk,
        bulkIds: isBulk ? [...selectedIds] : [taskId]
      };
      return;
    }

    drag.moved = true;
  }

  const nd = Math.round(dx/COL);
  if (nd===drag.delta) return;
  drag.delta = nd;
  const barEl = document.querySelector(`.task-bar[data-id="${drag.taskId}"]`);
  if (!barEl) return;
  barEl.classList.add('dragging');
  if (drag.type==='move') {
    document.body.style.cursor='grabbing';
    const nsi=Math.max(0,Math.min(days.length-drag.span,drag.origSi+nd));
    barEl.style.left=(nsi*COL+2)+'px';
    showDragTip(e,`↔ ${days[nsi]?.date} → ${days[nsi+drag.span-1]?.date}`);

    // Bulk: move peer bars
    if (drag.bulk && drag.peers) {
      drag.peers.forEach(p => {
        const pBar = document.querySelector(`.task-bar[data-id="${p.taskId}"]`);
        if (!pBar) return;
        pBar.classList.add('dragging');
        const pNsi = Math.max(0, Math.min(days.length - p.span, p.origSi + nd));
        pBar.style.left = (pNsi * COL + 2) + 'px';
      });
    }
  } else {
    let ns=Math.max(1,Math.min(drag.span+nd,days.length-drag.origSi));
    // Snap to week boundary (within 2 days)
    const endIdx = drag.origSi + ns - 1;
    for (let w = 0; w < weeks.length; w++) {
      const wStart = proposeMode ? w * 7 : days.findIndex(d => d.wn === weeks[w].wn);
      const wEnd = wStart + weeks[w].count - 1;
      // Snap to end of week
      if (Math.abs(endIdx - wEnd) <= 1 && wEnd < days.length) {
        ns = wEnd - drag.origSi + 1;
        break;
      }
      // Snap to start of next week
      if (Math.abs(endIdx - (wEnd + 1)) <= 1 && wEnd + 1 < days.length) {
        ns = wEnd + 1 - drag.origSi + 1;
        break;
      }
    }
    ns = Math.max(1, Math.min(ns, days.length - drag.origSi));
    barEl.style.width=(ns*COL-4)+'px';
    const endDay = days[drag.origSi+ns-1];
    showDragTip(e,`↔ End: ${endDay?.date}${endDay?.wn !== undefined ? ' (W'+endDay.wn+')':''}`);
  }
});
document.addEventListener('mouseup', e => {
  if (!drag) return;
  const { type,taskId,moved,origSi,span,delta,bulk,peers } = drag;
  drag=null;
  document.body.style.cursor='';
  document.body.style.userSelect='';
  hideDragTip();
  const barEl=document.querySelector(`.task-bar[data-id="${taskId}"]`);
  if (barEl) barEl.classList.remove('dragging');

  // Clean up peer bar dragging class
  if (bulk && peers) {
    peers.forEach(p => {
      const pBar = document.querySelector(`.task-bar[data-id="${p.taskId}"]`);
      if (pBar) pBar.classList.remove('dragging');
    });
  }

  if (moved && delta!==0) {
    const t=tasks.find(t=>t.id===taskId);
    if (t) {
      if (type==='move') {
        const nsi=Math.max(0,Math.min(days.length-span,origSi+delta));
        t.from=days[nsi].date; t.to=days[nsi+span-1].date;

        // Bulk: update peer task dates
        if (bulk && peers) {
          peers.forEach(p => {
            const pt = tasks.find(t => t.id === p.taskId);
            if (!pt) return;
            const pNsi = Math.max(0, Math.min(days.length - p.span, p.origSi + delta));
            pt.from = days[pNsi].date;
            pt.to = days[pNsi + p.span - 1].date;
          });
        }
      } else {
        let ns=Math.max(1,Math.min(span+delta,days.length-origSi));
        // Snap to week boundary
        const endIdx = origSi + ns - 1;
        for (let w = 0; w < weeks.length; w++) {
          const wStart = proposeMode ? w * 7 : days.findIndex(d => d.wn === weeks[w].wn);
          const wEnd = wStart + weeks[w].count - 1;
          if (Math.abs(endIdx - wEnd) <= 1 && wEnd < days.length) { ns = wEnd - origSi + 1; break; }
          if (Math.abs(endIdx - (wEnd + 1)) <= 1 && wEnd + 1 < days.length) { ns = wEnd + 1 - origSi + 1; break; }
        }
        ns = Math.max(1, Math.min(ns, days.length - origSi));
        t.to=days[origSi+ns-1].date;
      }
      saveData();
      render({ keep:true });
    }
  } else if (!moved) {
    highlightTask(taskId);
  }
});
function cancelDrag() {
  if (!drag) return; drag=null;
  document.body.style.cursor=''; document.body.style.userSelect='';
  hideDragTip(); render({ keep:true });
}
function showDragTip(e,text) {
  const tip=document.getElementById('drag-tip');
  tip.textContent=text;
  let x=e.clientX+16, y=e.clientY-36;
  if (x+200>window.innerWidth) x=e.clientX-210;
  tip.style.cssText=`display:block;left:${x}px;top:${y}px`;
}
function hideDragTip() { document.getElementById('drag-tip').style.display='none'; }
