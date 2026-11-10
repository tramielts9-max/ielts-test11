/**
 * curriculum-system/ui-modules/ui-schedule-tuition.js
 * MODULE ĐỒNG BỘ LỊCH HỌC 1-1, LỚP NHÓM, THEO DÕI HỌC PHÍ & MODAL XIN DỜI LỊCH
 * BẢN FULL ĐẦY ĐỦ 100% - BẢO TOÀN NGUYÊN VẸN MỌI TÍNH NĂNG NGHIỆP VỤ
 * - Tự động đồng bộ lịch học từ Cloud (Hỗ trợ cả lớp 1-1 và lớp nhóm nhiều học viên)
 * - Quản lý gói học phí, cảnh báo hết buổi và tự động lưu cache Offline
 * - Chèn và điều phối Modal popup cho học sinh xin dời lịch kèm lý do
 */

import { CONFIG } from '../../js/config.js';

const CLOUD_SCRIPT_URL = CONFIG?.DRIVE_STORAGE_URL || "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

export class UIScheduleTuitionManager {
  constructor(contextUI) {
    this.context = contextUI;
    this.cachedSchedules = [];
    this.cachedTuition = null;
    this.activeRescheduleEventId = null;

    // Tự động chèn modal popup vào giao diện khi khởi tạo
    this.injectRescheduleModal();
  }

