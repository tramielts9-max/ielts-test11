/**
 * diagnostic/js-diag/fulltest-core/ft-reading-section.js
 * CHUYÊN TRÁCH PHẦN THI READING 3 PASSAGES (CAMBRIDGE 21) FULL MOCK TEST
 * BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ DÒNG CODE TÍNH NĂNG NÀO
 * - NẠP ĐỘNG 3 PASSAGES TỪ KHO CAMBRIDGE 21 THEO SET THI ĐƯỢC CHỌN
 * - RENDER CÁC DẠNG BÀI: SUMMARY GAP-FILL, MATCHING INFO TABLE, TFNG/YNNG, MCQ
 * - BỘ CHIA MÀN HÌNH DUOLINGO 3D (RESIZER) HỖ TRỢ KÉO THẢ CHUỘT & CẢM ỨNG
 * - BỘ NHỚ ĐỆM BẢO LƯU VẾT BÔI VÀNG HIGHLIGHT KHÔNG BỊ MẤT KHI ĐỔI PASSAGE
 * - CÔNG CỤ TÔ VÀNG VÀ XÓA HIGHLIGHT BẰNG CLICK CHUỘT TRỰC TIẾP
 * - CHẤM ĐIỂM CHUẨN XÁC 40 CÂU & TÔ MÀU ĐÚNG SAI KÈM REVIEW MODE
 */

export class FtReadingSection {
  constructor() {
    this.readPassages = [];
    this.userAnswers = {};
    this.activeReadPassageIdx = 0;
    this.setNum = 1;
    this.isReviewMode = false;

    // Bộ nhớ đệm lưu vết HTML đã Highlight của từng bài đọc
    this.readingHighlightsCache = {
      0: null,
      1: null,
      2: null
    };
  }

