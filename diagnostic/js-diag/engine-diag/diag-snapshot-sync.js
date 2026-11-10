/**
 * diagnostic/js-diag/engine-diag/diag-snapshot-sync.js
 * MODULE QUẢN LÝ THỜI GIAN, CLOUD HEARTBEAT (2 PHÚT), SNAPSHOT MỐC (50P/105P/110P) & RETRY QUEUE
 * (BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ TÍNH NĂNG NÀO)
 * - TỰ ĐỘNG CHỤP SNAPSHOT VÀ ĐẨY LÊN GOOGLE DRIVE NGAY TẠI MỐC CHUẨN GIỜ (+5 PHÚT)
 * - CLOUD HEARTBEAT SYNC: ĐỊNH KỲ MỖI 120 GIÂY ÂM THẦM ĐỒNG BỘ TIẾN ĐỘ BÀI LÀM
 * - HÀNG ĐỢI RETRY QUEUE: TỰ ĐỘNG GỬI LẠI GÓI TIN SAU MỖI 15 GIÂY NẾU MẠNG RỚT
 * - CÔNG CỤ ADMIN CONSOLE TUA NHANH THỜI GIAN ĐỂ KIỂM THỬ TỨC THÌ
 */

export const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

export const DIAGNOSTIC_META = {
  test_01: { 
    title: "TEST 1: KHẢO SÁT NỀN TẢNG (45 PHÚT)", 
    targetBand: "0 - 4.5 (Max 5.0)",
    baseMinutes: 45,
    snapshotMinutes: 50,
    snapshotSeconds: 50 * 60 // 3000s
  },
  test_02: { 
    title: "TEST 2: KHẢO THÍ CHUẨN HÓA (100 PHÚT)", 
    targetBand: "4.5 - 6.0 (Max 6.5)",
    baseMinutes: 100,
    snapshotMinutes: 105,
    snapshotSeconds: 105 * 60 // 6300s
  },
  test_03: { 
    title: "TEST 3: THỬ THÁCH ĐỈNH CAO (105 PHÚT)", 
    targetBand: "6.0 - 7.5+",
    baseMinutes: 105,
    snapshotMinutes: 110,
    snapshotSeconds: 110 * 60 // 6600s
  }
};

export class DiagSnapshotSync {
  constructor(masterEngine) {
    this.master = masterEngine;
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.isSnapshotTaken = false;
    this.snapshotOfficialData = null;
    this.cloudRetryQueue = [];
    this.retryInterval = null;
  }

  // =========================================================================
  // 1. ĐỒNG HỒ ĐẾM GIÂY & ĐIỀU PHỐI SNAPSHOT / HEARTBEAT
  // =========================================================================
  startTimer() {
    const meta = DIAGNOSTIC_META[this.master.testId] || DIAGNOSTIC_META.test_01;
    const targetThresholdSec = meta.snapshotSeconds || (50 * 60);
    const disp = document.getElementById('sectionTimerDisplay');

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.master.isReviewMode) return;
      this.timerSeconds++;

      // Cập nhật giao diện đồng hồ
      if (disp) {
        const mm = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
        const ss = String(this.timerSeconds % 60).padStart(2, '0');
        disp.innerText = `${mm}:${ss}`;

        if (this.timerSeconds > meta.baseMinutes * 60) {
          disp.parentElement.style.background = "#FEE2E2";
          disp.parentElement.style.color = "#DC2626";
          disp.parentElement.style.borderColor = "#FCA5A5";
        }
      }

      // 🔴 1. TỰ ĐỘNG CHỤP SNAPSHOT VÀ BẮN THẲNG LÊN GOOGLE DRIVE TẠI PHÚT 50/105/110
      if (!this.isSnapshotTaken && this.timerSeconds === targetThresholdSec) {
        this.takeSilentSnapshotAndSyncCloud();
      }

      // 🔴 2. CLOUD HEARTBEAT: CỨ ĐÚNG MỖI 120 GIÂY (2 PHÚT) TỰ ĐỘNG BẮN TIẾN ĐỘ LÊN DRIVE
      if (this.timerSeconds > 0 && this.timerSeconds % 120 === 0) {
        this.syncHeartbeatToCloud();
      }

