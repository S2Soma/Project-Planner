// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let tasks = [], year = new Date().getFullYear();
let startYear = year, endYear = year;
let groupBy = 'category', collapsed = {};
let days = [], weeks = [], months = [], todayStr = '', todayIdx = -1;
let drag = null, scrollInited = false;
let selectedIds = new Set();
let zoomIdx = 9;  // index into ZOOM_LEVELS → default 42px (week)
let colVisible = { desc:true, note:true, pic:true, status:true, from:true, to:true };
let picList = []; // [{name, color}]
let projectName = '';
let selectedYears = new Set();
let availableYears = [];
let proposeMode = false;
let proposeWeeks = 12;

const COL_WIDTHS = { sel:28, name:190, desc:130, note:90, pic:90, status:90, from:72, to:72 };

// ═══════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════
function loadData() {
  try {
    const s = localStorage.getItem('pmm_v5');
    if (s) { const d = JSON.parse(s); tasks = d.tasks||[]; collapsed = d.collapsed||{}; }
    else tasks = sampleTasks();
  } catch(e) { tasks = sampleTasks(); }
  try {
    const cv = localStorage.getItem('pmm_cols');
    if (cv) colVisible = JSON.parse(cv);
  } catch(e) {}
  try {
    const pl = localStorage.getItem('pmm_pics');
    if (pl) picList = JSON.parse(pl);
  } catch(e) {}
  try {
    const sy = localStorage.getItem('pmm_years');
    if (sy) selectedYears = new Set(JSON.parse(sy));
  } catch(e) {}
  try {
    const pn = localStorage.getItem('pmm_projectName');
    if (pn) projectName = pn;
  } catch(e) {}
  try {
    const pm = localStorage.getItem('pmm_propose');
    if (pm) { const d = JSON.parse(pm); proposeMode = !!d.mode; proposeWeeks = d.weeks || 12; }
  } catch(e) {}
}
function savePropose() {
  localStorage.setItem('pmm_propose', JSON.stringify({ mode: proposeMode, weeks: proposeWeeks }));
}
function saveProjectName() {
  localStorage.setItem('pmm_projectName', projectName);
}
function saveData() {
  localStorage.setItem('pmm_v5', JSON.stringify({ tasks, collapsed }));
}
function savePics() {
  localStorage.setItem('pmm_pics', JSON.stringify(picList));
}
function saveYears() {
  localStorage.setItem('pmm_years', JSON.stringify([...selectedYears]));
}
function getPicColor(owner) {
  if (!owner) return '#33B96A';
  const p = picList.find(p => p.name === owner);
  return p ? p.color : '#33B96A';
}

function sampleTasks() {
  const y = new Date().getFullYear();
  return [
    {id:1,  name:'Khảo sát & thu thập yêu cầu',   category:'Phân tích',  description:'Phỏng vấn stakeholders, thu thập yêu cầu nghiệp vụ', notes:'Ưu tiên Product Owner',        from:`${y}-01-06`,to:`${y}-01-24`,color:'#33B96A',pct:100,status:'done',   owner:'Nguyễn Văn A'},
    {id:2,  name:'Phân tích nghiệp vụ',             category:'Phân tích',  description:'Viết tài liệu đặc tả yêu cầu (SRS)',                  notes:'Review cùng BA trưởng',        from:`${y}-01-20`,to:`${y}-02-07`,color:'#67E8F9',pct:90, status:'doing',  owner:'Trần Thị B'},
    {id:3,  name:'Thiết kế kiến trúc hệ thống',     category:'Thiết kế',   description:'Microservices, API gateway',                           notes:'Confirm tech stack với CTO',   from:`${y}-02-03`,to:`${y}-02-21`,color:'#6EE7A0',pct:75, status:'doing',  owner:'Lê Văn C'},
    {id:4,  name:'Thiết kế UI/UX',                  category:'Thiết kế',   description:'Wireframe & prototype trên Figma',                     notes:'Feedback KH sau Sprint 1',     from:`${y}-02-10`,to:`${y}-03-07`,color:'#FDE047',pct:60, status:'doing',  owner:'Phạm Thị D'},
    {id:5,  name:'Thiết kế Database',               category:'Thiết kế',   description:'ERD, schema, migration scripts',                       notes:'',                             from:`${y}-02-17`,to:`${y}-03-07`,color:'#D9F99D',pct:55, status:'doing',  owner:'Lê Văn C'},
    {id:6,  name:'Phát triển Backend API',           category:'Phát triển', description:'REST API, auth, business logic',                       notes:'Node.js + PostgreSQL',         from:`${y}-03-03`,to:`${y}-05-16`,color:'#A3D9C8',pct:40, status:'doing',  owner:'Nguyễn Văn A'},
    {id:7,  name:'Phát triển Frontend',              category:'Phát triển', description:'React + TypeScript',                                   notes:'Tích hợp Design System',       from:`${y}-03-17`,to:`${y}-06-06`,color:'#F9A8D4',pct:30, status:'doing',  owner:'Trần Thị B'},
    {id:8,  name:'Tích hợp hệ thống',               category:'Phát triển', description:'Kết nối module & third-party APIs',                    notes:'',                             from:`${y}-05-05`,to:`${y}-06-13`,color:'#FED7AA',pct:10, status:'todo',   owner:'Lê Văn C'},
    {id:9,  name:'Kiểm thử đơn vị',                 category:'Kiểm thử',   description:'Unit test — target coverage > 80%',                    notes:'Jest + RTL',                   from:`${y}-04-14`,to:`${y}-05-23`,color:'#86EFAC',pct:20, status:'doing',  owner:'Phạm Thị D'},
    {id:10, name:'Kiểm thử tích hợp',               category:'Kiểm thử',   description:'Integration & E2E test',                               notes:'Cypress',                      from:`${y}-05-26`,to:`${y}-06-20`,color:'#FCA5A5',pct:0,  status:'todo',   owner:'Phạm Thị D'},
    {id:11, name:'Kiểm thử UAT',                    category:'Kiểm thử',   description:'Nghiệm thu với khách hàng',                            notes:'Cần môi trường UAT riêng',     from:`${y}-06-16`,to:`${y}-07-04`,color:'#FDBA74',pct:0,  status:'todo',   owner:'Nguyễn Văn A'},
    {id:12, name:'Chuẩn bị triển khai',             category:'Triển khai', description:'AWS setup, CI/CD pipeline',                            notes:'',                             from:`${y}-06-30`,to:`${y}-07-18`,color:'#7DD3B4',pct:0,  status:'todo',   owner:'Lê Văn C'},
    {id:13, name:'Go-live & đào tạo người dùng',    category:'Triển khai', description:'Deploy production, training end-users',                 notes:'Chuẩn bị tài liệu hướng dẫn', from:`${y}-07-14`,to:`${y}-07-31`,color:'#6EE7A0',pct:0,  status:'todo',   owner:'Trần Thị B'},
  ];
}