  // =========================================================================
  // 1. NẠP DỮ LIỆU 3 PASSAGES CAMBRIDGE 21 TỪ KHO JSON
  // =========================================================================
  async load(setNum = 1, mountId = 'ftReadingMount') {
    this.setNum = setNum;
    this.readPassages = [];
    this.readingHighlightsCache = { 0: null, 1: null, 2: null };

    for (let p = 1; p <= 3; p++) {
      const tryUrls = [
        `data-diag/reading/cam21-test${this.setNum}-p${p}.json`,
        `data-diag/reading/test${this.setNum}-reading-s${p}.json`,
        `../reading/data-r/cam21-test${this.setNum}/cam21-test${this.setNum}-p${p}.json`
      ];

      let data = null;
      for (const u of tryUrls) {
        try {
          const res = await fetch(`${u}?t=${Date.now()}`);
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch (e) {}
      }

      if (data) this.readPassages.push(data);
    }

    this.renderUI(mountId);
  }

  // =========================================================================
  // 2. RENDER GIAO DIỆN CHÍNH & TAB CHUYỂN 3 PASSAGES
  // =========================================================================
  renderUI(mountId = 'ftReadingMount') {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    if (this.readPassages.length === 0) {
      mount.innerHTML = `<div style="text-align:center; padding:30px; color:#DC2626; font-weight:800;">⚠️ Đang tải hoặc không tìm thấy dữ liệu đề đọc Cambridge 21!</div>`;
      return;
    }

    let html = `
      <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
        ${this.readPassages.map((p, idx) => `
          <button type="button" 
                  id="btnReadPassage_${idx}" 
                  class="btn-3d ${idx === 0 ? 'btn-3d-red' : 'btn-3d-white'}" 
                  style="padding:8px 16px; font-size:13px;" 
                  onclick="window.ftReadingSection.switchPassage(${idx})">
            Passage ${idx + 1}
          </button>
        `).join('')}
      </div>
      <div id="ftReadActiveBox"></div>
    `;

    mount.innerHTML = html;
    this.switchPassage(0);
  }

  // =========================================================================
  // 3. CHUYỂN PASSAGE & BẢO LƯU VẾT BÔI VÀNG HIGHLIGHT
  // =========================================================================
  switchPassage(idx) {
    // Lưu lại vết HTML đã highlight của Passage cũ trước khi chuyển
    const prevLeftPane = document.getElementById('ftReadLeftPane');
    if (prevLeftPane && this.activeReadPassageIdx !== null) {
      this.readingHighlightsCache[this.activeReadPassageIdx] = prevLeftPane.innerHTML;
    }

    this.activeReadPassageIdx = idx;
    const passage = this.readPassages[idx];
    if (!passage) return;

    // Cập nhật trạng thái nút Tab
    this.readPassages.forEach((_, i) => {
      const btn = document.getElementById(`btnReadPassage_${i}`);
      if (btn) btn.className = `btn-3d ${i === idx ? 'btn-3d-red' : 'btn-3d-white'}`;
    });

    const box = document.getElementById('ftReadActiveBox');
    if (!box) return;

    let qContentHtml = '';

    (passage.groups || []).forEach(g => {
      const gType = (g.type || '').toLowerCase();
      const isTFNG = gType.includes('tfng');
      const isYNNG = gType.includes('ynng');
      const isMatchingInfo = gType.includes('matching_info');

      let inner = '';

      // 1. Dạng Summary Gap-Fill (Điền từ vào đoạn văn hoặc bảng tóm tắt)
      if (g.template) {
        let tmpl = g.template;
        (g.questionIds || []).forEach(qId => {
          const q = (passage.questions || {})[qId] || {};
          const num = q.num || qId.replace('q', '');
          const width = q.inputWidth || "120px";
          const inputEl = `
            <input type="text" 
                   class="diag-input" 
                   id="inp_ft_read_${qId}" 
                   style="width:${width}; display:inline-block; vertical-align:middle; padding:5px 8px; text-align:center; font-weight:800; color:#8B1518; margin:0 4px;" 
                   placeholder="[${num}]" 
                   oninput="window.ftReadingSection.recordAnswer('${qId}', this.value)">
          `;
          tmpl = tmpl.replace(new RegExp(`{{${qId}}}`, 'g'), inputEl);
        });

        inner = `
          <div style="background:#FFFFFF; border:1.5px solid #CBD5E1; border-radius:12px; padding:18px; font-size:14.5px; line-height:1.85;">
            ${(g.noteTitle || g.summaryTitle) ? `<b style="font-size:15px; color:#8B1518; display:block; margin-bottom:8px;">${g.noteTitle || g.summaryTitle}</b>` : ''}
            ${tmpl}
          </div>
        `;

      // 2. Dạng Nối Đoạn Văn (Matching Information dạng bảng A-G)
      } else if (isMatchingInfo) {
        let paras = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        if (g.questionIds && g.questionIds.length > 0) {
          const firstQ = (passage.questions || {})[g.questionIds[0]];
          if (firstQ && Array.isArray(firstQ.options) && firstQ.options.length > 0) {
            paras = firstQ.options.map(o => String(o).charAt(0).toUpperCase());
          }
        }

        inner = `
          <div style="overflow-x:auto; background:#FFFFFF; border:1.5px solid #E8E2D8; border-radius:12px; margin:10px 0;">
            <table style="width:100%; border-collapse:collapse; font-size:13.5px;">
              <thead>
                <tr style="background:#FAF7F2;">
                  <th style="padding:10px 12px; text-align:left;">Câu hỏi</th>
                  ${paras.map(p => `<th style="padding:10px 6px; text-align:center;">${p}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${(g.questionIds || []).map(qId => {
                  const q = (passage.questions || {})[qId] || {};
                  return `
                    <tr style="border-top:1px solid #E8E2D8;">
                      <td style="padding:10px 12px; font-weight:700;">Câu ${q.num || qId}. ${q.text || ''}</td>
                      ${paras.map(p => `
                        <td style="text-align:center; padding:6px;">
                          <input type="radio" 
                                 name="rad_ft_read_${qId}" 
                                 value="${p}" 
                                 onchange="window.ftReadingSection.recordAnswer('${qId}', '${p}')">
                        </td>
                      `).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;

      // 3. Dạng True/False/Not Given, Yes/No/Not Given & Trắc nghiệm MCQ
      } else {
        inner = (g.questionIds || []).map(qId => {
          const q = (passage.questions || {})[qId] || {};
          const num = q.num || qId.replace('q', '');
          let opts = '';

          if (isTFNG || isYNNG) {
            const list = isTFNG ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN'];
            opts = list.map(ch => `
              <label class="option-label" style="display:inline-flex; width:auto; padding:7px 16px; margin-right:6px;" onclick="window.ftReadingSection.recordAnswer('${qId}', '${ch}')">
                <input type="radio" name="rad_ft_read_${qId}" value="${ch}">
                <span>${ch}</span>
              </label>
            `).join('');
          } else if (q.options && Array.isArray(q.options)) {
            opts = q.options.map(opt => `
              <label class="option-label" onclick="window.ftReadingSection.recordAnswer('${qId}', '${opt.charAt(0)}')">
                <input type="radio" name="rad_ft_read_${qId}" value="${opt.charAt(0)}">
                <span>${opt}</span>
              </label>
            `).join('');
          } else {
            opts = `<input type="text" class="diag-input" id="inp_ft_read_${qId}" placeholder="Điền đáp án..." oninput="window.ftReadingSection.recordAnswer('${qId}', this.value)">`;
          }

          return `
            <div class="q-item-box" style="margin-bottom:12px;">
              <b style="font-size:14px; color:#1E293B; display:block; margin-bottom:6px;">Câu ${num}. ${q.text || ''}</b>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">${opts}</div>
            </div>
          `;
        }).join('');
      }

      qContentHtml += `
        <div style="background:#FAF7F2; border:1.5px solid #E8E2D8; border-radius:14px; padding:16px; margin-bottom:16px;">
          <b style="font-size:15.5px; color:#8B1518; display:block; margin-bottom:4px;">${g.title}</b>
          ${inner}
        </div>
      `;
    });

    // Lấy nội dung bài đọc từ cache (nếu đã từng highlight) hoặc render gốc
    const cachedHtml = this.readingHighlightsCache[idx];
    const passageContent = cachedHtml || `
      <h3 style="margin:0 0 12px 0; color:#8B1518; font-size:18px;">${passage.title || `READING PASSAGE ${idx + 1}`}</h3>
      <div style="line-height:1.8; font-size:15px; color:#1E293B;">${passage.passageHtml || passage.passageText || ''}</div>
    `;

    box.innerHTML = `
      <div id="ftReadSplitWrap" style="display:flex; height:calc(100vh - 215px); position:relative; user-select:none;">
        <div id="ftReadLeftPane" class="reading-passage-split" style="width:50%; height:100%; overflow-y:auto; margin-bottom:0; padding:24px 26px; box-sizing:border-box; line-height:1.8; font-size:15px; color:#1E293B; background:#FFFFFF; border:2px solid #E8E2D8; border-left:6px solid #8B1518; border-radius:18px;">
          ${passageContent}
        </div>
        <div id="ftReadResizer" style="width:20px; cursor:col-resize; display:flex; align-items:center; justify-content:center; z-index:10; flex-shrink:0;">
          <div style="width:34px; height:60px; background:#FFFFFF; border:2.5px solid #E8E2D8; border-bottom:5px solid #D3CBC0; border-radius:18px; display:flex; align-items:center; justify-content:center; color:#8B1518; font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <i class="fa-solid fa-arrows-left-right"></i>
          </div>
        </div>
        <div id="ftReadRightPane" style="flex:1; height:100%; overflow-y:auto; padding-right:4px; box-sizing:border-box;">
          ${qContentHtml}
        </div>
      </div>
    `;

    this.restorePassageInputs();
    this.initDraggableResizer('ftReadSplitWrap', 'ftReadLeftPane', 'ftReadResizer', 'ftReadRightPane');
    this.initTextHighlighter(document.getElementById('ftReadLeftPane'));
  }

  // =========================================================================
  // 4. GHI NHẬN ĐÁP ÁN & KHÔI PHỤC DỮ LIỆU
  // =========================================================================
  recordAnswer(qId, val) {
    if (this.isReviewMode) return;
    this.userAnswers[qId] = String(val).trim();
  }

  restorePassageInputs() {
    Object.entries(this.userAnswers).forEach(([qid, val]) => {
      const inp = document.getElementById(`inp_ft_read_${qid}`);
      if (inp) inp.value = val;

      const rad = document.querySelector(`input[name="rad_ft_read_${qid}"][value="${val}"]`);
      if (rad) rad.checked = true;
    });
  }

  // =========================================================================
  // 5. BỘ CHIA MÀN HÌNH RESIZER DUOLINGO 3D (CHUỘT & CẢM ỨNG)
  // =========================================================================
  initDraggableResizer(wrapId, leftId, resizerId, rightId) {
    const wrap = document.getElementById(wrapId);
    const left = document.getElementById(leftId);
    const resizer = document.getElementById(resizerId);
    if (!wrap || !left || !resizer) return;

    let isDragging = false;
    const handle = resizer.querySelector('div');

    const onMouseDown = () => {
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      if (handle) {
        handle.style.transform = 'scale(0.92)';
        handle.style.borderBottomWidth = '2px';
        handle.style.background = '#FFF5F5';
      }
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const wrapRect = wrap.getBoundingClientRect();
      const pointerX = e.clientX || (e.touches && e.touches[0].clientX);
      if (!pointerX) return;

      const offset = pointerX - wrapRect.left;
      let pct = (offset / wrapRect.width) * 100;
      if (pct < 25) pct = 25;
      if (pct > 75) pct = 75;

      left.style.width = `${pct}%`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (handle) {
        handle.style.transform = 'scale(1)';
        handle.style.borderBottomWidth = '5px';
        handle.style.background = '#FFFFFF';
      }
    };

    resizer.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    resizer.addEventListener('touchstart', onMouseDown);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);
  }

  // =========================================================================
  // 6. CÔNG CỤ HIGHLIGHT KHÔNG GIỚI HẠN (TÔ VÀNG & XÓA BẰNG CLICK)
  // =========================================================================
  initTextHighlighter(container) {
    if (!container) return;

    let pop = document.getElementById('ft_highlighter_pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'ft_highlighter_pop';
      pop.style.cssText = `
        position: fixed; display: none; z-index: 999999;
        background: #1E293B; border-radius: 8px; padding: 4px 6px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3); gap: 4px; align-items: center;
      `;
      pop.innerHTML = `
        <button type="button" id="btnDoFtHighlight" style="background:#FEF08A; color:#854D0E; border:none; border-radius:5px; padding:5px 9px; font-weight:800; font-size:12px; cursor:pointer;">
          🖍 Tô vàng
        </button>
        <button type="button" id="btnClearFtHighlight" style="background:#475569; color:white; border:none; border-radius:5px; padding:5px 9px; font-weight:800; font-size:12px; cursor:pointer;">
          ✕ Hủy
        </button>
      `;
      document.body.appendChild(pop);
    }

    let savedRange = null;

    const checkSelection = (e) => {
      // Nếu bấm vào vùng đã bôi vàng -> hiển thị hộp thoại xóa trực tiếp
      if (e.target && e.target.classList.contains('ielts-user-highlight')) {
        if (confirm("Em có muốn xóa đoạn bôi vàng này không?")) {
          const markEl = e.target;
          const parent = markEl.parentNode;
          while (markEl.firstChild) parent.insertBefore(markEl.firstChild, markEl);
          parent.removeChild(markEl);
          if (pop) pop.style.display = 'none';
          return;
        }
      }

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        if (pop && !pop.contains(e.target)) pop.style.display = 'none';
        return;
      }

      savedRange = sel.getRangeAt(0).cloneRange();
      const rect = savedRange.getBoundingClientRect();

      pop.style.top = `${Math.max(10, rect.top - 42)}px`;
      pop.style.left = `${Math.max(10, rect.left + rect.width / 2 - 50)}px`;
      pop.style.display = 'flex';
    };

    container.removeEventListener('mouseup', checkSelection);
    container.addEventListener('mouseup', checkSelection);

    document.getElementById('btnDoFtHighlight').onclick = (e) => {
      e.stopPropagation();
      if (!savedRange) return;
      const span = document.createElement('mark');
      span.style.cssText = 'background:#FEF08A; color:inherit; padding:1px 2px; border-radius:3px; cursor:pointer;';
      span.className = 'ielts-user-highlight';
      span.title = 'Bấm vào để xóa bôi vàng';

      try {
        savedRange.surroundContents(span);
      } catch (err) {
        try {
          span.appendChild(savedRange.extractContents());
          savedRange.insertNode(span);
        } catch (e2) {}
      }

      if (pop) pop.style.display = 'none';
      window.getSelection().removeAllRanges();
      savedRange = null;
    };

    document.getElementById('btnClearFtHighlight').onclick = (e) => {
      e.stopPropagation();
      if (pop) pop.style.display = 'none';
      window.getSelection().removeAllRanges();
      savedRange = null;
    };
  }

  // =========================================================================
  // 7. ĐỐI SOÁT ĐÁP ÁN, TÍNH BAND & RENDER REVIEW MODE
  // =========================================================================
  evaluate() {
    let rCorrect = 0;
    let totalQuestions = 0;

    this.readPassages.forEach(p => {
      const expAnswers = p.answers || {};
      Object.entries(expAnswers).forEach(([qid, exp]) => {
        totalQuestions++;
        const u = (this.userAnswers[qid] || '').toLowerCase().trim();
        if (!u) return;

        let normUser = u;
        if (u === 't') normUser = 'true';
        if (u === 'f') normUser = 'false';
        if (u === 'ng') normUser = 'not given';
        if (u === 'y') normUser = 'yes';
        if (u === 'n') normUser = 'no';

        if (Array.isArray(exp)) {
          if (exp.some(a => String(a).toLowerCase().trim() === normUser || String(a).toLowerCase().trim() === u)) rCorrect++;
        } else {
          const e = String(exp).toLowerCase().trim();
          if (normUser === e || u === e) rCorrect++;
        }
      });
    });

    return {
      rCorrect,
      total: totalQuestions || 40,
      band: this.calculateReadingBand(rCorrect)
    };
  }

  calculateReadingBand(correct) {
    if (!correct || correct <= 0) return "0.0";
    if (correct >= 39) return "9.0";
    if (correct >= 37) return "8.5";
    if (correct >= 35) return "8.0";
    if (correct >= 32) return "7.5";
    if (correct >= 30) return "7.0";
    if (correct >= 26) return "6.5";
    if (correct >= 23) return "6.0";
    if (correct >= 18) return "5.5";
    if (correct >= 16) return "5.0";
    if (correct >= 13) return "4.5";
    if (correct >= 10) return "4.0";
    if (correct >= 8)  return "3.5";
    if (correct >= 6)  return "3.0";
    if (correct >= 4)  return "2.5";
    if (correct >= 3)  return "2.0";
    return "1.0";
  }

  renderReviewMode() {
    this.isReviewMode = true;
    this.readPassages.forEach(p => {
      Object.entries(p.answers || {}).forEach(([qid, exp]) => {
        const inp = document.getElementById(`inp_ft_read_${qid}`);
        const u = (this.userAnswers[qid] || '').toLowerCase().trim();

        let normUser = u;
        if (u === 't') normUser = 'true';
        if (u === 'f') normUser = 'false';
        if (u === 'ng') normUser = 'not given';
        if (u === 'y') normUser = 'yes';
        if (u === 'n') normUser = 'no';

        let isCorrect = false;
        if (u) {
          if (Array.isArray(exp)) {
            isCorrect = exp.some(a => String(a).toLowerCase().trim() === normUser || String(a).toLowerCase().trim() === u);
          } else {
            isCorrect = normUser === String(exp).toLowerCase().trim() || u === String(exp).toLowerCase().trim();
          }
        }

        if (inp) {
          inp.style.background = isCorrect ? '#DCFCE7' : '#FEE2E2';
          inp.disabled = true;
        }
      });
    });
  }

  restore(savedAnswers) {
    this.isReviewMode = true;
    this.userAnswers = savedAnswers || {};
    this.switchPassage(0);
    this.renderReviewMode();
  }
}

export const ftReadingSection = new FtReadingSection();
window.ftReadingSection = ftReadingSection;