      // Lưu số giây vào bản nháp local mỗi 10 giây
      if (this.timerSeconds % 10 === 0) {
        this.master.saveLocalDraft();
      }
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
  }

  // =========================================================================
  // 2. TỰ ĐỘNG CHỤP VÀ BẮN SNAPSHOT CHUẨN GIỜ LÊN GOOGLE DRIVE
  // =========================================================================
  takeSilentSnapshotAndSyncCloud() {
    this.isSnapshotTaken = true;
    const meta = DIAGNOSTIC_META[this.master.testId] || DIAGNOSTIC_META.test_01;

    // Chụp sâu toàn bộ đáp án của 5 kỹ năng tại đúng mốc giờ quy định
    this.snapshotOfficialData = {
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      elapsedSeconds: this.timerSeconds,
      snapshotMinutes: meta.snapshotMinutes,
      grammarAnswers: JSON.parse(JSON.stringify(this.master.getSkillAnswers('grammar'))),
      listeningAnswers: JSON.parse(JSON.stringify(this.master.getSkillAnswers('listening'))),
      readingAnswers: JSON.parse(JSON.stringify(this.master.getSkillAnswers('reading'))),
      writingSnapshot: this.master.getWritingSnapshotData(),
      speakingSnapshot: this.master.getSpeakingSnapshotData()
    };

    try {
      localStorage.setItem(`diag_snapshot_${this.master.testId}`, JSON.stringify(this.snapshotOfficialData));
    } catch (e) {
      console.warn("[SnapshotSync] Không thể lưu snapshot vào LocalStorage:", e);
    }

    // ĐÓNG GÓI BÀI THI MỐC CHUẨN GIỜ VÀ ĐẨY THẲNG LÊN GOOGLE DRIVE
    const studentEmail = localStorage.getItem('ielts_student_email') || 'guest@gmail.com';
    const studentName = localStorage.getItem('ielts_student_name') || 'Học viên';
    const studentId = localStorage.getItem('tram_student_id') || 'TR-GUEST';

    const timedSnapshotAttempt = {
      id: "diag_snap_" + Date.now(),
      timestamp: new Date().toLocaleString('vi-VN'),
      testTitle: `${meta.title} (Mốc Snapshot ${meta.snapshotMinutes} phút)`,
      studentName: studentName,
      studentEmail: studentEmail,
      studentId: studentId,
      score: `Chốt giờ ${meta.snapshotMinutes}p (Đang xử lý)`,
      timeSpent: `${meta.snapshotMinutes} phút`,
      moduleType: "diagnostic",
      pageUrl: `diagnostic/runner-diag.html?testId=${this.master.testId}&set=${this.master.setNum}`,
      statusTag: "official_timed_snapshot", // 🔴 CỜ CHỐT GIỜ CHÍNH THỨC TRÊN CLOUD
      approvalStatus: "pending_admin_approval",
      details: {
        isOvertime: false,
        timeSpent: `${meta.snapshotMinutes} phút`,
        snapshotData: this.snapshotOfficialData
      }
    };

    // BẮN LÊN GOOGLE DRIVE NGAY LẬP TỨC (KHÔNG CẦN CHỜ HỌC SINH BẤM NỘP)
    this.syncAttemptToCloud(timedSnapshotAttempt, "official_timed_snapshot");

    console.log(`[SnapshotSync] ⏱️ ĐÃ CHỤP VÀ BẮN SNAPSHOT PHÚT ${meta.snapshotMinutes} LÊN DRIVE THÀNH CÔNG!`);
    this.showToastNotification(`⏱️ Đã chốt và lưu bài làm chuẩn giờ (${meta.snapshotMinutes} phút) lên hệ thống Thầy.`);
  }

  // =========================================================================
  // 3. CLOUD HEARTBEAT: TỰ ĐỘNG LƯU TIẾN ĐỘ MỖI 2 PHÚT
  // =========================================================================
  syncHeartbeatToCloud() {
    if (this.master.isReviewMode) return;
    const studentEmail = localStorage.getItem('ielts_student_email');
    if (!studentEmail || studentEmail === 'guest@gmail.com') return;

    const draftData = this.master.collectCurrentExamData();
    const heartbeatPayload = {
      id: `draft_${studentEmail}_${this.master.testId}`,
      timestamp: new Date().toLocaleString('vi-VN'),
      testTitle: `${DIAGNOSTIC_META[this.master.testId]?.title || this.master.testId} (Tự lưu 2 phút/lần)`,
      studentName: localStorage.getItem('ielts_student_name') || 'Học viên',
      studentEmail: studentEmail,
      score: "Đang làm bài...",
      timeSpent: `${Math.round(this.timerSeconds / 60)} phút`,
      moduleType: "diagnostic",
      statusTag: "draft_heartbeat", // Cờ tự lưu tiến độ
      details: draftData
    };

    this.syncAttemptToCloud(heartbeatPayload, "draft_heartbeat");
    console.log(`[SnapshotSync] 💓 Cloud Heartbeat: Đã tự lưu bài phút thứ ${Math.round(this.timerSeconds / 60)} lên Drive.`);
  }

  // =========================================================================
  // 4. ĐỒNG BỘ CLOUD VỚI HÀNG ĐỢI RETRY QUEUE CHỐNG RỚT MẠNG
  // =========================================================================
  syncAttemptToCloud(snapshot, tag = "final_submitted") {
    if (!CLOUD_SCRIPT_URL || !snapshot || !snapshot.studentEmail) return;

    fetch(CLOUD_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "save_attempt", attempt: snapshot, tag: tag })
    }).catch(err => {
      console.warn(`[SnapshotSync] Lỗi mạng khi gửi Cloud (${tag}), đưa vào hàng đợi Retry:`, err);
      this.cloudRetryQueue.push({ snapshot, tag });
    });
  }

  initCloudRetryProcessor() {
    clearInterval(this.retryInterval);
    this.retryInterval = setInterval(() => {
      if (this.cloudRetryQueue.length === 0) return;
      const item = this.cloudRetryQueue.shift();
      console.log(`[SnapshotSync] 🔄 Đang thử gửi lại gói tin từ hàng đợi:`, item.tag);
      this.syncAttemptToCloud(item.snapshot, item.tag);
    }, 15000); // Thử lại mỗi 15 giây
  }

  // =========================================================================
  // 5. TOAST NOTIFICATION VÀ CÔNG CỤ CONSOLE CHO ADMIN
  // =========================================================================
  showToastNotification(msg) {
    let toast = document.getElementById('diagSnapshotToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'diagSnapshotToast';
      toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 99999;
        background: #065F46; color: #FFFFFF; font-weight: 800; font-size: 13px;
        padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        border: 1.5px solid #34D399; transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 4000);
  }

  warpTimer(targetSeconds) {
    this.timerSeconds = parseInt(targetSeconds, 10) || 0;
    console.log(`[Admin Warp] ⚡ Đồng hồ đã được tua đến: ${Math.floor(this.timerSeconds / 60)}p ${this.timerSeconds % 60}s (${this.timerSeconds} giây)`);
  }

  warpTimerToSnapshot() {
    const meta = DIAGNOSTIC_META[this.master.testId] || DIAGNOSTIC_META.test_01;
    const targetThresholdSec = meta.snapshotSeconds || 3000;
    this.timerSeconds = Math.max(0, targetThresholdSec - 10);
    const m = Math.floor(this.timerSeconds / 60);
    const s = this.timerSeconds % 60;
    console.log(`[Admin Test] ⚡ ĐÃ TUA ĐỒNG HỒ ĐẾN ${m}:${s < 10 ? '0' : ''}${s}! Đợi đúng 10 giây để quan sát tự snapshot phút ${meta.snapshotMinutes} và bắn file lên Drive.`);
  }
}
