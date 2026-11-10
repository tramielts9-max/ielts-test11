/**
 * vocab/js-v/app-v.js
 * CỔNG TRUNG GIAN (GATEWAY CONTROLLER) DUOLINGO X TRẠM IELTS VOCABULARY
 * ĐIỀU PHỐI: LỘ TRÌNH BÀI HỌC (300, 540 & 3000 TỪ), FLASHCARD DARK UI,
 * BÀI THI LIST TỪ ĐIỀN NGHĨA CO GIÃN ĐỘNG & TÍNH NĂNG KHẢO TỔNG HỢP (MULTI-UNIT DRILL)
 */

import { DrillEngine } from './drill-engine-v.js';
import { VocabEvaluator } from './evaluator-v.js';

class VocabApp {
  constructor() {
    this.courses = [];
    this.currentCourse = null;
    this.currentCourseId = localStorage.getItem('sv_active_course_id') || 'course_ielts_300';
    this.user = this.getUserInfo();

    // Dữ liệu bài học hiện tại
    this.activeLesson = null;
    this.activeWords = [];
    
    // Trạng thái Khảo Tổng Hợp
    this.isCustomDrillActive = false;
    this.customDrillMeta = null;

    // Trạng thái Flashcard
    this.fcCurrentIndex = 0;
    this.isCardFlipped = false;
    this.keyHandler = null;

    // Trạng thái Bài thi List từ
    this.examTimerInterval = null;
    this.examSeconds = 0;
    this.isExamActive = false;
  }

  getUserInfo() {
    return {
      name: localStorage.getItem('ielts_student_name') || 'Học viên',
      email: (localStorage.getItem('ielts_student_email') || 'guest@gmail.com').toLowerCase().trim()
    };
  }

  async init() {
    this.updateUserHeaderUI();

    try {
      const res = await fetch('data-v/courses-v.json');
      this.courses = await res.json();
      this.currentCourse = this.courses.find(c => c.id === this.currentCourseId) || this.courses[0];
    } catch (e) {
      alert("⚠️ Không thể tải danh mục khóa học từ vựng!");
      return;
    }

    this.initCourseDropdown();
    this.renderRoadmapLessons();
    this.setupExamListeners();
    this.setupDrillModalListeners();
    this.checkUrlDeepLink();
  }

  updateUserHeaderUI() {
    const userLabel = document.getElementById('userDisplayLabel');
    if (userLabel) userLabel.innerText = `${this.user.name} (${this.user.email})`;

    const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
    const vocabAttempts = localHist.filter(item => (item.moduleType === 'vocab' || (item.testTitle && item.testTitle.includes('Từ vựng')) || (item.testTitle && item.testTitle.includes('Khảo'))));
    
    const xpEl = document.getElementById('userXP');
    if (xpEl) xpEl.innerHTML = `<i class="fa-solid fa-bolt"></i> ${vocabAttempts.length * 30} KN`;
  }

  initCourseDropdown() {
    const dropdown = document.getElementById('courseSelectorDropdown');
    if (!dropdown) return;

    dropdown.value = this.currentCourse.id;
    dropdown.onchange = (e) => {
      this.currentCourseId = e.target.value;
      localStorage.setItem('sv_active_course_id', this.currentCourseId);
      this.currentCourse = this.courses.find(c => c.id === this.currentCourseId) || this.courses[0];
      this.renderRoadmapLessons();
    };
  }

