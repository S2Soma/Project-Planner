// ═══════════════════════════════════════════════
// EXPORT / IMPORT (Template-compatible)
// ═══════════════════════════════════════════════

// Status mapping: internal code → English label (matches template)
const STATUS_EXPORT = {
  'todo':'To Do', 'doing':'In Progress', 'done':'Done',
  'blocked':'Blocked', 'hold':'Hold', 'delay':'Delay'
};

// Reverse map: any label/code → internal code
const STATUS_IMPORT = {};
Object.entries(STATUS_EXPORT).forEach(([k, v]) => {
  STATUS_IMPORT[v.toLowerCase()] = k;
  STATUS_IMPORT[k] = k;
});
Object.entries(STATUS_LBL).forEach(([k, v]) => {
  STATUS_IMPORT[v.toLowerCase()] = k;
});
['chưa làm:todo','đang làm:doing','hoàn thành:done','bị chặn:blocked','tạm dừng:hold','trễ hạn:delay']
  .forEach(s => { const [l,c] = s.split(':'); STATUS_IMPORT[l] = c; });
STATUS_IMPORT['tbd'] = 'todo';

// ── Date → Excel serial ──
function dateToSerial(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const epoch = new Date(1899, 11, 30);
  return Math.floor((d - epoch) / 86400000);
}

// ── Color helpers ──
function hexToARGB(hex) { return 'FF' + (hex || '#33B96A').replace('#', ''); }
function lightenARGB(hex, amt) {
  const h = (hex || '#33B96A').replace('#', '');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const lr = Math.min(255, Math.round(r + (255-r)*amt));
  const lg = Math.min(255, Math.round(g + (255-g)*amt));
  const lb = Math.min(255, Math.round(b + (255-b)*amt));
  return 'FF' + [lr,lg,lb].map(c => c.toString(16).padStart(2,'0')).join('');
}

// ── Prompt filename ──
function promptFileName(defaultName, ext) {
  const name = prompt('Nhập tên file:', defaultName);
  if (name === null) return null; // cancelled
  const clean = (name.trim() || defaultName).replace(/[\\/:*?"<>|]/g, '_');
  return clean.endsWith(ext) ? clean : clean + ext;
}

// ── JSON Export ──
function exportData() {
  const defaultName = projectName || `project-plan-${year}`;
  const fileName = promptFileName(defaultName, '.json');
  if (!fileName) { closeExportMenu(); return; }
  const blob = new Blob([JSON.stringify({tasks, version:5}, null, 2)], {type:'application/json'});
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: fileName
  });
  a.click();
  URL.revokeObjectURL(a.href);
  closeExportMenu();
}

