/**
 * diagnostic/js-diag/engine-diag/diag-draft-storage.js
 * MODULE TỰ ĐỘNG LƯU BÀI REALTIME & PHỤC HỒI NGUYÊN VẸN KHI F5 / CÚP ĐIỆN
 * (BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ TÍNH NĂNG NÀO)
 * - TỰ ĐỘNG BẮT SỰ KIỆN GÕ PHÍM, CLICK TRẮC NGHIỆM VÀ SẮP ĐÓNG TRANG
 * - BỘ ĐỆM DEBOUNCE 1S GIÚP MÁY HỌC SINH CHẠY ÊM, KHÔNG NGHẼN BỘ NHỚ
 * - PHỤC HỒI CHÍNH XÁC ĐÁP ÁN CẢ 5 KỸ NĂNG VÀ ĐỒNG HỒ ĐẾM GIÂY
 * - BỌC PHÒNG THỦ AN TOÀN TRÁNH TRẮNG MÀN HÌNH NẾU DỮ LIỆU CŨ BỊ LỖI
 */

import { diagGrammarEngine } from '../diag-grammar.js';
import { diagListeningEngine } from '../diag-listening.js';
import { diagReadingEngine } from '../diag-reading.js';
import { diagWritingEngine } from '../diag-writing.js';
import { diagSpeakingEngine } from '../diag-speaking.js';

export class DiagDraftStorage {
  constructor(masterEngine) {
    this.master = masterEngine;
    this._autoSaveTimer = null;
    this.DRAFT_EXPIRY_MS = 12 * 3600 * 1000; // Nháp có hiệu lực trong 12 tiếng
  }

  // =========================================================================
  // 1. KÍCH HOẠT CÁC BỘ LẮNG NGHE TỰ LƯU KHI HỌC SINH TƯƠNG TÁC
  // =========================================================================
  initAutoSaveListeners() {
    // Tự lưu khi học sinh gõ chữ vào bất kỳ ô input / textarea nào
    window.addEventListener('input', () => this.debounceAutoSave());
    
    // Tự lưu ngay khi click chọn trắc nghiệm / radio / checkbox
    window.addEventListener('change', () => this.saveLocalDraft());
    
    // Tự lưu khẩn cấp trước khi học sinh bấm F5 hoặc đóng tab trình duyệt
    window.addEventListener('beforeunload', () => this.saveLocalDraft());
  }

