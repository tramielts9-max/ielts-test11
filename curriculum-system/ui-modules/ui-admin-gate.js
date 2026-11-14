/**
 * curriculum-system/ui-modules/ui-admin-gate.js
 * MODULE PHÂN QUYỀN ADMIN & ĐÓNG VAI IMPERSONATION (ĐÃ GỠ BỎ TÍNH NĂNG KHÓA HỌC VIÊN)
 * - Giữ nguyên toàn bộ phân quyền Admin tối cao
 * - Giữ nguyên cơ chế đóng vai học sinh (Impersonation) xem sạch dữ liệu thực tế
 * - Gỡ bỏ toàn bộ logic tạm khóa / chặn quyền truy cập Cloud của học viên
 */

import { CONFIG } from '../../js/config.js';

const CLOUD_SCRIPT_URL = CONFIG?.DRIVE_STORAGE_URL || "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

// 👑 DANH SÁCH EMAIL CÓ QUYỀN ADMIN TỐI CAO BẤT KHẢ XÂM PHẠM
export const HARDCODED_ADMIN_EMAILS = [
  "tramielts9@gmail.com",
  "dinhnguyenphuc019.2@gmail.com"
];

export class UIAdminGateManager {
  constructor(contextUI) {
    // contextUI là tham chiếu tới Gateway chính để gọi hàm render lại khi cần
    this.context = contextUI;
    this.studentLockCache = {};
  }

  // =========================================================================
  // 1. KIỂM TRA PHÂN QUYỀN & PHIÊN ĐĂNG NHẬP ADMIN
  // =========================================================================
  isImpersonating() {
    try {
      return !!localStorage.getItem('ielts_impersonating_email');
    } catch (e) {
      return false;
    }
  }

  getOriginalAdminEmail() {
    try {
      return localStorage.getItem('ielts_admin_backup_email') || 'tramielts9@gmail.com';
    } catch (e) {
      return 'tramielts9@gmail.com';
    }
  }

  checkIsAdmin() {
    if (this.isImpersonating()) return true;

    try {
      const currentEmail = (localStorage.getItem('ielts_student_email') || '').toLowerCase().trim();
      const backupEmail = (localStorage.getItem('ielts_admin_backup_email') || '').toLowerCase().trim();

      const allAdminList = [
        ...HARDCODED_ADMIN_EMAILS,
        ...(CONFIG?.ADMIN_EMAILS || []).map(e => e.toLowerCase())
      ];

      const isMatch = currentEmail.includes('admin') ||
                      backupEmail.includes('admin') ||
                      allAdminList.includes(currentEmail) ||
                      allAdminList.includes(backupEmail);

      return isMatch;
    } catch (e) {
      return false;
    }
  }

  getActiveWorkingEmail() {
    try {
      if (this.isImpersonating()) {
        return (localStorage.getItem('ielts_impersonating_email') || '').toLowerCase().trim();
      }
      if (this.checkIsAdmin() && this.context?.targetStudentEmail) {
        return this.context.targetStudentEmail.toLowerCase().trim();
      }
      return (localStorage.getItem('ielts_student_email') || 'guest').toLowerCase().trim();
    } catch (e) {
      return 'guest';
    }
  }

  // =========================================================================
  // 2. CHẾ ĐỘ ĐÓNG VAI HỌC VIÊN (IMPERSONATION)
  // =========================================================================
  async startImpersonation(studentEmail) {
    const clean = (studentEmail || '').toLowerCase().trim();
    if (!clean || clean === 'guest') {
      alert("⚠️ Vui lòng nhập email học viên hợp lệ!");
      return;
    }

    try {
      const currentAdmin = localStorage.getItem('ielts_student_email') || 'tramielts9@gmail.com';
      if (!localStorage.getItem('ielts_admin_backup_email')) {
        localStorage.setItem('ielts_admin_backup_email', currentAdmin);
      }
      localStorage.setItem('ielts_impersonating_email', clean);
      localStorage.setItem('ielts_student_email', clean);
      
      if (this.context) {
        this.context.targetStudentEmail = clean;
        await this.context.fetchStudentRoadmapFromCloud?.(clean);
        await this.context.fetchStudentHistoryFromCloud?.(clean);
        await this.context.fetchSchedules?.(clean);
      }

      alert(`🎭 Đã chuyển sang chế độ điều khiển tài khoản học viên: ${clean}`);
      window.location.reload();
    } catch (e) {
      console.error("Lỗi khi chuyển tài khoản:", e);
      window.location.reload();
    }
  }