  // =========================================================================
  // 1. ĐỒNG BỘ LỊCH HỌC TỪ CLOUD (CẢ LỚP 1-1 LẪN LỚP NHÓM 2+ HỌC SINH)
  // =========================================================================
  async fetchSchedules(email) {
    const clean = (email || '').toLowerCase().trim();
    if (!CLOUD_SCRIPT_URL || !clean || clean === 'guest') return [];

    try {
      const res = await fetch(CLOUD_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "get_schedules", userEmail: clean })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.events)) {
          this.cachedSchedules = data.events;
          try {
            localStorage.setItem(`ielts_schedules_${clean}`, JSON.stringify(this.cachedSchedules));
          } catch (e) {}
        }
      }
    } catch (e) {
      // Khi mất mạng hoặc Cloud phản hồi chậm, tự động tải từ bộ nhớ đệm Offline
      try {
        const local = localStorage.getItem(`ielts_schedules_${clean}`);
        if (local) this.cachedSchedules = JSON.parse(local);
      } catch (err) {}
    }

    // Tải kèm gói học phí và số buổi còn lại của học sinh
    await this.fetchStudentTuition(clean);
    return this.cachedSchedules;
  }

  // =========================================================================
  // 2. ĐỒNG BỘ GÓI HỌC PHÍ VÀ SỐ BUỔI CÒN LẠI TỪ CLOUD
  // =========================================================================
  async fetchStudentTuition(email) {
    const clean = (email || '').toLowerCase().trim();
    if (!CLOUD_SCRIPT_URL || !clean || clean === 'guest') return null;

    try {
      const res = await fetch(CLOUD_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "get_student_tuition", email: clean })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.tuition) {
          this.cachedTuition = data.tuition;
          try {
            localStorage.setItem(`ielts_tuition_${clean}`, JSON.stringify(this.cachedTuition));
          } catch (e) {}
          return this.cachedTuition;
        }
      }
    } catch (e) {
      // Phòng thủ khi mất kết nối mạng: lấy cache lưu trên máy học sinh
      try {
        const local = localStorage.getItem(`ielts_tuition_${clean}`);
        if (local) this.cachedTuition = JSON.parse(local);
      } catch (err) {}
    }
    return this.cachedTuition;
  }

  // =========================================================================
  // 3. RENDER BANNER HỌC PHÍ & CẢNH BÁO SẮP HẾT BUỔI
  // =========================================================================
  renderTuitionBanner() {
    if (!this.cachedTuition) return '';

    const t = this.cachedTuition;
    const isAlert = typeof t.remainingSessions === 'number' && t.remainingSessions <= 1;

    return `
      <div style="background:${isAlert ? '#FEF2F2' : '#FFFDF5'}; border:2px solid ${isAlert ? '#FECACA' : '#FDE68A'}; border-bottom:4px solid ${isAlert ? '#F87171' : '#F59E0B'}; border-radius:16px; padding:10px 16px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:18px;">💰</span>
          <div>
            <b style="font-size:13.5px; color:#78350F;">GÓI HỌC PHÍ: ${t.packageName || `${t.paidSessions || 0} buổi`}</b>
            <div style="font-size:12px; color:#92400E;">Đã học hoàn thành: <b>${t.completedSessions || 0} buổi</b></div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:13.5px; font-weight:900; color:${isAlert ? '#DC2626' : '#15803D'}; background:${isAlert ? '#FEE2E2' : '#DCFCE7'}; padding:4px 12px; border-radius:10px;">
            ${isAlert ? '⚠️ ' : ''}Còn lại: ${t.remainingSessions ?? 0}/${t.paidSessions ?? 0} buổi
          </span>
          ${isAlert ? '<span style="font-size:12px; font-weight:800; color:#B91C1C;">(Tới hạn đóng phí)</span>' : ''}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 4. CHÈN POPUP MODAL HỌC SINH XIN DỜI LỊCH (DEFENSIVE INJECTION)
  // =========================================================================
  injectRescheduleModal() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('studentRescheduleModal')) return;

    const modalHtml = `
      <div id="studentRescheduleModal" style="display:none; position:fixed; inset:0; z-index:999999; background:rgba(15, 23, 42, 0.75); backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:16px;">
        <div style="background:#FFFFFF; border:3px solid #E8E2D8; border-bottom:7px solid #D3CBC0; border-radius:26px; max-width:460px; width:100%; padding:26px; position:relative; box-shadow:0 20px 40px rgba(0,0,0,0.3); font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
          
          <button type="button" onclick="window.curriculumUI.closeRescheduleModal()" style="position:absolute; top:14px; right:16px; background:#F1ECE6; border:none; width:34px; height:34px; border-radius:50%; font-weight:900; color:#7E7672; cursor:pointer; font-size:16px;">✕</button>

          <div style="width:56px; height:56px; border-radius:50%; background:#FFF4E5; border:3px solid #FCD34D; display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto; font-size:26px;">
            📅
          </div>

          <h3 style="margin:0 0 6px 0; color:#8B1518; font-size:19px; font-weight:900; text-align:center;">
            XIN PHÉP DỜI LỊCH HỌC
          </h3>
          <p id="rescheduleEventInfo" style="margin:0 0 16px 0; font-size:13px; font-weight:700; color:#64748B; text-align:center;">
            Buổi học: Đang tải...
          </p>

          <div style="margin-bottom:14px;">
            <label style="font-size:13px; font-weight:800; color:#1e293b; display:block; margin-bottom:5px;">
              📝 Lý do xin dời lịch: <span style="color:#DC2626;">*</span>
            </label>
            <textarea id="rescheduleReasonInput" placeholder="Ví dụ: Em bị trùng lịch thi học kỳ ở trường..." style="width:100%; box-sizing:border-box; padding:10px 14px; border:2px solid #E8E2D8; border-radius:12px; font-family:inherit; font-weight:700; font-size:13.5px; height:70px; outline:none; resize:none;"></textarea>
          </div>

          <div style="margin-bottom:18px;">
            <label style="font-size:13px; font-weight:800; color:#1e293b; display:block; margin-bottom:5px;">
              ⏰ Đề xuất khung giờ muốn học bù (nếu có):
            </label>
            <input type="text" id="rescheduleSuggestedTimeInput" placeholder="Ví dụ: Tối mai 19:30 hoặc Chủ nhật..." style="width:100%; box-sizing:border-box; padding:10px 14px; border:2px solid #E8E2D8; border-radius:12px; font-family:inherit; font-weight:700; font-size:13.5px; outline:none;">
          </div>

          <button type="button" id="btnSubmitReschedule" onclick="window.curriculumUI.submitRescheduleRequest()" style="background:#8B1518; color:#FFFFFF; border:none; padding:13px 20px; border-radius:14px; font-weight:900; font-size:14.5px; width:100%; cursor:pointer; border-bottom:4px solid #5E0C0E;">
            🚀 Gửi Lời Nhắn Xin Dời Cho Thầy
          </button>
        </div>
      </div>
    `;

    if (document.body) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
  }

  // =========================================================================
  // 5. MỞ & ĐÓNG MODAL XIN DỜI LỊCH
  // =========================================================================
  openRescheduleModal(eventId, title, currentDateTime) {
    this.activeRescheduleEventId = eventId;
    const modal = document.getElementById('studentRescheduleModal');
    const info = document.getElementById('rescheduleEventInfo');
    const reasonInput = document.getElementById('rescheduleReasonInput');
    const timeInput = document.getElementById('rescheduleSuggestedTimeInput');

    if (info) {
      info.innerHTML = `Buổi học: <b style="color:#1e293b;">${title || 'Buổi học'}</b><br>Thời gian hiện tại: <b style="color:#D97706;">${currentDateTime || ''}</b>`;
    }
    if (reasonInput) reasonInput.value = '';
    if (timeInput) timeInput.value = '';
    if (modal) modal.style.display = 'flex';
  }

  closeRescheduleModal() {
    const modal = document.getElementById('studentRescheduleModal');
    if (modal) modal.style.display = 'none';
    this.activeRescheduleEventId = null;
  }

  // =========================================================================
  // 6. GỬI YÊU CẦU DỜI LỊCH LÊN CLOUD VÀ ĐỒNG BỘ GIAO DIỆN HỌC SINH
  // =========================================================================
  async submitRescheduleRequest() {
    const eventId = this.activeRescheduleEventId;
    const reason = document.getElementById('rescheduleReasonInput')?.value?.trim();
    const suggestedTime = document.getElementById('rescheduleSuggestedTimeInput')?.value?.trim();
    const email = this.context?.getActiveWorkingEmail?.() || 'guest';

    if (!reason) {
      alert("⚠️ Em vui lòng ghi lý do xin dời lịch để Thầy nắm được nhé!");
      return;
    }

    const btn = document.getElementById('btnSubmitReschedule');
    if (btn) {
      btn.disabled = true;
      btn.innerText = "⏳ Đang gửi yêu cầu lên máy chủ...";
    }

    try {
      if (CLOUD_SCRIPT_URL) {
        const res = await fetch(CLOUD_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "student_request_reschedule",
            studentEmail: email,
            eventId: eventId,
            reason: reason,
            suggestedTime: suggestedTime
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            alert("🎉 " + data.message);
          } else {
            alert("⚠️ " + (data?.error || "Gửi yêu cầu dời lịch thành công"));
          }
        }
      }

      // Cập nhật ngay trong cache của học sinh để giao diện đổi màu cảnh báo tức thì
      const ev = (this.cachedSchedules || []).find(e => e.id === eventId);
      if (ev) {
        ev.status = 'reschedule_requested';
        ev.rescheduleRequest = { 
          reason, 
          suggestedTime, 
          requestedAt: new Date().toISOString() 
        };
      }

      this.closeRescheduleModal();

      // Gọi lại giao diện lịch để đổi màu thẻ buổi học sang màu đỏ cảnh báo
      if (this.context && this.context.cachedAttempts) {
        this.context.renderTodayHistoryAndCalendar?.(this.context.cachedAttempts, email);
      }

    } catch (e) {
      alert("Lỗi kết nối máy chủ: " + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "🚀 Gửi Lời Nhắn Xin Dời Cho Thầy";
      }
    }
  }
}