  debounceAutoSave() {
    clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      this.saveLocalDraft();
    }, 1000);
  }

  // =========================================================================
  // 2. LƯU BẢN NHÁP REALTIME VÀO LOCAL STORAGE
  // =========================================================================
  saveLocalDraft() {
    if (this.master.isReviewMode) return;
    
    try {
      const currentSeconds = this.master.snapshotSync 
        ? this.master.snapshotSync.timerSeconds 
        : (this.master.timerSeconds || 0);

      const isSnapshotTaken = this.master.snapshotSync 
        ? this.master.snapshotSync.isSnapshotTaken 
        : false;

      const snapshotOfficialData = this.master.snapshotSync 
        ? this.master.snapshotSync.snapshotOfficialData 
        : null;

      const draft = {
        testId: this.master.testId,
        setNum: this.master.setNum,
        timerSeconds: currentSeconds,
        isSnapshotTaken: isSnapshotTaken,
        snapshotOfficialData: snapshotOfficialData,
        grammarAnswers: diagGrammarEngine?.userAnswers || {},
        listeningAnswers: diagListeningEngine?.userAnswers || {},
        readingAnswers: diagReadingEngine?.userAnswers || {},
        writingAnswers: diagWritingEngine?.userAnswers || {},
        speakingAnswers: diagSpeakingEngine?.userAnswers || {},
        savedAt: Date.now()
      };

      localStorage.setItem(`diag_active_draft_${this.master.testId}`, JSON.stringify(draft));
    } catch (e) {
      console.warn("[DraftStorage] Không thể ghi nháp vào LocalStorage (có thể do đầy bộ nhớ):", e);
    }
  }

  // =========================================================================
  // 3. PHỤC HỒI NGUYÊN VẸN BÀI LÀM CŨ KHI BỊ F5 HOẶC MẤT ĐIỆN
  // =========================================================================
  restoreLocalDraft() {
    try {
      const raw = localStorage.getItem(`diag_active_draft_${this.master.testId}`);
      if (!raw) return;

      const draft = JSON.parse(raw);
      if (!draft || draft.testId !== this.master.testId) return;

      // Phòng thủ: Chỉ khôi phục bài làm nếu bản nháp được tạo trong vòng 12 tiếng
      if (Date.now() - (draft.savedAt || 0) > this.DRAFT_EXPIRY_MS) {
        console.log("[DraftStorage] Bản nháp đã quá 12 tiếng, bỏ qua để học sinh làm bài mới.");
        return;
      }

      // 1. Phục hồi đồng hồ và cờ snapshot mốc chuẩn giờ
      if (this.master.snapshotSync) {
        this.master.snapshotSync.timerSeconds = draft.timerSeconds || 0;
        this.master.snapshotSync.isSnapshotTaken = !!draft.isSnapshotTaken;
        this.master.snapshotSync.snapshotOfficialData = draft.snapshotOfficialData || null;
      }
      this.master.timerSeconds = draft.timerSeconds || 0;

      // 2. Phục hồi đáp án Ngữ pháp
      if (draft.grammarAnswers && diagGrammarEngine) {
        diagGrammarEngine.userAnswers = draft.grammarAnswers;
        if (typeof diagGrammarEngine.restoreUserInputsUI === 'function') {
          diagGrammarEngine.restoreUserInputsUI();
        }
      }

      // 3. Phục hồi đáp án Listening
      if (draft.listeningAnswers && diagListeningEngine) {
        diagListeningEngine.userAnswers = draft.listeningAnswers;
        if (diagListeningEngine.parts && diagListeningEngine.parts[0] && typeof diagListeningEngine.restoreUserInputsUI === 'function') {
          diagListeningEngine.restoreUserInputsUI(diagListeningEngine.parts[0]);
        }
      }

      // 4. Phục hồi đáp án Reading
      if (draft.readingAnswers && diagReadingEngine) {
        diagReadingEngine.userAnswers = draft.readingAnswers;
        if (typeof diagReadingEngine.restoreUserInputsUI === 'function') {
          diagReadingEngine.restoreUserInputsUI();
        }
      }

      // 5. Phục hồi đáp án Writing
      if (draft.writingAnswers && diagWritingEngine) {
        diagWritingEngine.userAnswers = draft.writingAnswers;
        if (typeof diagWritingEngine.restoreUserInputs === 'function') {
          diagWritingEngine.restoreUserInputs();
        }
      }

      // 6. Phục hồi đáp án Speaking
      if (draft.speakingAnswers && diagSpeakingEngine) {
        diagSpeakingEngine.userAnswers = draft.speakingAnswers;
        if (typeof diagSpeakingEngine.restoreUserTranscripts === 'function') {
          diagSpeakingEngine.restoreUserTranscripts();
        }
      }

      const elapsedMinutes = Math.round((draft.timerSeconds || 0) / 60);
      console.log(`[DraftStorage] 🛡️ ĐÃ PHỤC HỒI NGUYÊN VẸN BÀI LÀM TRƯỚC ĐÓ (${elapsedMinutes} phút)!`);
      
      if (this.master.snapshotSync && typeof this.master.snapshotSync.showToastNotification === 'function') {
        this.master.snapshotSync.showToastNotification(`🛡️ Đã tự động khôi phục bài làm của em lúc ${elapsedMinutes} phút.`);
      }
    } catch (e) {
      console.warn("[DraftStorage] Lỗi trong quá trình khôi phục bản nháp:", e);
    }
  }

  // =========================================================================
  // 4. DỌN DẸP BẢN NHÁP VÀ THU THẬP TIẾN ĐỘ HIỆN TẠI
  // =========================================================================
  clearLocalDraft() {
    try {
      localStorage.removeItem(`diag_active_draft_${this.master.testId}`);
      localStorage.removeItem(`diag_snapshot_${this.master.testId}`);
      console.log(`[DraftStorage] 🧹 Đã dọn dẹp sạch bản nháp tạm của ${this.master.testId}.`);
    } catch (e) {
      console.warn("[DraftStorage] Không thể xóa bản nháp:", e);
    }
  }

  collectCurrentExamData() {
    const currentSeconds = this.master.snapshotSync 
      ? this.master.snapshotSync.timerSeconds 
      : (this.master.timerSeconds || 0);

    return {
      timerSeconds: currentSeconds,
      timeSpent: `${Math.round(currentSeconds / 60)} phút`,
      grammarAnswers: diagGrammarEngine?.userAnswers || {},
      listeningAnswers: diagListeningEngine?.userAnswers || {},
      readingAnswers: diagReadingEngine?.userAnswers || {},
      writingSnapshot: (diagWritingEngine && typeof diagWritingEngine.getWritingSubmissionData === 'function')
        ? diagWritingEngine.getWritingSubmissionData() 
        : {},
      speakingSnapshot: (diagSpeakingEngine && typeof diagSpeakingEngine.getSpeakingSubmissionData === 'function')
        ? diagSpeakingEngine.getSpeakingSubmissionData() 
        : {}
    };
  }
}