  stopImpersonation() {
    try {
      const backup = this.getOriginalAdminEmail();
      localStorage.setItem('ielts_student_email', backup);
      localStorage.removeItem('ielts_impersonating_email');
      localStorage.removeItem('ielts_admin_backup_email');
      if (this.context) {
        this.context.targetStudentEmail = '';
        this.context.isForceEditing = false;
      }
      alert("⬅ Đã thoát khỏi tài khoản học viên. Trở về quyền Quản trị viên!");
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  }

  // =========================================================================
  // 3. MỞ KHÓA TRUY CẬP MẶC ĐỊNH (ĐÃ GỠ BỎ TÍNH NĂNG KHÓA HỌC VIÊN)
  // =========================================================================
  async checkStudentAccess(email) {
    const clean = (email || '').toLowerCase().trim();
    if (clean) {
      this.studentLockCache[clean] = true;
    }
    return true;
  }

  async toggleStudentLock(studentEmail, newStatus) {
    const clean = (studentEmail || '').toLowerCase().trim();
    if (clean) {
      this.studentLockCache[clean] = true;
    }
    alert("🔓 Hệ thống đã gỡ bỏ toàn bộ tính năng khóa. Mọi học viên đều có quyền truy cập tự do.");
    this.context?.render?.();
  }

  async checkReentry() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  // =========================================================================
  // 4. RENDER THANH ĐIỀU PHỐI ADMIN & THANH THÔNG BÁO NỔI IMPERSONATION
  // =========================================================================
  renderAdminControlBar() {
    if (!this.checkIsAdmin() && !this.isImpersonating()) return '';

    const currentTarget = this.context?.targetStudentEmail || 'Chính mình (Mặc định)';

    return `
      <div style="background:#8B1518; color:white; border-radius:14px; padding:12px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; box-shadow:0 3px 0 #5E0C0E;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">👑</span>
          <div>
            <b style="font-size:14px;">BẢNG ĐIỀU PHỐI GIÁO VIÊN / ADMIN</b>
            <div style="font-size:12px; opacity:0.9;">
              Đang can thiệp cho: <b style="color:#FCD34D;">${currentTarget}</b>
            </div>
          </div>
        </div>
        
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <input type="email" id="adminTargetEmailInput" placeholder="Nhập email học sinh..." value="${this.context?.targetStudentEmail || ''}" style="padding:7px 12px; border-radius:8px; border:none; font-size:13px; font-weight:700; width:210px; color:#1e293b;">
          
          <button type="button" onclick="window.curriculumUI.setTargetStudentEmail(document.getElementById('adminTargetEmailInput').value)" style="background:#FCD34D; color:#8B1518; border:none; padding:7px 12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer;">
            🎯 Chọn HS
          </button>

          <button type="button" onclick="window.curriculumUI.triggerEditRoadmap()" style="background:#3B82F6; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer;" title="Mở lại form để điều chỉnh hoặc dùng AI">
            ✏️ Soạn Lại
          </button>

          <button type="button" onclick="window.curriculumUI.startImpersonation(document.getElementById('adminTargetEmailInput').value || '${this.context?.targetStudentEmail || ''}')" style="background:#10B981; color:white; border:none; padding:7px 12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer;" title="Nhảy thẳng vào tài khoản học sinh để xem dữ liệu sạch">
            🎭 Đóng vai HS &rarr;
          </button>

          ${this.context?.targetStudentEmail ? `
            <button type="button" onclick="window.curriculumUI.setTargetStudentEmail('')" style="background:rgba(255,255,255,0.2); color:white; border:1px solid rgba(255,255,255,0.4); padding:7px 10px; border-radius:8px; font-size:12px; cursor:pointer;">
              ✕ Bỏ chọn
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderFloatingImpersonationBar() {
    if (!this.isImpersonating()) return '';
    const activeEmail = this.getActiveWorkingEmail();

    return `
      <div style="position:fixed; bottom:16px; right:16px; z-index:99999; background:#DC2626; color:white; padding:12px 20px; border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,0.3); border:2px solid #FEF2F2; display:flex; align-items:center; gap:14px; font-weight:800; font-size:13px;">
        <div>
          <span>🎭 ĐANG ĐÓNG VAI:</span> <u style="color:#FEF08A;">${activeEmail}</u>
          <div style="font-size:11px; opacity:0.9; font-weight:600;">Lịch sử bài làm hiển thị chính xác của học viên</div>
        </div>
        <button type="button" onclick="window.curriculumUI.stopImpersonation()" style="background:#FFFFFF; color:#DC2626; border:none; padding:7px 16px; border-radius:10px; font-weight:900; font-size:12.5px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2);">
          ⬅ Thoát về Admin
        </button>
      </div>
    `;
  }
}