  // =========================================================================
  // 1. MÀN HÌNH CHÍNH: LỘ TRÌNH TỪNG UNIT
  // =========================================================================
  renderRoadmapLessons() {
    const container = document.getElementById('roadmapLessonList');
    const titleEl = document.getElementById('courseBannerText');
    const badgeEl = document.getElementById('totalCourseProgressBadge');
    if (!container || !this.currentCourse) return;

    if (titleEl) titleEl.innerText = this.currentCourse.title;

    let totalLearnedAllUnits = 0;
    const totalWordsAllUnits = this.currentCourse.lessons.reduce((acc, cur) => acc + (cur.count || 30), 0);

    container.innerHTML = this.currentCourse.lessons.map((lesson) => {
      const stats = this.getUnitStats(lesson.file);
      totalLearnedAllUnits += stats.learnedCount;
      const lessonCount = lesson.count || 30;

      return `
        <div class="vocab-unit-card">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 52px; height: 52px; border-radius: 16px; background: #FAF7F2; border: 2px solid #E8E2D8; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0;">
              ${lesson.icon || '📖'}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-size: 11px; font-weight: 900; background: #1E293B; color: white; padding: 2px 7px; border-radius: 6px;">UNIT ${lesson.unit}</span>
                <b style="font-size: 16.5px; color: #261F1D;">${lesson.title}</b>
              </div>
              <div style="font-size: 13.5px; font-weight: 700; color: #64748B; margin-top: 3px;">
                ${lesson.subTitle}
              </div>

              <div class="unit-stat-pills">
                <span class="pill-learned">
                  <i class="fa-solid fa-circle-check"></i> Đã thuộc: <b>${stats.learnedCount}/${lessonCount} từ</b>
                </span>
                <span class="pill-score">
                  <i class="fa-solid fa-trophy"></i> Điểm cao nhất: <b>${stats.bestScore}/${lessonCount}</b>
                </span>
                <span class="pill-attempts">
                  <i class="fa-solid fa-rotate-right"></i> Đã làm: <b>${stats.attemptsCount} lần</b>
                </span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" onclick="window.startVocabFlashcard('${lesson.file}', '${lesson.title}')" class="btn-3d btn-3d-blue">
              🧠 Học Từ Mới
            </button>
            <button type="button" onclick="window.startVocabListExam('${lesson.file}', '${lesson.title}', ${lesson.unit})" class="btn-3d btn-3d-red">
              📝 Kiểm Tra ${lessonCount} Từ
            </button>
            ${stats.attemptsCount > 0 ? `
              <button type="button" onclick="window.viewPastVocabAttempt('${lesson.file}', '${lesson.title}', ${lesson.unit})" class="btn-3d btn-3d-white" title="Xem lại lần làm gần nhất">
                👁️ Xem lại
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (badgeEl) {
      const pct = Math.round((totalLearnedAllUnits / (totalWordsAllUnits || 1)) * 100);
      badgeEl.innerText = `Toàn khóa: ${totalLearnedAllUnits}/${totalWordsAllUnits} từ (${pct}%)`;
    }
  }

  getUnitStorageKey(file) {
    const cleanEmail = this.user.email.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanFile = (file || 'default').replace(/[^a-zA-Z0-9]/g, '_');
    return `sv_unit_stats_${cleanEmail}_${cleanFile}`;
  }

  getUnitStats(file) {
    try {
      const raw = localStorage.getItem(this.getUnitStorageKey(file));
      return raw ? JSON.parse(raw) : { learnedCount: 0, learnedWordIds: [], bestScore: 0, attemptsCount: 0, lastAttempt: null };
    } catch(e) {
      return { learnedCount: 0, learnedWordIds: [], bestScore: 0, attemptsCount: 0, lastAttempt: null };
    }
  }

  saveUnitStats(file, stats) {
    try {
      localStorage.setItem(this.getUnitStorageKey(file), JSON.stringify(stats));
    } catch(e) {}
  }

  // =========================================================================
  // 2. MÀN HÌNH FLASHCARD DARK UI (CHUẨN TEST8)
  // =========================================================================
  async openFlashcard(file, title, customWordsArray = null) {
    try {
      if (customWordsArray && Array.isArray(customWordsArray)) {
        this.activeWords = customWordsArray;
        this.activeLesson = { file: file || 'custom_drill', title: title || 'Khảo Tổng Hợp' };
      } else {
        const res = await fetch(`data-v/${file}`);
        const data = await res.json();
        this.activeWords = Array.isArray(data) ? data : (data.words || []);
        this.activeLesson = { file, title };
      }

      this.fcCurrentIndex = 0;
      this.isCardFlipped = false;

      document.getElementById('portalRoadmapView').style.display = 'none';
      document.getElementById('coursePickerSection').style.display = 'none';
      document.getElementById('listExamScreen').style.display = 'none';
      document.getElementById('flashcardScreen').style.display = 'block';

      this.bindFlashcardShortcuts();
      this.renderCurrentFlashcard();
    } catch(e) {
      alert("Lỗi tải từ vựng: " + file);
    }
  }

  bindFlashcardShortcuts() {
    this.removeFlashcardShortcuts();

    this.keyHandler = (e) => {
      const fcScreen = document.getElementById('flashcardScreen');
      if (!fcScreen || fcScreen.style.display === 'none') return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.flipFlashcard();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.handleFlashcardAnswer(false);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.handleFlashcardAnswer(true);
      }
    };

    window.addEventListener('keydown', this.keyHandler);
  }

  removeFlashcardShortcuts() {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  speakCurrentWord() {
    const item = this.activeWords[this.fcCurrentIndex];
    if (!item || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const cleanWord = (item.word || '').replace(/\s*\(.*?\)/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanWord);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  renderCurrentFlashcard() {
    if (this.fcCurrentIndex >= this.activeWords.length) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      alert(`🎉 Em đã xem hết ${this.activeWords.length} từ vựng! Giờ hãy vào làm bài kiểm tra để AI đánh giá nhé.`);
      this.backToPortal();
      return;
    }

    const item = this.activeWords[this.fcCurrentIndex];
    const card = document.getElementById('mainFlashcard');
    const counterEl = document.getElementById('fcTopCounterDisplay');
    const wordEn = document.getElementById('fcWordEn');
    const phonetic = document.getElementById('fcPhonetic');
    const meaningVn = document.getElementById('fcMeaningVn');
    const exampleEl = document.getElementById('fcExample');

    if (counterEl) counterEl.innerHTML = `Thẻ <b>${this.fcCurrentIndex + 1} / ${this.activeWords.length}</b>`;
    if (wordEn) wordEn.innerText = item.word || '';
    if (phonetic) phonetic.innerText = item.phonetic || '';
    if (meaningVn) meaningVn.innerText = item.meaning || '';

    if (exampleEl) {
      if (item.example) {
        exampleEl.style.display = 'block';
        exampleEl.innerText = `"${item.example}"`;
      } else {
        exampleEl.style.display = 'none';
      }
    }

    this.isCardFlipped = false;
    card?.classList.remove('is-flipped');
    this.speakCurrentWord();
  }

  flipFlashcard() {
    const card = document.getElementById('mainFlashcard');
    if (!card) return;
    this.isCardFlipped = !this.isCardFlipped;
    card.classList.toggle('is-flipped', this.isCardFlipped);
  }

  handleFlashcardAnswer(isLearned) {
    const item = this.activeWords[this.fcCurrentIndex];
    if (item && this.activeLesson && !this.isCustomDrillActive) {
      const stats = this.getUnitStats(this.activeLesson.file);
      if (!stats.learnedWordIds) stats.learnedWordIds = [];

      if (isLearned) {
        if (!stats.learnedWordIds.includes(item.id)) {
          stats.learnedWordIds.push(item.id);
          stats.learnedCount = stats.learnedWordIds.length;
          this.saveUnitStats(this.activeLesson.file, stats);
        }
      }
    }

    this.fcCurrentIndex++;
    this.renderCurrentFlashcard();
  }

  // =========================================================================
  // 3. MÀN HÌNH BÀI THI: BẢNG LIST TỪ CO GIÃN ĐỘNG (CHIA 2 CỘT)
  // =========================================================================
  async openListExam(file, title, unitNum, customWordsArray = null, customMeta = null) {
    try {
      if (customWordsArray && Array.isArray(customWordsArray)) {
        this.activeWords = customWordsArray;
        this.isCustomDrillActive = true;
        this.customDrillMeta = customMeta;
        this.activeLesson = { file: file || 'custom_drill', title: title || 'Khảo Tổng Hợp', unitNum: null };
      } else {
        const res = await fetch(`data-v/${file}`);
        const data = await res.json();
        this.activeWords = Array.isArray(data) ? data : (data.words || []);
        this.isCustomDrillActive = false;
        this.customDrillMeta = null;
        this.activeLesson = { file, title, unitNum };
      }

      this.removeFlashcardShortcuts();
      if (window.speechSynthesis) window.speechSynthesis.cancel();

      document.getElementById('portalRoadmapView').style.display = 'none';
      document.getElementById('coursePickerSection').style.display = 'none';
      document.getElementById('flashcardScreen').style.display = 'none';
      document.getElementById('listExamScreen').style.display = 'block';

      const totalWords = this.activeWords.length;
      document.getElementById('examUnitTitleDisplay').innerText = `BÀI KIỂM TRA TỪ VỰNG: ${title.toUpperCase()}`;
      document.getElementById('examStudentNameDisplay').innerText = `Học viên: ${this.user.name} • Mục tiêu: Điền đúng nghĩa ${totalWords} từ để AI chấm`;

      this.renderExamTableInputs();
      if (!this.isCustomDrillActive) {
        this.restoreExamDraft();
      }
      this.startExamTimer();

      document.getElementById('aiExamResultContainer').style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(e) {
      alert("Lỗi tải bài kiểm tra: " + file);
    }
  }

  renderExamTableInputs() {
    const leftTbody = document.getElementById('examTbodyLeft');
    const rightTbody = document.getElementById('examTbodyRight');
    if (!leftTbody || !rightTbody) return;

    leftTbody.innerHTML = '';
    rightTbody.innerHTML = '';

    const total = this.activeWords.length;
    const half = Math.ceil(total / 2);

    const firstHalf = this.activeWords.slice(0, half);
    const secondHalf = this.activeWords.slice(half);

    const renderRows = (words, startIndex) => {
      return words.map((w, idx) => {
        const rowNum = startIndex + idx + 1;
        return `
          <tr id="row_vocab_${w.id}">
            <td class="col-stt">${rowNum}</td>
            <td class="col-en">
              <b>${w.word}</b>
            </td>
            <td>
              <input type="text" id="inp_vocab_${w.id}" data-id="${w.id}" class="col-vn-input" placeholder="Gõ nghĩa tiếng Việt..." autocomplete="off">
              <div id="correct_lbl_${w.id}" style="display:none; font-size:11.5px; font-weight:800; color:#166534; margin-top:2px;"></div>
            </td>
          </tr>
        `;
      }).join('');
    };

    leftTbody.innerHTML = renderRows(firstHalf, 0);
    rightTbody.innerHTML = renderRows(secondHalf, half);
  }

  setupExamListeners() {
    const form = document.getElementById('vocabTestForm');
    let autoSaveTimeout = null;
    form?.addEventListener('input', () => {
      if (this.isCustomDrillActive) return;
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => this.saveExamDraft(), 1500);
    });

    document.getElementById('btnSaveDraftVocab')?.addEventListener('click', () => {
      if (this.isCustomDrillActive) {
        alert("💡 Bài Khảo Tổng Hợp ngẫu nhiên không hỗ trợ lưu bản nháp.");
        return;
      }
      this.saveExamDraft();
      alert("✅ Đã lưu tạm bài kiểm tra thành công! Em có thể thoát ra và quay lại điền tiếp.");
    });

    document.getElementById('btnSubmitVocabList')?.addEventListener('click', () => {
      this.submitVocabListForAIGrading();
    });
  }

  getExamDraftKey() {
    return `sv_draft_${this.user.email}_${this.activeLesson?.file}`;
  }

  saveExamDraft() {
    if (!this.activeLesson || this.isCustomDrillActive) return;
    const inputsData = {};
    this.activeWords.forEach(w => {
      const el = document.getElementById(`inp_vocab_${w.id}`);
      if (el) inputsData[w.id] = el.value;
    });

    const draft = {
      seconds: this.examSeconds,
      inputs: inputsData,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(this.getExamDraftKey(), JSON.stringify(draft));
    } catch(e) {}
  }

  restoreExamDraft() {
    try {
      const raw = localStorage.getItem(this.getExamDraftKey());
      if (!raw) return;
      const draft = JSON.parse(raw);
      this.examSeconds = draft.seconds || 0;
      this.updateTimerDisplay();

      if (draft.inputs) {
        Object.entries(draft.inputs).forEach(([id, val]) => {
          const el = document.getElementById(`inp_vocab_${id}`);
          if (el) el.value = val;
        });
      }
    } catch(e) {}
  }

  clearExamDraft() {
    if (this.activeLesson && !this.isCustomDrillActive) {
      try {
        localStorage.removeItem(this.getExamDraftKey());
      } catch(e) {}
    }
  }

  startExamTimer() {
    this.stopExamTimer();
    this.examSeconds = 0;
    this.updateTimerDisplay();
    this.examTimerInterval = setInterval(() => {
      this.examSeconds++;
      this.updateTimerDisplay();
    }, 1000);
  }

  stopExamTimer() {
    if (this.examTimerInterval) {
      clearInterval(this.examTimerInterval);
      this.examTimerInterval = null;
    }
  }

  updateTimerDisplay() {
    const el = document.getElementById('examTimerDisplay');
    if (!el) return;
    const mm = String(Math.floor(this.examSeconds / 60)).padStart(2, '0');
    const ss = String(this.examSeconds % 60).padStart(2, '0');
    el.innerText = `${mm}:${ss}`;
  }

  // =========================================================================
  // 4. CHẤM ĐIỂM AI QUA EVALUATOR VÀ ĐỒNG BỘ GOOGLE DRIVE
  // =========================================================================
  async submitVocabListForAIGrading() {
    const studentInputs = [];
    let filledCount = 0;

    this.activeWords.forEach((w, idx) => {
      const inputEl = document.getElementById(`inp_vocab_${w.id}`);
      const val = (inputEl?.value || '').trim();
      if (val) filledCount++;
      studentInputs.push({
        stt: idx + 1,
        id: w.id,
        word: w.word,
        standardMeaning: w.meaning,
        studentMeaning: val || "(Bỏ trống)"
      });
    });

    if (filledCount === 0) {
      alert("⚠️ Em hãy điền nghĩa tiếng Việt của các từ trước khi nộp bài nhé!");
      return;
    }

    const submitBtn = document.getElementById('btnSubmitVocabList');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `⏳ AI Gemini đang chấm trọn gói ${this.activeWords.length} từ...`;

    this.stopExamTimer();

    try {
      const examTitle = this.activeLesson?.title || "Bài kiểm tra từ vựng";
      const gradingResult = await VocabEvaluator.gradeVocabList(studentInputs, examTitle);

      this.applyGradingResultUI(gradingResult, studentInputs);
      this.clearExamDraft();
    } catch (err) {
      console.warn("Lỗi quy trình chấm:", err);
      const fallbackResult = VocabEvaluator.fallbackLocalGrading(studentInputs);
      this.applyGradingResultUI(fallbackResult, studentInputs);
      this.clearExamDraft();
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `🚀 NỘP BÀI & GỌI AI CHẤM TRỌN GÓI`;
    }
  }

  applyGradingResultUI(gradingResult, studentInputs) {
    const resultMap = new Map();
    (gradingResult.results || []).forEach(r => resultMap.set(r.id, r));

    const totalWords = this.activeWords.length;
    let correctCount = gradingResult.totalCorrect !== undefined ? gradingResult.totalCorrect : 0;
    const learnedIdsToSave = [];

    studentInputs.forEach(item => {
      const res = resultMap.get(item.id) || { isCorrect: false };
      const inputEl = document.getElementById(`inp_vocab_${item.id}`);
      const lblEl = document.getElementById(`correct_lbl_${item.id}`);

      if (inputEl) {
        inputEl.disabled = true;
        if (res.isCorrect) {
          inputEl.classList.add('is-correct');
          learnedIdsToSave.push(item.id);
        } else {
          inputEl.classList.add('is-wrong');
          if (lblEl) {
            lblEl.style.display = 'block';
            lblEl.innerHTML = `👉 Nghĩa chuẩn: <b>${item.standardMeaning}</b>`;
          }
        }
      }
    });

    const resBox = document.getElementById('aiExamResultContainer');
    const badge = document.getElementById('examScoreBadge');
    const summary = document.getElementById('aiSummaryFeedback');

    if (resBox && badge && summary) {
      resBox.style.display = 'block';
      const pct = Math.round((correctCount / (totalWords || 1)) * 100);
      badge.innerText = `Điểm: ${correctCount}/${totalWords} (${pct}%)`;
      summary.innerHTML = `
        <div style="margin-bottom:6px;"><b>Nhận xét:</b> ${gradingResult.summary || 'Em đã hoàn thành bài kiểm tra!'}</div>
        <div style="font-size:12.5px; color:#15803D;">⏱️ Thời gian: <b>${Math.floor(this.examSeconds / 60)}p ${this.examSeconds % 60}s</b> • Kết quả đã được lưu vào Lịch sử & Google Drive.</div>
      `;
      resBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 1. Cập nhật thống kê bài học đơn lẻ
    if (!this.isCustomDrillActive && this.activeLesson?.file) {
      const stats = this.getUnitStats(this.activeLesson.file);
      stats.attemptsCount = (stats.attemptsCount || 0) + 1;
      stats.bestScore = Math.max(stats.bestScore || 0, correctCount);

      if (!stats.learnedWordIds) stats.learnedWordIds = [];
      learnedIdsToSave.forEach(id => {
        if (!stats.learnedWordIds.includes(id)) stats.learnedWordIds.push(id);
      });
      stats.learnedCount = stats.learnedWordIds.length;
      this.saveUnitStats(this.activeLesson.file, stats);
    }

    // 2. Đồng bộ Google Drive & LocalStorage qua VocabEvaluator
    VocabEvaluator.syncResultToCloudAndLocal({
      examTitle: this.activeLesson.title,
      studentName: this.user.name,
      studentEmail: this.user.email,
      scoreCorrect: correctCount,
      totalQuestions: totalWords,
      secondsSpent: this.examSeconds,
      unitNum: this.activeLesson.unitNum,
      isComprehensiveDrill: this.isCustomDrillActive,
      selectedUnits: this.customDrillMeta?.selectedUnits || []
    });
  }

  // =========================================================================
  // 5. ĐIỀU KHIỂN MODAL KHẢO TỔNG HỢP (MULTI-UNIT DRILL)
  // =========================================================================
  setupDrillModalListeners() {
    const modal = document.getElementById('modalCustomDrill');
    const openBtn = document.getElementById('btnOpenCustomDrillModal');
    const closeBtn = document.getElementById('btnCloseDrillModal');
    const cancelBtn = document.getElementById('btnCancelDrillModal');
    const launchBtn = document.getElementById('btnLaunchCustomDrill');

    const openModal = () => {
      if (!this.currentCourse || !this.currentCourse.lessons) return;
      DrillEngine.initModal(this.currentCourse.lessons);
      if (modal) modal.style.display = 'flex';
    };

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };

    openBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    launchBtn?.addEventListener('click', async () => {
      try {
        launchBtn.disabled = true;
        launchBtn.innerText = "⏳ Đang bốc & trộn câu hỏi...";

        const payload = await DrillEngine.buildDrillPayload();
        closeModal();

        const modeRadios = document.getElementsByName('drillExamMode');
        let selectedMode = 'exam_paper';
        for (const r of modeRadios) {
          if (r.checked) {
            selectedMode = r.value;
            break;
          }
        }

        const titleText = `Khảo Tổng ${payload.selectedUnits.length} Unit (${payload.totalQuestions} câu)`;

        if (selectedMode === 'flashcard') {
          this.isCustomDrillActive = true;
          this.customDrillMeta = payload;
          await this.openFlashcard('custom_drill', titleText, payload.words);
        } else {
          await this.openListExam('custom_drill', titleText, null, payload.words, payload);
        }
      } catch (err) {
        alert(err.message || "Đã xảy ra lỗi khi tạo bài khảo tổng hợp!");
      } finally {
        launchBtn.disabled = false;
        launchBtn.innerText = "🚀 BẮT ĐẦU KHẢO NGAY";
      }
    });
  }

  viewPastVocabAttempt(file, title, unitNum) {
    this.openListExam(file, title, unitNum);
  }

  backToPortal() {
    this.stopExamTimer();
    this.removeFlashcardShortcuts();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    this.isCustomDrillActive = false;
    this.customDrillMeta = null;

    document.getElementById('flashcardScreen').style.display = 'none';
    document.getElementById('listExamScreen').style.display = 'none';
    document.getElementById('portalRoadmapView').style.display = 'block';
    document.getElementById('coursePickerSection').style.display = 'flex';
    this.renderRoadmapLessons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  checkUrlDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const unitParam = parseInt(params.get('unit'), 10);
    if (!isNaN(unitParam) && this.currentCourse) {
      const matched = this.currentCourse.lessons.find(l => l.unit === unitParam);
      if (matched) {
        this.openListExam(matched.file, matched.title, matched.unit);
      }
    }
  }
}

// Khởi tạo app và gắn hàm toàn cục
const app = new VocabApp();
document.addEventListener('DOMContentLoaded', () => app.init());

window.vocabApp = app;
window.startVocabFlashcard = (f, t) => app.openFlashcard(f, t);
window.startVocabListExam = (f, t, u) => app.openListExam(f, t, u);
window.viewPastVocabAttempt = (f, t, u) => app.viewPastVocabAttempt(f, t, u);
window.backToVocabPortal = () => app.backToPortal();
window.flipCurrentFlashcard = () => app.flipFlashcard();
window.speakCurrentWord = () => app.speakCurrentWord();
window.handleFlashcardAnswer = (isLearned) => app.handleFlashcardAnswer(isLearned);