// ═══════════════════════════════════════════════
// EXCEL EXPORT — ExcelJS with full styling
// ═══════════════════════════════════════════════
async function exportExcel() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Timeline', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }]
  });

  // ── TC Data brand colors (ARGB) ──
  const C = {
    evergreen:  'FF005C2E', forest:    'FF007A3D', green:     'FF00A651',
    leaf:       'FF33B96A', mint:      'FFE6F7ED', mintDark:  'FFD4F1DE',
    white:      'FFFFFFFF', offwhite:  'FFF9FAFB',
    border:     'FFB0DFC0', borderLt:  'FFD4F1DE',
    grayText:   'FF9CA3AF', darkText:  'FF1F2937',
  };
  const fill  = (argb) => ({ type:'pattern', pattern:'solid', fgColor:{argb} });
  const bdr   = (clr)  => { const s={style:'thin',color:{argb:clr||C.border}}; return {top:s,left:s,bottom:s,right:s}; };

  // Status cell colors
  const SS = {
    'To Do':       { bg:'FFF3F4F6', fg:'FF6B7280' },
    'In Progress': { bg:C.mint,     fg:C.forest },
    'Done':        { bg:'FFD1FAE5', fg:'FF065F46' },
    'Blocked':     { bg:'FFFEE2E2', fg:'FFDC2626' },
    'Hold':        { bg:'FFFEF3C7', fg:'FFD97706' },
    'Delay':       { bg:'FFFCE7F3', fg:'FFBE185D' },
  };

  // ── Group tasks ──
  const catOrder = [], catMap = {};
  tasks.forEach(t => {
    const cat = t.category || 'Chưa phân loại';
    if (!catMap[cat]) { catMap[cat] = []; catOrder.push(cat); }
    catMap[cat].push(t);
  });

  // ── Determine export view mode ──
  const viewMode = zoomIdx >= 9 ? 'week' : zoomIdx >= 6 ? 'month' : 'year';

  // ── Calculate timeline ──
  let workDays = [], numWeeks = 0, todayColIdx = -1;
  const C_TODAY = 'FFFFF0F0', C_TODAY_HD = 'FFFF6B6B';

  if (proposeMode) {
    // Propose: numbered days
    for (let i = 0; i < proposeWeeks * 7; i++) workDays.push({ dayNum: i + 1, wn: Math.floor(i / 7) });
    numWeeks = proposeWeeks;
  } else {
    let minD = null, maxD = null;
    tasks.forEach(t => {
      if (t.from && !t.from.startsWith('day-')) { const d = new Date(t.from+'T00:00:00'); if (!isNaN(d) && (!minD || d < minD)) minD = new Date(d); }
      if (t.to && !t.to.startsWith('day-'))     { const d = new Date(t.to  +'T00:00:00'); if (!isNaN(d) && (!maxD || d > maxD)) maxD = new Date(d); }
    });
    const curYear = new Date().getFullYear();
    if (!minD) minD = new Date(curYear, 0, 6);
    if (!maxD) maxD = new Date(curYear, 11, 28);
    while (minD.getDay() !== 1) minD.setDate(minD.getDate() - 1);
    while (maxD.getDay() !== 5) maxD.setDate(maxD.getDate() + 1);
    const cur = new Date(minD);
    while (cur <= maxD) {
      if (cur.getDay() >= 1 && cur.getDay() <= 5) workDays.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    numWeeks = Math.ceil(workDays.length / 5);
    const todayDateStr = new Date().toISOString().slice(0, 10);
    todayColIdx = workDays.findIndex(d => d instanceof Date && d.toISOString().slice(0, 10) === todayDateStr);
  }

  // ── Build export columns based on view mode ──
  let exCols = []; // { label, workDayIndices[] }
  if (proposeMode) {
    for (let w = 0; w < numWeeks; w++) {
      const indices = [];
      for (let d = 0; d < 7; d++) {
        const idx = w * 7 + d;
        if (idx < workDays.length) indices.push(idx);
      }
      exCols.push({ label: `W${w}`, indices });
    }
  } else if (viewMode === 'week') {
    // Group workdays by ISO week number
    const weekMap = {};
    workDays.forEach((d, i) => {
      if (d instanceof Date) {
        // Get ISO week number
        const tmp = new Date(d); tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7);
        const wn = Math.ceil((((tmp - new Date(tmp.getFullYear(),0,4)) / 86400000) + 1) / 7);
        const key = d.getFullYear() * 100 + wn;
        if (!weekMap[key]) weekMap[key] = { label: `W${String(wn).padStart(2,'0')}`, indices: [] };
        weekMap[key].indices.push(i);
      }
    });
    exCols = Object.values(weekMap);
  } else if (viewMode === 'month') {
    // One column per month
    if (!proposeMode) {
      const monthMap = {};
      workDays.forEach((d, i) => {
        if (d instanceof Date) {
          const key = d.getFullYear() * 12 + d.getMonth();
          if (!monthMap[key]) monthMap[key] = { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, indices: [] };
          monthMap[key].indices.push(i);
        }
      });
      exCols = Object.values(monthMap);
    }
  } else {
    // Year view
    if (!proposeMode) {
      const yearMap = {};
      workDays.forEach((d, i) => {
        if (d instanceof Date) {
          const y = d.getFullYear();
          if (!yearMap[y]) yearMap[y] = { label: String(y), indices: [] };
          yearMap[y].indices.push(i);
        }
      });
      exCols = Object.values(yearMap);
    }
  }

  // Column indices (1-based for ExcelJS)
  const DC  = 9;
  const TNC = DC + exCols.length + 3;

  // ── Column widths ──
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 40;
  ws.getColumn(3).width = 35;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 13;
  ws.getColumn(8).width = 13;
  const colW = viewMode === 'week' ? 8 : viewMode === 'month' ? 14 : 18;
  for (let i = 0; i < exCols.length; i++) ws.getColumn(DC+i).width = colW;
  ws.getColumn(TNC).width = 5;
  ws.getColumn(TNC+1).width = 16;
  ws.getColumn(TNC+2).width = 12;
  ws.getColumn(TNC+3).width = 22;
  ws.getColumn(TNC+4).width = 12;

  // ═══════ ROW 1: date info (skip in propose mode) ═══════
  if (proposeMode) {
    ws.getRow(1).height = 8;
  } else if (viewMode === 'week') {
    ws.getRow(1).height = 38;
    exCols.forEach((col, i) => {
      const firstDay = workDays[col.indices[0]];
      const lastDay = workDays[col.indices[col.indices.length - 1]];
      if (firstDay instanceof Date && lastDay instanceof Date) {
        const cell = ws.getCell(1, DC+i);
        cell.value = `${p2(firstDay.getDate())}/${p2(firstDay.getMonth()+1)}-${p2(lastDay.getDate())}/${p2(lastDay.getMonth()+1)}`;
        const hasToday = col.indices.includes(todayColIdx);
        cell.font = { size: 7, color:{argb: hasToday ? C_TODAY_HD : C.grayText}, bold: hasToday };
        cell.alignment = { horizontal:'center', vertical:'middle' };
        if (hasToday) cell.fill = fill(C_TODAY);
      }
    });
  } else {
    ws.getRow(1).height = 14;
  }
  const tcLbl = ws.getCell(1, TNC);
  tcLbl.value = 'TC TEAM';
  tcLbl.font = { bold:true, size:12, color:{argb:C.evergreen} };

  // ═══════ ROW 2: column labels (skip in propose mode) ═══════
  if (proposeMode) {
    ws.getRow(2).height = 8;
  } else {
    ws.getRow(2).height = 24;
    exCols.forEach((col, i) => {
      const cell = ws.getCell(2, DC+i);
      cell.value = col.label;
      const hasToday = col.indices.includes(todayColIdx);
      cell.fill = fill(hasToday ? C_TODAY_HD : C.forest);
      cell.font = { bold:true, color:{argb:C.white}, size:10 };
      cell.alignment = { horizontal:'center', vertical:'middle' };
      cell.border = bdr(C.evergreen);
    });
  }

  // ═══════ ROW 3: column headers ═══════
  ws.getRow(3).height = 28;
  const hdrStyle = {
    fill: fill(C.evergreen),
    font: { bold:true, color:{argb:C.white}, size:10 },
    alignment: { vertical:'middle', wrapText:true },
    border: bdr(C.evergreen),
  };
  const dateLbl = proposeMode ? 'Start Week' : 'Start Date';
  const dateEndLbl = proposeMode ? 'End Week' : 'End Date';
  [[2,'Task Name'],[3,'Description'],[4,'Note'],[5,'Main PIC'],
   [6,'Status'],[7,dateLbl],[8,dateEndLbl]].forEach(([col,lbl]) => {
    const cell = ws.getCell(3, col);
    cell.value = lbl;
    cell.fill = hdrStyle.fill; cell.font = hdrStyle.font;
    cell.alignment = hdrStyle.alignment; cell.border = hdrStyle.border;
  });
  // Timeline column headers row 3
  exCols.forEach((col, i) => {
    const cell = ws.getCell(3, DC+i);
    cell.value = col.label;
    cell.fill = fill(C.forest);
    cell.font = { bold:true, color:{argb:C.white}, size: 8 };
    cell.alignment = { horizontal:'center', vertical:'middle' };
    cell.border = bdr(C.evergreen);
  });
  // Team headers
  [[TNC,'No.'],[TNC+1,'Name'],[TNC+2,'Role'],[TNC+3,'Email'],[TNC+4,'Note']].forEach(([col,lbl]) => {
    const cell = ws.getCell(3, col);
    cell.value = lbl;
    cell.fill = hdrStyle.fill; cell.font = hdrStyle.font;
    cell.alignment = hdrStyle.alignment; cell.border = hdrStyle.border;
  });

  // ═══════ ROW 4+: category + task rows ═══════
  let r = 4;

  catOrder.forEach(cat => {
    // ── Category header row ──
    ws.getRow(r).height = 26;
    const catCell = ws.getCell(r, 2);
    catCell.value = cat;
    catCell.fill = fill(C.mint);
    catCell.font = { bold:true, color:{argb:C.evergreen}, size:11 };
    catCell.alignment = { vertical:'middle' };
    catCell.border = bdr(C.border);
    for (let c = 3; c <= 8; c++) {
      const cell = ws.getCell(r, c);
      cell.value = ' '; cell.fill = fill(C.mint); cell.border = bdr(C.border);
    }
    for (let i = 0; i < exCols.length; i++) {
      const cell = ws.getCell(r, DC+i);
      cell.value = ' ';
      const hasToday = !proposeMode && exCols[i].indices.includes(todayColIdx);
      cell.fill = fill(hasToday ? C_TODAY : C.mintDark);
      cell.border = bdr(C.borderLt);
    }
    r++;

    // ── Task rows ──
    catMap[cat].forEach((t, idx) => {
      ws.getRow(r).height = 24;
      const bg = idx % 2 === 0 ? C.white : C.offwhite;
      const bd = bdr(C.borderLt);

      // B — Name (indented by level)
      const level = getTaskLevel(t);
      const indent = level > 0 ? '    '.repeat(level) : '';
      const nm = ws.getCell(r, 2);
      nm.value = indent + (t.name || '');
      nm.fill = fill(bg);
      nm.font = { size:10, color:{argb: level > 0 ? 'FF6B7280' : C.darkText}, italic: level > 0 };
      nm.alignment = { vertical:'middle', wrapText:true, indent: level }; nm.border = bd;

      // C — Description
      const dc = ws.getCell(r, 3);
      dc.value = t.description || '';
      dc.fill = fill(bg); dc.font = { size:9, color:{argb:'FF6B7280'} };
      dc.alignment = { vertical:'middle', wrapText:true }; dc.border = bd;

      // D — Note
      const nt = ws.getCell(r, 4);
      nt.value = t.notes || '';
      nt.fill = fill(bg); nt.font = { size:9, color:{argb:'FF6B7280'} };
      nt.alignment = { vertical:'middle', wrapText:true }; nt.border = bd;

      // E — PIC
      const pc = ws.getCell(r, 5);
      pc.value = t.owner || '';
      pc.fill = fill(bg); pc.font = { size:10, color:{argb:C.darkText} };
      pc.alignment = { vertical:'middle' }; pc.border = bd;

      // F — Status (colored)
      const statusLabel = STATUS_EXPORT[t.status] || t.status || '';
      const sc = ws.getCell(r, 6);
      sc.value = statusLabel;
      const ss = SS[statusLabel];
      if (ss) {
        sc.fill = fill(ss.bg);
        sc.font = { bold:true, size:9, color:{argb:ss.fg} };
      } else {
        sc.fill = fill(bg); sc.font = { size:9 };
      }
      sc.alignment = { horizontal:'center', vertical:'middle' }; sc.border = bd;

      // G — Start Date / Week
      const fc = ws.getCell(r, 7);
      if (proposeMode) {
        if (t.propFrom != null) fc.value = `W${t.propFrom}`;
      } else {
        if (t.from) { fc.value = new Date(t.from + 'T00:00:00'); fc.numFmt = 'yyyy-mm-dd'; }
      }
      fc.fill = fill(bg); fc.font = { size:9, color:{argb:C.darkText} };
      fc.alignment = { horizontal:'center', vertical:'middle' }; fc.border = bd;

      // H — End Date / Week
      const tc = ws.getCell(r, 8);
      if (proposeMode) {
        if (t.propTo != null) tc.value = `W${t.propTo}`;
      } else {
        if (t.to) { tc.value = new Date(t.to + 'T00:00:00'); tc.numFmt = 'yyyy-mm-dd'; }
      }
      tc.fill = fill(bg); tc.font = { size:9, color:{argb:C.darkText} };
      tc.alignment = { horizontal:'center', vertical:'middle' }; tc.border = bd;

      // Timeline columns — Gantt bar visualization (grouped by view mode)
      const picColor = getPicColor(t.owner);
      const barColor = hexToARGB(picColor);

      // Determine which workDay indices are in the task range
      const barWorkDaySet = new Set();
      if (proposeMode) {
        const fromW = t.propFrom != null ? t.propFrom : null;
        const toW = t.propTo != null ? t.propTo : null;
        if (fromW != null && toW != null) {
          const startDay = fromW * 7;
          const endDay = (toW + 1) * 7;
          for (let d = startDay; d < endDay && d < workDays.length; d++) barWorkDaySet.add(d);
        }
      } else {
        const fromTime = t.from ? new Date(t.from+'T00:00:00').getTime() : null;
        const toTime = t.to ? new Date(t.to+'T00:00:00').getTime() : null;
        if (fromTime && toTime) {
          workDays.forEach((d, i) => {
            if (d instanceof Date && d.getTime() >= fromTime && d.getTime() <= toTime) barWorkDaySet.add(i);
          });
        }
      }

      for (let i = 0; i < exCols.length; i++) {
        const cell = ws.getCell(r, DC+i);
        cell.value = ' ';
        // Check if any workday in this column group falls in the bar range
        const hasBar = exCols[i].indices.some(idx => barWorkDaySet.has(idx));
        const hasToday = !proposeMode && exCols[i].indices.includes(todayColIdx);
        if (hasBar) {
          cell.fill = fill(barColor);
        } else {
          cell.fill = fill(hasToday ? C_TODAY : bg);
        }
        cell.border = bdr(hasToday ? C_TODAY_HD : C.borderLt);
      }

      r++;
    });
  });

  // ═══════ TEAM TABLE ═══════
  picList.forEach((p, i) => {
    const tr = 4 + i;
    const picARGB = hexToARGB(p.color);
    ws.getCell(tr, TNC).value = i+1;
    ws.getCell(tr, TNC).alignment = { horizontal:'center' };
    ws.getCell(tr, TNC).border = bdr(C.borderLt);
    ws.getCell(tr, TNC).fill = fill(picARGB);
    ws.getCell(tr, TNC+1).value = p.name;
    ws.getCell(tr, TNC+1).font = { size:10, color:{argb:C.darkText} };
    ws.getCell(tr, TNC+1).border = bdr(C.borderLt);
    ws.getCell(tr, TNC+1).fill = fill(picARGB);
    [TNC+2, TNC+3, TNC+4].forEach(c => {
      ws.getCell(tr, c).value = ' ';
      ws.getCell(tr, c).border = bdr(C.borderLt);
    });
  });

  // ═══════ Write & Download ═══════
  const defaultName = projectName || `project-plan-${year}`;
  const fileName = promptFileName(defaultName, '.xlsx');
  if (!fileName) { closeExportMenu(); return; }
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
  closeExportMenu();
}

