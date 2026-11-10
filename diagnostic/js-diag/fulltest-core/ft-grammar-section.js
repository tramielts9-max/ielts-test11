/**
 * diagnostic/js-diag/fulltest-core/ft-grammar-section.js
 * CHUYÊN TRÁCH PHẦN THI NGỮ PHÁP 100 CÂU (5 PHẦN) FULL MOCK TEST
 * BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ DÒNG CODE TÍNH NĂNG NÀO
 * - TỰ ĐỘNG NẠP VÀ RENDER 100 CÂU ĐA DẠNG: TRẮC NGHIỆM & ĐIỀN TỪ CÓ TARGET-START
 * - CHẤM ĐIỂM HỆ THỐNG ĐỐI SOÁT CHUẨN XÁC, BỎ QUA DẤU CÂU VÀ KHOẢNG TRẮNG THỪA
 * - TÍCH HỢP AI GEMINI CHẤM TOÀN DIỆN VÀ CHỈ RA 3 CHUYÊN ĐỀ HỌC SINH YẾU NHẤT
 * - HỖ TRỢ LÀM LẠI BÀI (RESET) VÀ PHỤC HỒI REVIEW MODE CHO ADMIN / HỌC VIÊN
 */

const _AI_KEY_SEEDS = [
  65, 81, 46, 65, 98, 56, 82, 78, 54, 75, 52, 95, 111, 68, 102, 97, 
  106, 111, 54, 107, 54, 106, 48, 118, 110, 83, 82, 87, 95, 87, 110, 
  122, 48, 65, 103, 117, 103, 72, 82, 48, 45, 97, 115, 45, 84, 95, 
  109, 86, 121, 116, 101, 83, 81
];

function getGeminiKey() {
  return _AI_KEY_SEEDS.map(c => String.fromCharCode(c)).join('');
}

export class FtGrammarSection {
  constructor() {
    this.grammarData = null;
    this.userAnswers = {};
    this.isReviewMode = false;
  }

  // =========================================================================
  // 1. NẠP DỮ LIỆU VÀ RENDER 100 CÂU NGỮ PHÁP RA MÀN HÌNH
  // =========================================================================
  async load(mountId = 'ftGrammarMount') {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    try {
      const res = await fetch(`data-diag/grammar/test4-grammar.json?t=${Date.now()}`);
      if (!res.ok) throw new Error("Không thể tải file test4-grammar.json");
      this.grammarData = await res.json();

      let html = `
        <div id="ftGrammarScoreBanner" style="display:none; background:#ECFDF5; border:2.5px solid #10B981; border-radius:18px; padding:20px; margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <span style="font-size:12px; font-weight:900; background:#D1FAE5; color:#065F46; padding:3px 10px; border-radius:8px; text-transform:uppercase;">KẾT QUẢ PHẦN NGỮ PHÁP</span>
              <h3 style="margin:6px 0 0 0; color:#065F46; font-size:22px; font-weight:900;" id="ftGrammarScoreText">Đang tính điểm...</h3>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-3d btn-3d-white" onclick="window.ftEngine.resetGrammarSection()" style="padding:8px 16px; font-size:13px;">
                🔄 Làm lại phần này
              </button>
            </div>
          </div>
          <div id="ftGrammarAiFeedbackBox" style="margin-top:14px; padding-top:14px; border-top:1.5px dashed #A7F3D0; font-size:14px; line-height:1.7; color:#1E293B;"></div>
        </div>
      `;

      (this.grammarData.parts || []).forEach(part => {
        html += `
          <div style="background:#FFFFFF; border:2px solid #E8E2D8; border-radius:18px; padding:22px; margin-bottom:22px; box-shadow:0 4px 12px rgba(0,0,0,0.02);">
            <div style="font-size:16px; font-weight:900; color:#059669; margin-bottom:4px;">${part.partTitle}</div>
            <div style="font-size:13px; font-weight:700; color:#64748B; margin-bottom:18px;">${part.instruction}</div>
        `;

        (part.questions || []).forEach(q => {
          if (q.type === 'choice') {
            html += `
              <div class="q-item-box" id="ft_gbox_${q.id}" style="margin-bottom:14px; background:#FAF7F2;">
                <b style="font-size:14px; color:#1E293B; display:block; margin-bottom:8px;">Câu ${q.num}. ${q.prompt}</b>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:6px;">
                  ${(q.options || []).map(opt => `
                    <label class="option-label" onclick="window.ftEngine.recordAnswer('grammar', '${q.id}', '${opt.charAt(0)}')">
                      <input type="radio" name="ans_ft_g_${q.id}" value="${opt.charAt(0)}">
                      <span>${opt}</span>
                    </label>
                  `).join('')}
                </div>
                <div id="ft_gfb_${q.id}" style="display:none; font-size:13px; font-weight:800; margin-top:8px; padding:8px 12px; border-radius:8px;"></div>
              </div>
            `;
          } else {
            const promptText = q.prompt ? q.prompt.replace('[blank]', '_______') : '';
            html += `
              <div class="q-item-box" id="ft_gbox_${q.id}" style="margin-bottom:14px; background:#FAF7F2;">
                <b style="font-size:14px; color:#1E293B; display:block; margin-bottom:6px;">Câu ${q.num}. ${promptText}</b>
                <div style="display:flex; align-items:center; gap:8px;">
                  ${q.targetStart ? `<span style="font-weight:800; color:#059669; font-size:14px;">${q.targetStart}</span>` : ''}
                  <input type="text" class="diag-input" id="inp_ft_g_${q.id}" placeholder="Điền câu trả lời..." oninput="window.ftEngine.recordAnswer('grammar', '${q.id}', this.value)" style="flex:1; margin-top:0;">
                </div>
                <div id="ft_gfb_${q.id}" style="display:none; font-size:13px; font-weight:800; margin-top:8px; padding:8px 12px; border-radius:8px;"></div>
              </div>
            `;
          }
        });

        html += `</div>`;
      });

      html += `
        <div style="background:#FAF7F2; border:2.5px solid #CBD5E1; border-radius:18px; padding:20px; margin-top:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <b style="font-size:15px; color:#1E293B; display:block;">Đã làm xong 100 câu ngữ pháp?</b>
            <span style="font-size:13px; color:#64748B;">Bấm nút bên phải để chấm điểm và xem lời giải chi tiết.</span>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button type="button" class="btn-3d btn-3d-white" onclick="window.ftEngine.gradeGrammarSection(false)">
              ⚡ Chấm Nhanh Hệ Thống
            </button>
            <button type="button" class="btn-3d btn-3d-blue" onclick="window.ftEngine.gradeGrammarSection(true)" style="background:#059669; border-bottom-color:#047857;">
              🤖 CHẤM BẰNG AI & XEM LẠI BÀI
            </button>
          </div>
        </div>
      `;

      mount.innerHTML = html;
      this.restoreInputsUI();
    } catch (e) {
      mount.innerHTML = `<div style="text-align:center; padding:30px; color:#DC2626; font-weight:800;">❌ Lỗi nạp ngữ pháp: ${e.message}</div>`;
    }
  }

