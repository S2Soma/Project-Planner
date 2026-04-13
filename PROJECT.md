# PMM - Project Management Master

## Tổng quan

Ứng dụng web quản lý dự án dạng **Gantt Chart**, xây dựng bằng vanilla JavaScript (không framework). Giao diện gồm bảng spreadsheet bên trái + timeline Gantt bên phải, hỗ trợ kéo thả, chỉnh sửa inline, import/export Excel/JSON.

## Cấu trúc thư mục

```
PMM/
├── index.html          # Trang chính (single-page)
├── css/styles.css      # Toàn bộ CSS
├── template.xlsx       # Template Excel mẫu
└── js/
    ├── constants.js    # Hằng số: zoom levels, màu sắc, status, kích thước cột
    ├── utils.js        # Hàm escape HTML chống XSS
    ├── state.js        # Quản lý state trung tâm + lưu/đọc localStorage
    ├── calendar.js     # Tính toán ngày/tuần/tháng cho timeline
    ├── data.js         # Lọc, nhóm task theo category, tính vị trí Gantt bar
    ├── render.js       # Render bảng trái + timeline, đồng bộ scroll
    ├── inline-edit.js  # Sửa inline: tên, mô tả, ghi chú, status, PIC, thêm/xóa task
    ├── select.js       # Chọn checkbox, Shift+click, bulk delete
    ├── pic-config.js   # Quản lý PIC (người phụ trách): thêm/sửa/xóa, gán màu
    ├── tooltip.js      # Tooltip hiện chi tiết task khi hover Gantt bar
    ├── drag.js         # Kéo thả bar để đổi ngày, resize end date, bulk drag
    ├── io.js           # Import/Export JSON và Excel (ExcelJS + SheetJS)
    ├── panel.js        # Thu gọn/mở rộng panel trái, ẩn/hiện cột, resize
    ├── reorder.js      # Kéo grip để sắp xếp lại thứ tự task/group
    ├── events.js       # Event handlers: zoom (Ctrl+scroll), pan, toggle group
    └── app.js          # Khởi tạo app, load data, apply preferences
```

## Data Model

### Task (công việc)

```javascript
{
  id: number,           // ID duy nhất
  name: string,         // Tên công việc
  category: string,     // Nhóm (VD: "Phân tích", "Thiết kế")
  description: string,  // Mô tả
  notes: string,        // Ghi chú
  owner: string,        // Người phụ trách (PIC)
  from: "YYYY-MM-DD",   // Ngày bắt đầu
  to: "YYYY-MM-DD",     // Ngày kết thúc
  status: string,       // 'todo' | 'doing' | 'done' | 'blocked' | 'hold' | 'delay'
  pct: number,          // Tiến độ (0-100%)
  color: string         // Màu hex (theo PIC)
}
```

### PIC (người phụ trách)

```javascript
{ name: string, color: string }  // VD: { name: "Nguyễn Văn A", color: "#33B96A" }
```

## localStorage Keys

| Key | Nội dung |
|-----|----------|
| `pmm_v5` | Dữ liệu chính: tasks[] + collapsed state |
| `pmm_cols` | Cấu hình ẩn/hiện cột |
| `pmm_pics` | Danh sách PIC + màu |
| `pmm_years` | Các năm đang hiển thị |
| `pmm_panel` | Trạng thái panel (collapsed + width) |

## Tính năng chính

### Timeline Gantt
- **3 chế độ xem**: Week (42px/ngày), Month (14px), Year (3px)
- **Zoom**: Ctrl+scroll hoặc kéo thanh resizer bên phải
- **Pan**: Click kéo để cuộn ngang/dọc
- **Đường Today**: Đường đỏ đánh dấu ngày hiện tại
- **Weekend**: Nền xám cho thứ 7, chủ nhật

### Bảng trái (Spreadsheet)
- **Cột**: Checkbox | Tên | Mô tả | Ghi chú | PIC | Status | Ngày BĐ | Ngày KT
- **Inline edit**: Click vào ô để sửa trực tiếp
- **Ẩn/hiện cột**: Menu toggle cột
- **Resize**: Kéo để thay đổi chiều rộng panel

### Quản lý Task
- Thêm task/category inline
- Xóa task (có xác nhận)
- Đổi status: todo → doing → done (hoặc blocked/hold/delay)
- Tự động đánh dấu **delay** cho task quá hạn
- Kéo Gantt bar để đổi ngày
- Kéo mép phải bar để đổi ngày kết thúc

### Chọn & Thao tác hàng loạt
- Checkbox chọn từng task hoặc chọn tất cả
- Shift+Click để chọn dải
- Bulk delete, bulk drag nhiều task cùng lúc

### PIC (Người phụ trách)
- Panel quản lý PIC ở góc phải dưới
- Thêm/sửa/xóa PIC với color picker
- Màu PIC đồng bộ lên Gantt bar

### Import / Export
- **Export Excel**: File .xlsx có styling, freeze header, Gantt visualization
- **Export JSON**: Backup toàn bộ dữ liệu
- **Import Excel**: Nhận dạng tự động cột (tiếng Việt/Anh), parse date
- **Import JSON**: Khôi phục từ backup

### Sắp xếp lại
- Kéo grip (⋮⋮) để đổi thứ tự task trong/giữa các group
- Hỗ trợ bulk reorder nhiều task đã chọn

## Hằng số quan trọng

```javascript
ZOOM_LEVELS: [3, 4, 6, 8, 10, 14, 18, 24, 32, 42, 56, 72]  // px/ngày
ROW: 36        // Chiều cao hàng task
BAR_H: 20     // Chiều cao Gantt bar
```

**12 màu mặc định cho PIC:**
`#33B96A, #6EE7A0, #FDE047, #F9A8D4, #A3D9C8, #86EFAC, #FCA5A5, #67E8F9, #FDBA74, #7DD3B4, #D9F99D, #FED7AA`

**Status:**
| Code | Label | Màu |
|------|-------|-----|
| `todo` | To Do | Xám |
| `doing` | In Progress | Xanh lá |
| `done` | Done | Xanh đậm |
| `blocked` | Blocked | Đỏ |
| `hold` | Hold | Vàng |
| `delay` | Delay | Hồng |

## Luồng hoạt động

1. **Load** → Đọc localStorage, khởi tạo state
2. **Render** → Tính calendar, nhóm tasks, vẽ bảng + timeline
3. **Tương tác** → Sửa field, kéo bar, reorder, select
4. **Save** → Tự động lưu localStorage sau mỗi thay đổi
5. **Re-render** → Cập nhật giao diện

## Công nghệ

- **Vanilla JS** (không framework)
- **ExcelJS** (export Excel có styling)
- **SheetJS** (import/parse Excel)
- **CSS Flexbox** + custom scrollbar
- **Font**: System fonts (Apple/Segoe/Roboto)
- **Màu chủ đạo**: Xanh lá TC Data (#00A651, #007A3D, #005C2E)
