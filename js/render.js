// ═══════════════════════════════════════════════
// RENDER (debounced via rAF)
// ═══════════════════════════════════════════════
let _renderQueued = false, _renderOpts = null;
function render(opts) {
  _renderOpts = opts || _renderOpts || {};
  if (_renderQueued) return;
  _renderQueued = true;
  requestAnimationFrame(() => { _renderQueued = false; _doRender(_renderOpts); _renderOpts = null; });
}
function _doRender(opts) {
  opts = opts||{};
  refreshCalc();
  rebuildCaches();
  autoDelay();

  const sc  = document.getElementById('tlScroll');
  const lb  = document.getElementById('leftBody');
  const sl  = opts.keep && sc ? sc.scrollLeft : null;
  const st  = opts.keep && sc ? sc.scrollTop  : null;
  const lst = opts.keep && lb ? lb.scrollTop  : null;

  const grps = getGrouped(getFiltered());
  pruneSelection();
  renderLeft(grps);
  renderTimeline(grps);
  syncScroll();
  updateBulkBar();

  if (opts.keep && sc) { sc.scrollLeft = sl; sc.scrollTop = st; }
  if (opts.keep && lb) lb.scrollTop = lst;
  if (!opts.keep && !scrollInited && todayIdx > 0 && sc) {
    sc.scrollLeft = Math.max(0, todayIdx*COL - 300);
    scrollInited = true;
  }
}