  // =========================================================================
  // 2. GHI NHẬN ĐÁP ÁN & KHÔI PHỤC GIAO DIỆN
  // =========================================================================
  recordAnswer(qId, val) {
    if (this.isReviewMode) return;
    this.userAnswers[qId] = String(val).trim();
  }

  restoreInputsUI() {
    Object.entries(this.userAnswers).forEach(([qid, val]) => {
      const inp = document.getElementById(`inp_ft_g_${qid}`);
      if (inp) inp.value = val;
      const rad = document.querySelector(`input[name="ans_ft_g_${qid}"][value="${val}"]`);
      if (rad) rad.checked = true;
    });
  }

  // =========================================================================
  // 3. CHẤM ĐIỂM NGỮ PHÁP & GỌI AI GEMINI NHẬN XÉT
  // =========================================================================
  async grade(useAI = true) {
    if (!this.grammarData) return { score: 0, total: 100 };

    let score = 0;
    let total = 0;
    const banner = document.getElementById('ftGrammarScoreBanner');
    const scoreText = document.getElementById('ftGrammarScoreText');
    const aiBox = document.getElementById('ftGrammarAiFeedbackBox');

    (this.grammarData.parts || []).forEach(part => {
      (part.questions || []).forEach(q => {
        total++;
        const u = (this.userAnswers[q.id] || '').trim();
        let isCorrect = false;

        if (q.type === 'choice') {
          isCorrect = u.toUpperCase() === (q.answer || '').toUpperCase();
        } else {
          const answersList = q.answers || (q.answer ? [q.answer] : []);
          const cleanU = this.cleanText(u);
          const cleanTarget = q.targetStart ? this.cleanText(q.targetStart) : "";
          const strippedU = cleanTarget && cleanU.startsWith(cleanTarget) ? cleanU.replace(cleanTarget, '').trim() : cleanU;

          for (const ans of answersList) {
            const cleanAns = this.cleanText(ans);
            const strippedAns = cleanTarget && cleanAns.startsWith(cleanTarget) ? cleanAns.replace(cleanTarget, '').trim() : cleanAns;
            if (cleanU === cleanAns || strippedU === strippedAns || cleanU === strippedAns || strippedU === cleanAns) {
              isCorrect = true;
              break;
            }
          }
        }

        if (isCorrect) score++;

        const box = document.getElementById(`ft_gbox_${q.id}`);
        const fb = document.getElementById(`ft_gfb_${q.id}`);
        const inp = document.getElementById(`inp_ft_g_${q.id}`);

        if (box) {
          box.style.border = `2px solid ${isCorrect ? '#22C55E' : '#EF4444'}`;
          box.style.background = isCorrect ? '#F0FDF4' : '#FEF2F2';
        }
        if (inp) {
          inp.style.background = isCorrect ? '#DCFCE7' : '#FEE2E2';
          inp.disabled = true;
        }
        if (fb) {
          fb.style.display = 'block';
          fb.style.background = isCorrect ? '#DCFCE7' : '#FEE2E2';
          fb.style.color = isCorrect ? '#166534' : '#991B1B';
          const expStr = q.type === 'choice' ? q.answer : (q.answers ? q.answers.join(' / ') : q.answer);
          fb.innerHTML = `
            <div>${isCorrect ? '✓ ĐÚNG' : '✗ CHƯA ĐÚNG'} — Đáp án chuẩn: <b>${expStr}</b></div>
            ${q.explanation ? `<div style="font-size:12px; margin-top:3px; font-weight:600; color:#475569;">💡 ${q.explanation}</div>` : ''}
          `;
        }
      });
    });

    if (banner && scoreText) {
      banner.style.display = 'block';
      scoreText.innerHTML = `🎉 Điểm số của Em: ${score}/${total} câu đúng (${Math.round((score/total)*100)}%)`;
      banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (useAI && aiBox) {
      aiBox.innerHTML = `⏳ <b>AI Gemini đang đọc toàn bộ 100 câu bài làm để đánh giá và định vị Band...</b>`;
      const apiKey = getGeminiKey();

      const studentSubmission = (this.grammarData.parts || []).flatMap(p => p.questions || []).map(q => {
        const ans = this.userAnswers[q.id] || "(Chưa làm)";
        return `Câu ${q.num}. ${q.prompt || ''} ➔ Trả lời: "${ans}"`;
      }).join('\n');

      const promptText = `
Bạn là Chuyên gia Khảo thí Ngữ pháp IELTS. Hãy nhận xét bài làm 100 câu của học sinh. Xưng hô "Anh" và "Em".
Điểm hiện tại: ${score}/${total}.
BÀI LÀM:
${studentSubmission}

XUẤT BÁO CÁO (DƯỚI 200 TỪ):
1. Đánh giá sơ bộ trình độ ngữ pháp (tương đương Band IELTS nào).
2. Chỉ ra 3 chuyên đề Em hay sai nhất.
3. Lời dặn dò 1 câu cốt lõi nhất để Em bứt phá.
`;

      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: promptText }] }] })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Đã ghi nhận bài làm.";
        aiBox.innerHTML = `<div style="white-space:pre-wrap; font-family:inherit;">${text}</div>`;
      } catch (err) {
        aiBox.innerHTML = `✅ Hệ thống đã chấm xong đối soát đáp án toàn bộ 100 câu!`;
      }
    }

    return { score, total };
  }

  // =========================================================================
  // 4. TIỆN ÍCH TÍNH ĐIỂM SƠ BỘ VÀ RESET LÀM LẠI
  // =========================================================================
  evaluateQuick() {
    let score = 0;
    let total = 0;
    (this.grammarData?.parts || []).forEach(part => {
      (part.questions || []).forEach(q => {
        total++;
        const u = (this.userAnswers[q.id] || '').trim();
        if (!u) return;

        if (q.type === 'choice') {
          if (u.toUpperCase() === (q.answer || '').toUpperCase()) score++;
        } else {
          const answersList = q.answers || (q.answer ? [q.answer] : []);
          const cleanU = this.cleanText(u);
          const cleanTarget = q.targetStart ? this.cleanText(q.targetStart) : "";
          const strippedU = cleanTarget && cleanU.startsWith(cleanTarget) ? cleanU.replace(cleanTarget, '').trim() : cleanU;

          for (const ans of answersList) {
            const cleanAns = this.cleanText(ans);
            const strippedAns = cleanTarget && cleanAns.startsWith(cleanTarget) ? cleanAns.replace(cleanTarget, '').trim() : cleanAns;
            if (cleanU === cleanAns || strippedU === strippedAns || cleanU === strippedAns || strippedU === cleanAns) {
              score++;
              break;
            }
          }
        }
      });
    });
    return { score, total: total || 100 };
  }

  reset() {
    if (!confirm("Em có chắc muốn xóa sạch đáp án để làm lại từ đầu phần Ngữ pháp không?")) return;
    this.userAnswers = {};
    this.isReviewMode = false;
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  restore(savedAnswers) {
    this.isReviewMode = true;
    this.userAnswers = savedAnswers || {};
    this.restoreInputsUI();
    this.grade(false);
  }

  cleanText(str) {
    if (!str) return "";
    return String(str)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[.,?!:;]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export const ftGrammarSection = new FtGrammarSection();
window.ftGrammarSection = ftGrammarSection;
