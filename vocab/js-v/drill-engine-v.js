/**
 * vocab/js-v/drill-engine-v.js
 * MODULE CHUYÊN TRÁCH KHẢO TỔNG HỢP (MULTI-UNIT CUSTOM DRILL ENGINE)
 * THUẬT TOÁN PHÂN BỔ ĐỀU N/K + FISHER-YATES TRỘN LIÊN HOÀN + PHÒNG THỦ CHỐNG LỖI RUNTIME
 */

export const DrillEngine = {
  currentLessons: [],
  selectedLessons: [],
  targetCount: 20,

  /**
   * Khởi tạo giao diện Modal với danh sách lessons của khóa học hiện tại
   */
  initModal(lessons) {
    this.currentLessons = Array.isArray(lessons) ? lessons : [];
    this.selectedLessons = [...this.currentLessons]; // Mặc định chọn tất cả
    this.targetCount = 20;

    this.renderUnitCheckboxes();
    this.bindModalEvents();
    this.updateSummaryText();
  },

  /**
   * Render danh sách checkbox từng Unit theo dạng lưới
   */
  renderUnitCheckboxes() {
    const container = document.getElementById('drillUnitListGrid');
    if (!container) return;

    if (this.currentLessons.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #64748B; font-weight: 700;">Không có bài học nào khả dụng.</div>`;
      return;
    }

    container.innerHTML = this.currentLessons.map((lesson, idx) => {
      const isChecked = this.selectedLessons.some(l => l.unit === lesson.unit);
      return `
        <label class="drill-unit-item ${isChecked ? 'is-selected' : ''}" id="lbl_drill_unit_${lesson.unit}">
          <input type="checkbox" class="chk-drill-unit" data-unit="${lesson.unit}" ${isChecked ? 'checked' : ''}>
          <div class="drill-unit-text" title="Unit ${lesson.unit}: ${lesson.title}">
            <span style="color: var(--tram-red); font-weight: 900;">U${lesson.unit}.</span> ${lesson.title}
          </div>
        </label>
      `;
    }).join('');
  },

  /**
   * Gắn sự kiện tương tác cho Modal
   */
  bindModalEvents() {
    const container = document.getElementById('drillUnitListGrid');
    if (!container) return;

    // Sự kiện khi click vào từng checkbox Unit
    container.onchange = (e) => {
      if (e.target && e.target.classList.contains('chk-drill-unit')) {
        const unitNum = parseInt(e.target.getAttribute('data-unit'), 10);
        const itemLabel = document.getElementById(`lbl_drill_unit_${unitNum}`);
        
        if (e.target.checked) {
          itemLabel?.classList.add('is-selected');
          const matched = this.currentLessons.find(l => l.unit === unitNum);
          if (matched && !this.selectedLessons.some(l => l.unit === unitNum)) {
            this.selectedLessons.push(matched);
          }
        } else {
          itemLabel?.classList.remove('is-selected');
          this.selectedLessons = this.selectedLessons.filter(l => l.unit !== unitNum);
        }
        this.updateSummaryText();
      }
    };

    // Nút Chọn tất cả
    const btnSelectAll = document.getElementById('btnDrillSelectAll');
    if (btnSelectAll) {
      btnSelectAll.onclick = () => {
        this.selectedLessons = [...this.currentLessons];
        container.querySelectorAll('.chk-drill-unit').forEach(chk => {
          chk.checked = true;
          chk.closest('.drill-unit-item')?.classList.add('is-selected');
        });
        this.updateSummaryText();
      };
    }

    // Nút Bỏ chọn tất cả
    const btnDeselectAll = document.getElementById('btnDrillDeselectAll');
    if (btnDeselectAll) {
      btnDeselectAll.onclick = () => {
        this.selectedLessons = [];
        container.querySelectorAll('.chk-drill-unit').forEach(chk => {
          chk.checked = false;
          chk.closest('.drill-unit-item')?.classList.remove('is-selected');
        });
        this.updateSummaryText();
      };
    }

    // Nút Chip chọn số lượng câu hỏi có sẵn (20, 30, 50, 100, all)
    const presetChips = document.querySelectorAll('.chip-q-preset');
    const customInp = document.getElementById('drillCustomCountInput');

    presetChips.forEach(chip => {
      chip.onclick = () => {
        presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const val = chip.getAttribute('data-count');
        if (val === 'all') {
          this.targetCount = this.calculateTotalAvailableWords();
          if (customInp) customInp.value = this.targetCount;
        } else {
          this.targetCount = parseInt(val, 10) || 20;
          if (customInp) customInp.value = this.targetCount;
        }
        this.updateSummaryText();
      };
    });

    // Ô tự gõ số lượng câu hỏi
    if (customInp) {
      customInp.oninput = () => {
        presetChips.forEach(c => c.classList.remove('active'));
        const num = parseInt(customInp.value, 10);
        this.targetCount = isNaN(num) || num <= 0 ? 10 : num;
        this.updateSummaryText();
      };
    }
  },

  calculateTotalAvailableWords() {
    return this.selectedLessons.reduce((sum, l) => sum + (l.count || 30), 0);
  },

  updateSummaryText() {
    const selCountEl = document.getElementById('drillSelectedUnitsCount');
    const noteEl = document.getElementById('drillQuotaSummaryNote');

    if (selCountEl) selCountEl.innerText = this.selectedLessons.length;

    if (!noteEl) return;

    if (this.selectedLessons.length === 0) {
      noteEl.style.color = '#EF4444';
      noteEl.innerHTML = `⚠️ Vui lòng tích chọn ít nhất 1 Unit để bắt đầu khảo.`;
      return;
    }

    const K = this.selectedLessons.length;
    const maxAvailable = this.calculateTotalAvailableWords();
    let actualTarget = Math.min(this.targetCount, maxAvailable);

    const basePerUnit = Math.floor(actualTarget / K);
    const remainder = actualTarget % K;

    noteEl.style.color = '#15803D';
    noteEl.innerHTML = `
      💡 Đã chọn <b>${K} Unit</b>. Dự kiến khảo <b>${actualTarget} câu</b> 
      (mỗi bài bốc ~<b>${basePerUnit}${remainder > 0 ? ` đến ${basePerUnit + 1}` : ''} từ</b> ngẫu nhiên).
    `;
  },

  /**
   * Giải thuật Fisher-Yates xáo trộn mảng chuẩn xác
   */
  shuffleArray(arr) {
    const cloned = [...arr];
    for (let i = cloned.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
  },

  /**
   * Thuật toán tải dữ liệu, bốc chia đều và xáo trộn liên hoàn
   */
  async buildDrillPayload() {
    if (this.selectedLessons.length === 0) {
      throw new Error("Vui lòng chọn ít nhất 1 bài học (Unit) để làm bài khảo!");
    }

    // 1. Tải song song tất cả các file JSON của các Unit được chọn
    const loadPromises = this.selectedLessons.map(async (lesson) => {
      try {
        const res = await fetch(`data-v/${lesson.file}`);
        if (!res.ok) return { lesson, words: [] };
        const data = await res.json();
        const wordsArray = Array.isArray(data) ? data : (data.words || []);
        return { lesson, words: wordsArray };
      } catch (err) {
        console.warn(`Lỗi khi nạp dữ liệu Unit ${lesson.unit}:`, err);
        return { lesson, words: [] };
      }
    });

    const loadedData = await Promise.all(loadPromises);
    const validData = loadedData.filter(d => d.words.length > 0);

    if (validData.length === 0) {
      throw new Error("Không thể tải được dữ liệu từ vựng của các Unit đã chọn!");
    }

    const K = validData.length;
    const maxPossibleWords = validData.reduce((acc, cur) => acc + cur.words.length, 0);
    const actualTotalQuestions = Math.min(Math.max(5, this.targetCount), maxPossibleWords);

    // 2. Tính hạn mức phân bổ cho từng Unit
    const baseQuota = Math.floor(actualTotalQuestions / K);
    let remainder = actualTotalQuestions % K;

    // Trộn ngẫu nhiên thứ tự các Unit để phân bổ số dư công bằng
    const shuffledUnits = this.shuffleArray(validData);

    const mergedExamPool = [];

    shuffledUnits.forEach((item, index) => {
      const quota = baseQuota + (index < remainder ? 1 : 0);
      const shuffledUnitWords = this.shuffleArray(item.words);
      const pickedWords = shuffledUnitWords.slice(0, quota);
      mergedExamPool.push(...pickedWords);
    });

    // 3. Trộn toàn diện lần cuối để câu hỏi giữa các Unit đan xen nhau hoàn toàn
    const finalShuffledWords = this.shuffleArray(mergedExamPool);

    return {
      totalQuestions: finalShuffledWords.length,
      selectedUnits: this.selectedLessons.map(l => l.unit),
      words: finalShuffledWords
    };
  }
};