// ═══════════════════════════════════════════════
// IMPORT ROUTER
// ═══════════════════════════════════════════════
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  // Lưu tên file (bỏ extension) làm tên project
  projectName = file.name.replace(/\.[^.]+$/, '');
  saveProjectName();
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'json') importJSON(file);
  else if (ext === 'xlsx' || ext === 'xls') importExcel(file);
  else alert('Định dạng không hỗ trợ. Vui lòng chọn file .xlsx, .xls hoặc .json');
  e.target.value = '';
}

// ── JSON Import ──
function importJSON(file) {
  const rd = new FileReader();
  rd.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (Array.isArray(d.tasks)) {
        tasks = d.tasks;
        saveData();
        selectedYears.clear(); saveYears();
        scrollInited = false;
        render();
        renderYearMenu();
        alert(`Import thành công ${tasks.length} công việc!`);
      } else alert('File không đúng định dạng.');
    } catch(err) { alert('Lỗi: ' + err.message); }
  };
  rd.readAsText(file);
}

// ═══════════════════════════════════════════════
// EXCEL IMPORT (SheetJS — template + generic)
// ═══════════════════════════════════════════════
function importExcel(file) {
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = new Uint8Array(ev.target.result);
      const wb = XLSX.read(data, {type:'array', cellDates:false});

      // Import PIC sheet if present (generic format)
      if (wb.SheetNames.includes('PIC')) {
        const picRaw = XLSX.utils.sheet_to_json(wb.Sheets['PIC'], {defval:''});
        if (picRaw.length) {
          const pics = picRaw
            .map(row => ({
              name: String(row['Tên PIC'] || row['Name'] || '').trim(),
              color: String(row['Mã màu'] || row['Color'] || '#33B96A').trim()
            }))
            .filter(p => p.name);
          if (pics.length) { picList = pics; savePics(); }
        }
      }

      // Find main sheet
      const sheetName = wb.SheetNames.find(n =>
        n === 'Timeline' || n === 'Công việc' ||
        n.toLowerCase().includes('task') || n.toLowerCase().includes('cong viec')
      ) || wb.SheetNames[0];

      const ws = wb.Sheets[sheetName];
      if (!ws || !ws['!ref']) { alert('File không có dữ liệu!'); return; }
      const range = XLSX.utils.decode_range(ws['!ref']);

      // Find header row & detect format
      let headerRow = -1, isTemplate = false;
      for (let r = 0; r <= Math.min(5, range.e.r); r++) {
        for (let c = 0; c <= Math.min(15, range.e.c); c++) {
          const val = String(ws[XLSX.utils.encode_cell({r,c})]?.v || '').trim().toLowerCase();
          if (val === 'description' || val === 'status' || val === 'main pic') {
            headerRow = r; isTemplate = true; break;
          }
          if (val === 'tên công việc' || val === 'ten cong viec') {
            headerRow = r; isTemplate = false; break;
          }
        }
        if (headerRow >= 0) break;
      }
      if (headerRow < 0) headerRow = 0;

      // Map columns
      const ALIASES = {
        name:        ['project planning','tên công việc','ten cong viec','name','task name'],
        category:    ['danh mục','danh muc','category','nhóm'],
        description: ['description','mô tả','mo ta','desc'],
        notes:       ['note','ghi chú','ghi chu','notes'],
        owner:       ['main pic','người phụ trách','nguoi phu trach','owner','pic'],
        status:      ['status','trạng thái','trang thai'],
        from:        ['start date','ngày bắt đầu','ngay bat dau','from','start'],
        to:          ['end date','ngày kết thúc','ngay ket thuc','to','end'],
        pct:         ['tiến độ (%)','tien do (%)','tiến độ','tien do','progress','pct','%'],
      };
      const colMap = {};
      for (let c = 0; c <= Math.min(range.e.c, 20); c++) {
        const val = String(ws[XLSX.utils.encode_cell({r:headerRow, c})]?.v || '').trim().toLowerCase();
        for (const [field, aliases] of Object.entries(ALIASES)) {
          if (aliases.includes(val) && colMap[field] === undefined) { colMap[field] = c; break; }
        }
      }
      if (colMap.name === undefined) colMap.name = 1;

      // Import team table from template (far-right columns)
      if (isTemplate) {
        let teamNoCol = -1;
        for (let c = Math.max((colMap.to||7)+1, 8); c <= range.e.c; c++) {
          const val = String(ws[XLSX.utils.encode_cell({r:headerRow, c})]?.v || '').trim().toLowerCase();
          if (val === 'no.' || val === 'no') { teamNoCol = c; break; }
        }
        if (teamNoCol >= 0) {
          const importedPics = [];
          for (let r = headerRow+1; r <= range.e.r; r++) {
            const name = String(ws[XLSX.utils.encode_cell({r, c:teamNoCol+1})]?.v || '').trim();
            if (name && name !== ' ') importedPics.push({name, color:'#33B96A'});
          }
          if (importedPics.length) { picList = importedPics; savePics(); }
        }
      }

      // Parse data rows
      let maxId = 0, currentCategory = 'Chưa phân loại';
      const imported = [];

      for (let r = headerRow+1; r <= range.e.r; r++) {
        const name = String(ws[XLSX.utils.encode_cell({r, c:colMap.name})]?.v || '').trim();
        if (!name) continue;

        const rawStatus = colMap.status !== undefined
          ? String(ws[XLSX.utils.encode_cell({r, c:colMap.status})]?.v || '').trim() : '';
        const rawDesc = colMap.description !== undefined
          ? String(ws[XLSX.utils.encode_cell({r, c:colMap.description})]?.v || '').trim() : '';

        // Category detection (template format)
        if (isTemplate && colMap.category === undefined) {
          if ((!rawStatus || rawStatus === ' ') && (!rawDesc || rawDesc === ' ')) {
            currentCategory = name;
            continue;
          }
        }

        maxId++;
        const status = STATUS_IMPORT[rawStatus.toLowerCase()] || 'todo';
        const ownerRaw = colMap.owner !== undefined
          ? String(ws[XLSX.utils.encode_cell({r, c:colMap.owner})]?.v || '').trim() : '';
        const owner = ownerRaw === ' ' ? '' : ownerRaw;
        const notesRaw = colMap.notes !== undefined
          ? String(ws[XLSX.utils.encode_cell({r, c:colMap.notes})]?.v || '').trim() : '';
        const fromRaw = colMap.from !== undefined ? ws[XLSX.utils.encode_cell({r, c:colMap.from})]?.v : null;
        const toRaw   = colMap.to   !== undefined ? ws[XLSX.utils.encode_cell({r, c:colMap.to})]?.v   : null;
        let pctVal = 0;
        if (colMap.pct !== undefined) {
          pctVal = parseInt(ws[XLSX.utils.encode_cell({r, c:colMap.pct})]?.v) || 0;
          pctVal = Math.max(0, Math.min(100, pctVal));
        }
        const category = colMap.category !== undefined
          ? (String(ws[XLSX.utils.encode_cell({r, c:colMap.category})]?.v || '').trim() || currentCategory)
          : currentCategory;

        imported.push({
          id: maxId, name, category,
          description: rawDesc === ' ' ? '' : rawDesc,
          notes: notesRaw === ' ' ? '' : notesRaw,
          owner,
          from: parseExcelDate(fromRaw),
          to:   parseExcelDate(toRaw),
          status,
          pct: status === 'done' ? 100 : pctVal,
          color: getPicColor(owner)
        });
      }

      if (!imported.length) { alert('Không đọc được công việc nào từ file!'); return; }

      // Auto-add unique PICs from owner column into picList
      const existingNames = new Set(picList.map(p => p.name.toLowerCase()));
      imported.forEach(t => {
        if (t.owner && !existingNames.has(t.owner.toLowerCase())) {
          existingNames.add(t.owner.toLowerCase());
          picList.push({ name: t.owner, color: COLORS[(picList.length) % COLORS.length] });
        }
      });
      savePics();
      // Re-assign task colors now that picList is complete
      imported.forEach(t => { t.color = getPicColor(t.owner); });

      tasks = imported;
      saveData();
      selectedYears.clear(); saveYears();
      scrollInited = false;
      render();
      renderPicList();
      renderYearMenu();
      alert(`Import thành công ${imported.length} công việc!`);

    } catch(err) {
      alert('Lỗi đọc file Excel: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── Date Parser ──
function parseExcelDate(val) {
  if (!val || val === ' ') return '';
  if (val instanceof Date) return isNaN(val.getTime()) ? '' : val.toISOString().slice(0,10);
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    return d ? `${d.y}-${p2(d.m)}-${p2(d.d)}` : '';
  }
  const s = String(val).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10);
}

// ── Export Menu Toggle ──
function toggleExportMenu(e) {
  e.stopPropagation();
  document.getElementById('exportMenu').classList.toggle('open');
}
function closeExportMenu() {
  const menu = document.getElementById('exportMenu');
  if (menu) menu.classList.remove('open');
}
document.addEventListener('click', closeExportMenu);