// ═══════════════════════════════════════════════
// RENDER LEFT — spreadsheet table rows
// ═══════════════════════════════════════════════
function renderLeft(grps) {
  const lb   = document.getElementById('leftBody');
  const flat = grps.flatMap(g => g.tasks);

  let h = '';

  if (!flat.length && !grps.length) {
    // Empty state — only show add-category
    h += `<div class="empty">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
      </svg>
      <p>Chưa có công việc nào</p>
      <button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="openPasteModal('')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1"/>
        </svg>
        Dán danh sách công việc
      </button>
    </div>`;
  }

  grps.forEach(g => {
    // Group header row
    if (groupBy !== 'none') {
      const col = collapsed[g.key];
      h += `<div class="group-row" data-category="${esc(g.key)}" onclick="toggleGroup('${esc(g.key)}')">
        <span class="grp-drag-grip" onmousedown="startCatReorder(event,'${esc(g.key)}')" title="Kéo để di chuyển danh mục">
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="3" cy="2" r="1" fill="currentColor"/><circle cx="7" cy="2" r="1" fill="currentColor"/><circle cx="3" cy="5" r="1" fill="currentColor"/><circle cx="7" cy="5" r="1" fill="currentColor"/><circle cx="3" cy="8" r="1" fill="currentColor"/><circle cx="7" cy="8" r="1" fill="currentColor"/></svg>
        </span>
        <svg class="chev ${col?'collapsed':''}" width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 4l4 4 4-4" stroke="#005C2E" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        </svg>
        <span class="gr-name">${esc(g.key)}</span>
        <span class="gr-count">(${g.tasks.length})</span>
      </div>`;
      if (col) return;
    }

    // Task rows
    g.tasks.forEach(t => {
      if (isTaskHidden(t)) return;
      const st  = t.status || 'todo';
      const fd  = fmtDate(t.from);
      const td  = fmtDate(t.to);
      const level = getTaskLevel(t);
      const hasSub = hasChildren(t.id);
      const isCollapsed = !!collapsedTasks[t.id];
      h += `<div class="task-row${selectedIds.has(t.id)?' selected':''}${level?' subtask':''}" data-id="${t.id}" data-level="${level}">

        <!-- Selection checkbox -->
        <div class="tc tc-sel">
          <input type="checkbox" class="sel-cb" ${selectedIds.has(t.id)?'checked':''}
            onclick="toggleSelect(${t.id}, event)">
        </div>

        <!-- Name (with drag grip + indent) -->
        <div class="tc tc-name">
          <span class="drag-grip" onmousedown="startReorder(event,${t.id})" title="Kéo để sắp xếp">
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="3" cy="2" r="1" fill="currentColor"/><circle cx="7" cy="2" r="1" fill="currentColor"/><circle cx="3" cy="5" r="1" fill="currentColor"/><circle cx="7" cy="5" r="1" fill="currentColor"/><circle cx="3" cy="8" r="1" fill="currentColor"/><circle cx="7" cy="8" r="1" fill="currentColor"/></svg>
          </span>
          ${level>0?`<span class="subtask-indent" style="width:${level*16}px"></span>`:''}
          ${hasSub?`<span class="subtask-toggle${isCollapsed?' collapsed':''}" onclick="event.stopPropagation();toggleTaskCollapse(${t.id})" title="${isCollapsed?'Mở rộng':'Thu gọn'}">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3l3 3.5 3-3.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
          </span>`:`${level>0?'<span class="subtask-dot"></span>':''}`}
          <input class="fi fi-name" type="text"
            value="${esc(t.name)}" placeholder="Tên công việc..."
            data-id="${t.id}" data-field="name" data-orig="${esc(t.name)}"
            onblur="saveIL(this)" onkeydown="ilKey(event,this)"
            title="Name">
        </div>

        <!-- Description -->
        <div class="tc tc-desc">
          <input class="fi fi-desc" type="text"
            value="${esc(t.description||'')}" placeholder="Mô tả..."
            data-id="${t.id}" data-field="description" data-orig="${esc(t.description||'')}"
            onblur="saveIL(this)" onkeydown="ilKey(event,this)"
            title="Description">
        </div>

        <!-- Note -->
        <div class="tc tc-note">
          <input class="fi fi-note" type="text"
            value="${esc(t.notes||'')}" placeholder="Ghi chú..."
            data-id="${t.id}" data-field="notes" data-orig="${esc(t.notes||'')}"
            onblur="saveIL(this)" onkeydown="ilKey(event,this)"
            title="Note">
        </div>

        <!-- PIC -->
        <div class="tc tc-pic">
          <select class="fi fi-pic pic-select" data-id="${t.id}"
            onchange="savePicSelect(this)" title="Main PIC">
            <option value="">— PIC —</option>
            ${picList.map(p => `<option value="${esc(p.name)}"${t.owner===p.name?' selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
          <div class="fill-handle" onmousedown="startFillDrag(event,${t.id},'owner')" title="Kéo xuống để sao chép PIC"></div>
        </div>

        <!-- Status -->
        <div class="tc tc-status">
          <select class="status-select ${STATUS_CLS[st]}" data-id="${t.id}"
            onchange="changeStatus(this)">
            ${STATUS_LIST.map(s => `<option value="${s}"${s===st?' selected':''}>${STATUS_LBL[s]}</option>`).join('')}
          </select>
        </div>

        <!-- Start Date / Week -->
        <div class="tc tc-from">
          ${proposeMode
            ? `<input class="fi fi-daynum" type="number" min="0" value="${t.propFrom != null ? t.propFrom : ''}"
                data-id="${t.id}" data-field="propFrom" placeholder="W"
                onchange="saveProposeWeek(this)" title="Start Week">`
            : `<input class="fi fi-date" type="date" value="${t.from||''}"
                ${t.to?`max="${t.to}"`:''}
                data-id="${t.id}" data-field="from"
                onchange="saveDate(this)" onclick="focusTask(${t.id},'from')" title="Start Date">`}
        </div>

        <!-- End Date / Week -->
        <div class="tc tc-to">
          ${proposeMode
            ? `<input class="fi fi-daynum" type="number" min="0" value="${t.propTo != null ? t.propTo : ''}"
                data-id="${t.id}" data-field="propTo" placeholder="W"
                onchange="saveProposeWeek(this)" title="End Week">`
            : `<input class="fi fi-date" type="date" value="${t.to||''}"
                ${t.from?`min="${t.from}"`:''}
                data-id="${t.id}" data-field="to"
                onchange="saveDate(this)" onclick="focusTask(${t.id},'to')" title="End Date">`}
        </div>

      </div>`;
    });

    // "+ Thêm công việc" and "Dán danh sách" row at bottom of each group
    const cat = groupBy !== 'none' ? g.key : 'Chưa phân loại';
    h += `<div class="add-row-group">
      <div class="add-row" onclick="addTaskInline('${esc(cat)}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Thêm công việc</span>
      </div>
      <div class="add-row paste-btn" onclick="openPasteModal('${esc(cat)}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1"/>
        </svg>
        <span>Dán danh sách</span>
      </div>
    </div>`;
  });

  // "+ Thêm danh mục" row at bottom
  if (groupBy !== 'none') {
    h += `<div class="add-row add-cat-row" id="addCatRow" onclick="addCategoryInline()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Thêm danh mục</span>
    </div>`;
  }

  lb.innerHTML = h;
}

// ═══════════════════════════════════════════════
// RENDER TIMELINE
// ═══════════════════════════════════════════════
function renderTimeline(grps) {
  const inner = document.getElementById('tlInner');
  const W = days.length * COL;

  // Build header rows — adapts to zoom level and propose mode
  let topRow = '', bottomRow = '';

  const multiYear = startYear !== endYear;

  if (proposeMode) {
    // Propose mode: only week numbers, no day row
    topRow = weeks.map(w =>
      `<div class="tl-top-cell" style="width:${w.count*COL}px">W${w.wn}</div>`
    ).join('');
    bottomRow = '';
  } else if (COL >= 30) {
    // Zoom in: Top = weeks, Bottom = days (with date + abbreviation)
    topRow = weeks.map(w =>
      `<div class="tl-top-cell" style="width:${w.count*COL}px">W${w.wn}</div>`
    ).join('');
    bottomRow = days.map((d,i) => {
      const wk=d.dow===0||d.dow===6, td=d.date===todayStr, ms=d.d===1;
      const mlbl = ms ? (d.m===0&&multiYear ? `${MONTHS[d.m]} ${d.y}` : MONTHS[d.m]) : '';
      return `<div class="tl-bot${wk?' wknd':''}${td?' today':''}${ms?' mstart':''}" style="width:${COL}px">
        ${mlbl?`<div class="mlbl">${mlbl}</div>`:''}
        <span class="dn">${d.d}</span><span class="da">${DAYS_ABBR[d.dow]}</span>
        ${td?`<div class="today-dot"></div>`:''}
      </div>`;
    }).join('');
  } else if (COL >= 12) {
    // Medium: Top = months (with year if multi-year), Bottom = weeks
    topRow = months.map(mo => {
      const lbl = multiYear ? `${MONTHS[mo.m]} ${mo.y}` : MONTHS[mo.m];
      return `<div class="tl-top-cell" style="width:${mo.count*COL}px">${lbl}</div>`;
    }).join('');
    bottomRow = weeks.map(w =>
      `<div class="tl-bot" style="width:${w.count*COL}px"><span class="dn">W${w.wn}</span></div>`
    ).join('');
  } else {
    // Zoom out: Top = years, Bottom = months
    const yearMap = {};
    days.forEach(d => { if (!yearMap[d.y]) yearMap[d.y] = 0; yearMap[d.y]++; });
    topRow = Object.entries(yearMap).sort((a,b)=>a[0]-b[0]).map(([y,cnt]) =>
      `<div class="tl-top-cell" style="width:${cnt*COL}px">${y}</div>`
    ).join('');
    bottomRow = months.map(mo =>
      `<div class="tl-bot" style="width:${mo.count*COL}px"><span class="dn">${MONTHS[mo.m]}</span></div>`
    ).join('');
  }

  let bodyH = grps.reduce((a,g) => {
    if (groupBy!=='none') a += GRP_H;
    if (!collapsed[g.key]) {
      const visible = g.tasks.filter(t => !isTaskHidden(t)).length;
      a += visible*ROW + ROW; // +ROW for add-task row
    }
    return a;
  }, 0);
  if (groupBy !== 'none') bodyH += ROW; // add-category row
  bodyH = Math.max(bodyH, 200);

  let rows = '';
  // Weekend shading only when zoomed in enough (not in propose mode)
  if (COL >= 30 && !proposeMode) {
    days.forEach((d,i) => {
      if (d.dow===0||d.dow===6)
        rows += `<div class="wknd-shade" style="left:${i*COL}px;width:${COL}px;height:${bodyH}px"></div>`;
    });
  }
  // Week separator lines
  weeks.forEach(w => {
    const startIdx = getWeekStartIdx(w.wn);
    if (startIdx > 0) {
      rows += `<div class="week-sep" style="left:${startIdx*COL}px;height:${bodyH}px"></div>`;
    }
  });
  // Month separators
  days.forEach((d,i) => {
    if (d.d===1&&i>0)
      rows += `<div class="msep" style="left:${i*COL}px;height:${bodyH}px"></div>`;
  });
  // Today line
  if (todayIdx>=0)
    rows += `<div class="today-line" style="left:${todayIdx*COL}px;height:${bodyH}px"></div>`;

  let y = 0;
  grps.forEach(g => {
    if (groupBy!=='none') { rows += `<div class="tl-grp-bg" style="top:${y}px;height:${GRP_H}px"></div>`; y += GRP_H; }
    if (!collapsed[g.key]) {
      g.tasks.forEach(t => {
        if (isTaskHidden(t)) return;
        rows += `<div class="tl-task-bg" style="top:${y}px;height:${ROW}px"></div>`;
        const bar = barFor(t);
        if (bar) {
          rows += `<div class="task-bar${selectedIds.has(t.id)?' selected':''}"
            style="left:${bar.si*COL+2}px;top:${y+BAR_TOP}px;width:${bar.span*COL-4}px;height:${BAR_H}px;background:${getPicColor(t.owner)}"
            data-id="${t.id}"
            onmouseenter="showTip(event,${t.id})"
            onmouseleave="hideTip()"
            onmousedown="startDrag(event,${t.id})">
            <div class="bar-prog" style="width:${t.pct||0}%"></div>
            <span class="bar-lbl">${esc(t.name)}</span>
            <div class="bar-resize" onmousedown="startResize(event,${t.id})" title="Kéo để đổi End Date"></div>
          </div>`;
        }
        y += ROW;
      });
      y += ROW; // space for add-task row
    }
  });

  inner.innerHTML = `
    <div class="tl-header" style="width:${W}px">
      <div class="tl-top-row" style="width:${W}px">${topRow}</div>
      ${bottomRow ? `<div class="tl-bot-row" style="width:${W}px">${bottomRow}</div>` : ''}
    </div>
    <div class="tl-rows" style="width:${W}px;height:${bodyH}px">${rows}</div>`;
}

// ═══════════════════════════════════════════════
// RENDER YEAR MENU — multi-select checkboxes
// ═══════════════════════════════════════════════
function renderYearMenu() {
  const menu = document.getElementById('yearMenu');
  const label = document.getElementById('yearLabel');
  if (!menu || !label) return;

  // Update button label
  const selArr = [...selectedYears].sort((a,b) => a - b);
  if (selArr.length === 0) {
    label.textContent = 'Year';
  } else if (selArr.length === 1) {
    label.textContent = selArr[0];
  } else {
    // Show range if consecutive, or comma-separated if few
    const isConsecutive = selArr.every((v,i) => i === 0 || v === selArr[i-1]+1);
    label.textContent = isConsecutive
      ? `${selArr[0]}–${selArr[selArr.length-1]}`
      : selArr.join(', ');
  }

  // Build menu items
  menu.innerHTML = availableYears.map(y =>
    `<label class="year-opt${selectedYears.has(y) ? ' active' : ''}">
      <input type="checkbox" ${selectedYears.has(y) ? 'checked' : ''} onchange="toggleYear(${y})">
      <span>${y}</span>
    </label>`
  ).join('');
}

// Scroll sync — bidirectional
function syncScroll() {
  const sc = document.getElementById('tlScroll');
  const lb = document.getElementById('leftBody');
  let syncing = false;
  sc.onscroll = () => { if (syncing) return; syncing = true; lb.scrollTop = sc.scrollTop; syncing = false; };
  lb.onscroll = () => { if (syncing) return; syncing = true; sc.scrollTop = lb.scrollTop; syncing = false; };
}
