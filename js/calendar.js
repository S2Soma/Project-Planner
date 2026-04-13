// ═══════════════════════════════════════════════
// CALENDAR MATH
// ═══════════════════════════════════════════════
const isLeap = y => (y%4===0&&y%100!==0)||y%400===0;
const DIM    = (m,y) => [31,isLeap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m];
const p2     = n => String(n).padStart(2,'0');

// Format date "2025-01-10" → "10-Jan"
function fmtDate(s) {
  if (!s) return '';
  const [,, dd] = s.split('-');
  const m = parseInt(s.split('-')[1]) - 1;
  return `${parseInt(dd)}-${MONTHS[m]}`;
}

// Build days array spanning startY → endY (full years)
function buildDays(sY, eY) {
  const arr = []; let wn = 1;
  for (let y = sY; y <= eY; y++)
    for (let m = 0; m < 12; m++)
      for (let d = 1; d <= DIM(m,y); d++) {
        const dow = new Date(y,m,d).getDay();
        if (y===sY && m===0 && d===1) wn=1; else if (dow===1) wn++;
        arr.push({ y, m, d, dow, wn, date:`${y}-${p2(m+1)}-${p2(d)}` });
      }
  return arr;
}

function buildWeeks(days) {
  const map = {};
  days.forEach(d => {
    if (!map[d.wn]) map[d.wn] = { wn:d.wn, count:0, sd:d.d, sm:d.m, ed:d.d, em:d.m };
    map[d.wn].count++;
    map[d.wn].ed = d.d;
    map[d.wn].em = d.m;
  });
  return Object.values(map).sort((a,b) => a.wn-b.wn);
}

// Group by year+month so multi-year months stay separate
function buildMonths(days) {
  const map = {};
  days.forEach(d => {
    const key = d.y * 12 + d.m;
    if (!map[key]) map[key] = { y:d.y, m:d.m, count:0 };
    map[key].count++;
  });
  return Object.values(map).sort((a,b) => (a.y*12+a.m) - (b.y*12+b.m));
}

function refreshCalc() {
  // Auto-calculate date range from task dates
  let minY = null, maxY = null;
  tasks.forEach(t => {
    [t.from, t.to].forEach(dt => {
      if (!dt) return;
      const y = parseInt(dt.slice(0,4));
      if (isNaN(y)) return;
      if (!minY || y < minY) minY = y;
      if (!maxY || y > maxY) maxY = y;
    });
  });

  const curYear = new Date().getFullYear();

  // Build available years list (task range ± 1, at least current & next)
  const lo = minY ? Math.min(minY, curYear) - 1 : curYear - 1;
  const hi = maxY ? Math.max(maxY, curYear) + 3 : curYear + 3;
  availableYears = [];
  for (let y = lo; y <= hi; y++) availableYears.push(y);

  // Auto-populate selectedYears if empty
  if (selectedYears.size === 0) {
    if (!minY) {
      selectedYears.add(curYear);
      selectedYears.add(curYear + 1);
    } else {
      for (let y = minY; y <= maxY; y++) selectedYears.add(y);
    }
    saveYears();
  }

  // Use selectedYears to determine display range
  const selArr = [...selectedYears].sort((a,b) => a - b);
  startYear = selArr[0];
  endYear   = selArr[selArr.length - 1];
  year = startYear; // backward compat for export filenames

  days     = buildDays(startYear, endYear);
  todayStr = new Date().toISOString().slice(0,10);
  COL      = ZOOM_LEVELS[zoomIdx];
  weeks    = buildWeeks(days);
  months   = buildMonths(days);
  todayIdx = days.findIndex(d => d.date === todayStr);
}
