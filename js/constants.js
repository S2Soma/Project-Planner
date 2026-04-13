// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
let   COL     = 42;
const ROW     = 36;   // px — matches CSS --row-h
const ZOOM_LEVELS = [3, 4, 6, 8, 10, 14, 18, 24, 32, 42, 56, 72];
const GRP_H   = 36;   // px — matches CSS --grp-h
const BAR_H   = 20;   // Gantt bar height
const BAR_TOP = Math.floor((ROW - BAR_H) / 2); // 8px

const MONTHS    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_ABBR = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const COLORS    = ['#33B96A','#6EE7A0','#FDE047','#F9A8D4','#A3D9C8','#86EFAC',
                   '#FCA5A5','#67E8F9','#FDBA74','#7DD3B4','#D9F99D','#FED7AA'];

const STATUS_LIST  = ['todo','doing','done','blocked','hold','delay'];
const STATUS_LBL   = {todo:'To Do', doing:'In Progress', done:'Done', blocked:'Blocked', hold:'Hold', delay:'Delay'};
const STATUS_CLS   = {todo:'s-todo', doing:'s-doing', done:'s-done', blocked:'s-blocked', hold:'s-hold', delay:'s-delay'};
