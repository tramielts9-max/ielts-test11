/**
 * diagnostic/js-diag/fulltest-core/ft-prod-section.js
 * CHUYÊN TRÁCH PRODUCTIVE SKILLS (WRITING & SPEAKING) FULL MOCK TEST
 * BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ DÒNG CODE TÍNH NĂNG NÀO
 * - WRITING: RENDER TASK 1 & TASK 2, ĐẾM TỪ REALTIME ĐỔI MÀU (150 TỪ / 250 TỪ)
 * - SPEAKING: FULL FORMAT CAMBRIDGE (8 CÂU PART 1, 1 CUE CARD PART 2, 4 CÂU PART 3)
 * - TÍCH HỢP WEB SPEECH API CHUYỂN GIỌNG NÓI THÀNH VĂN BẢN (STT) KÈM ĐẾM TỪ REALTIME
 * - CHẤM ĐIỂM CHUẨN XÁC: WRITING THEO TRỌNG SỐ (T1*1 + T2*2)/3, KHÓA CỨNG BỎ TRỐNG = 0.0
 * - HỖ TRỢ PHỤC HỒI DỮ LIỆU ĐÃ LÀM KÈM REVIEW MODE KHÓA CHỈNH SỬA
 */

export class FtProdSection {
  constructor() {
    this.userAnswers = {
      writing: {
        task1: '',
        task2: ''
      },
      speaking: {}
    };

    this.speechRecognition = null;
    this.isRecording = false;
    this.isReviewMode = false;
  }

  // =========================================================================
  // 1. KHỞI TẠO MICROPHONE WEB SPEECH API
  // =========================================================================
  initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) return;

    this.speechRecognition = new window.SpeechRecognition();
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';
  }

  // =========================================================================
  // 2. RENDER GIAO DIỆN WRITING (TASK 1 & TASK 2 KÈM BỘ ĐẾM TỪ REALTIME)
  // =========================================================================
  renderWriting(mountId = 'ftWritingMount') {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    mount.innerHTML = `
      <!-- KHUNG BÀI LÀM TASK 1 -->
      <div style="background:#FAF7F2; border:2.5px solid #BFDBFE; border-radius:18px; padding:20px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <b style="font-size:16.5px; color:#1E40AF;">📊 TASK 1: BÁO CÁO BIỂU ĐỒ (TỐI THIỂU 150 TỪ)</b>
          <span style="font-size:12.5px; font-weight:800; background:#DBEAFE; color:#1E40AF; padding:4px 12px; border-radius:10px;">Khuyến nghị 20 phút</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px; align-items:start;">
          <div style="background:#FFFFFF; border:1.5px solid #CBD5E1; border-radius:14px; padding:16px;">
            <p style="font-size:14px; color:#1E293B; line-height:1.6; margin:0 0 12px 0;">
              <b>Đề bài:</b> "The graph below shows the price of different kinds of bread, in dollars, from 2001 to 2005. Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
            </p>
            <div style="text-align:center;">
              <img src="../writing task 1/images_task1/task1_img_104.jpeg" 
                   alt="Biểu đồ Task 1" 
                   style="max-width:100%; max-height:340px; border-radius:8px; object-fit:contain;"
                   onerror="this.src='data-diag/writing/task1_img_104.jpeg'">
            </div>
          </div>
          <div>
            <textarea id="ft_writing_task1" 
                      class="diag-textarea" 
                      style="height:380px;" 
                      placeholder="Bắt đầu viết bài Task 1 tại đây..." 
                      oninput="window.ftProdSection.updateWordCount('ft_writing_task1', 'wc_task1', 150)"></textarea>
            <div style="text-align:right; font-size:13px; font-weight:800; color:#D97706; margin-top:6px;" id="wc_task1">
              0 từ (Yêu cầu tối thiểu 150 từ)
            </div>
          </div>
        </div>
      </div>

      <!-- KHUNG BÀI LÀM TASK 2 -->
      <div style="background:#FAF7F2; border:2.5px solid #DDD6FE; border-radius:18px; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <b style="font-size:16.5px; color:#7C3AED;">📝 TASK 2: BÀI LUẬN NGHỊ LUẬN (TỐI THIỂU 250 TỪ)</b>
          <span style="font-size:12.5px; font-weight:800; background:#EDE9FE; color:#6D28D9; padding:4px 12px; border-radius:10px;">Khuyến nghị 40 phút</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px; align-items:start;">
          <div style="background:#FFFFFF; border:1.5px solid #CBD5E1; border-radius:14px; padding:18px;">
            <p style="font-size:14.5px; color:#1E293B; line-height:1.7; margin:0;">
              <b>Đề bài:</b> "The typical teaching situation between students and teachers in the classroom will be gone by the year 2050. To what extent do you agree or disagree?"
            </p>
            <div style="margin-top:14px; padding:10px; background:#F8FAFC; border-left:4px solid #7C3AED; border-radius:6px; font-size:12.5px; color:#475569;">
              💡 <b>Gợi ý:</b> Trả lời đầy đủ câu hỏi, chia đoạn rõ ràng theo cấu trúc PEEL (Point - Explanation - Example - Link).
            </div>
          </div>
          <div>
            <textarea id="ft_writing_task2" 
                      class="diag-textarea" 
                      style="height:420px;" 
                      placeholder="Bắt đầu viết bài luận Task 2 tại đây..." 
                      oninput="window.ftProdSection.updateWordCount('ft_writing_task2', 'wc_task2', 250)"></textarea>
            <div style="text-align:right; font-size:13px; font-weight:800; color:#D97706; margin-top:6px;" id="wc_task2">
              0 từ (Yêu cầu tối thiểu 250 từ)
            </div>
          </div>
        </div>
      </div>
    `;

    this.restoreWritingInputs();
  }

  // =========================================================================
  // 3. XỬ LÝ ĐẾM TỪ REALTIME ĐỔI MÀU CẢNH BÁO
  // =========================================================================
  updateWordCount(areaId, counterId, minReq = 150) {
    if (this.isReviewMode) return;
    const el = document.getElementById(areaId);
    const val = el ? el.value.trim() : '';
    const words = this.countWords(val);

    const cEl = document.getElementById(counterId);
    if (cEl) {
      if (words >= minReq) {
        cEl.style.color = "#059669";
        cEl.innerText = `✓ ${words} từ (Đã đạt chuẩn tối thiểu ${minReq} từ)`;
      } else {
        cEl.style.color = "#D97706";
        cEl.innerText = `⚠️ ${words} từ (Cần tối thiểu ${minReq} từ)`;
      }
    }

    if (areaId === 'ft_writing_task1') this.userAnswers.writing.task1 = val;
    if (areaId === 'ft_writing_task2') this.userAnswers.writing.task2 = val;
  }

  countWords(str) {
    if (!str || typeof str !== 'string') return 0;
    const cleaned = str.replace(/[\r\n\t]+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    if (!cleaned) return 0;
    return cleaned.split(/\s+/).filter(Boolean).length;
  }

  // =========================================================================
  // 4. RENDER GIAO DIỆN SPEAKING (FULL 3 PARTS CAMBRIDGE)
  // =========================================================================
  renderSpeaking(mountId = 'ftSpeakingMount') {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    this.initSpeechRecognition();

    const p1Questions = [
      { id: "ft_spk_p1_1", text: "What city or town do you live in, and is it a big city or a small place?", topic: "Hometown" },
      { id: "ft_spk_p1_2", text: "What do you like most about your hometown, and is there anything you dislike about it?", topic: "Hometown" },
      { id: "ft_spk_p1_3", text: "What is your hometown famous for?", topic: "Hometown" },
      { id: "ft_spk_p1_4", text: "Is your hometown a good place for young people to pursue their future careers? Why?", topic: "Hometown" },
      { id: "ft_spk_p1_5", text: "Do you prefer to spend your free time with one close friend or with a large group of friends?", topic: "Friends" },
      { id: "ft_spk_p1_6", text: "Where do you and your friends usually meet when you hang out?", topic: "Friends" },
      { id: "ft_spk_p1_7", text: "Do you have a friend that you have known for a very long time?", topic: "Friends" },
      { id: "ft_spk_p1_8", text: "Why are true friends so important in modern stressful life?", topic: "Friends" }
    ];

    const p3Questions = [
      { id: "ft_spk_p3_1", text: "What factors drive people toward ambitious goals in competitive societies?" },
      { id: "ft_spk_p3_2", text: "Do you think financial wealth alone is an accurate measure of a person's life success?" },
      { id: "ft_spk_p3_3", text: "Is it always healthy for young people to be intensely ambitious in their early careers?" },
      { id: "ft_spk_p3_4", text: "Should parents unconditionally support their children's unconventional career ambitions?" }
    ];

    mount.innerHTML = `
      <!-- PART 1: 8 CÂU HỎI PHỎNG VẤN TRỰC TIẾP -->
      <div style="background:#FFFFFF; border:2px solid #E8E2D8; border-radius:18px; padding:20px; margin-bottom:20px;">
        <div style="border-bottom:1.5px dashed #E8E2D8; padding-bottom:8px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
          <b style="font-size:16px; color:#92400E;">🎤 PART 1: PHỎNG VẤN TRỰC TIẾP (8 CÂU HỎI - 2 CHỦ ĐỀ)</b>
          <span style="font-size:12px; font-weight:800; color:#64748B;">Khuyến nghị 4-5 phút</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr; gap:12px;">
          ${p1Questions.map((q, idx) => `
            <div class="q-item-box" style="margin-bottom:0; background:#FAF7F2; padding:14px;">
              <div style="font-size:14px; font-weight:800; color:#1E293B; margin-bottom:6px;">
                <span style="color:#D97706;">Câu ${idx + 1} (${q.topic}):</span> "${q.text}"
              </div>
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                <button type="button" 
                        class="btn-3d btn-3d-red" 
                        id="btn_rec_${q.id}" 
                        style="padding:6px 14px; font-size:12px;" 
                        onclick="window.ftProdSection.toggleSpeech('${q.id}', 'btn_rec_${q.id}', 'status_${q.id}')">
                  <i class="fa-solid fa-microphone"></i> Bấm để trả lời
                </button>
                <span id="status_${q.id}" style="font-size:12px; font-weight:800; color:#64748B;">Chưa ghi âm (0 từ)</span>
              </div>
              <textarea id="${q.id}" 
                        class="diag-textarea" 
                        style="height:65px;" 
                        placeholder="Transcript câu trả lời sẽ xuất hiện tại đây..." 
                        oninput="window.ftProdSection.recordSpeakingText('${q.id}', this.value, 'status_${q.id}')"></textarea>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- PART 2: 1 CUE CARD THUYẾT TRÌNH 2 PHÚT -->
      <div style="background:#FFFDF7; border:2.5px solid #FCD34D; border-radius:18px; padding:20px; margin-bottom:20px;">
        <div style="border-bottom:1.5px dashed #FCD34D; padding-bottom:8px; margin-bottom:14px;">
          <b style="font-size:16px; color:#B45309;">🎤 PART 2: THUYẾT TRÌNH CUE CARD CHUẨN THI THẬT (2 PHÚT)</b>
        </div>
        <div style="background:#FEF3C7; border:1px solid #FDE68A; border-radius:12px; padding:14px; margin-bottom:14px;">
          <b style="font-size:15px; color:#92400E; display:block; margin-bottom:6px;">
            Chủ đề: "Describe a person who did something difficult and was successful."
          </b>
          <div style="font-size:13px; color:#78350F; font-weight:700;">You should say:</div>
          <ul style="margin:4px 0 0 18px; padding:0; font-size:13px; color:#78350F; line-height:1.6;">
            <li>Who this person is and how you know him/her</li>
            <li>What difficult challenge this person tackled</li>
            <li>Why and how he or she was able to succeed</li>
            <li>And explain how you feel about this person's achievement</li>
          </ul>
        </div>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <button type="button" 
                  class="btn-3d btn-3d-red" 
                  id="btn_rec_ft_spk_part2" 
                  style="padding:10px 20px; font-size:13.5px;" 
                  onclick="window.ftProdSection.toggleSpeech('ft_spk_part2', 'btn_rec_ft_spk_part2', 'status_ft_spk_part2')">
            <i class="fa-solid fa-microphone"></i> Bấm để nói Part 2 (Thuyết trình 2 phút)
          </button>
          <span id="status_ft_spk_part2" style="font-size:12.5px; font-weight:800; color:#64748B;">Chưa ghi âm (0 từ)</span>
        </div>
        <textarea id="ft_spk_part2" 
                  class="diag-textarea" 
                  style="height:110px;" 
                  placeholder="Transcript Part 2..." 
                  oninput="window.ftProdSection.recordSpeakingText('ft_spk_part2', this.value, 'status_ft_spk_part2')"></textarea>
      </div>

      <!-- PART 3: 4 CÂU HỎI THẢO LUẬN XÃ HỘI CHUYÊN SÂU -->
      <div style="background:#FFFFFF; border:2px solid #E8E2D8; border-radius:18px; padding:20px;">
        <div style="border-bottom:1.5px dashed #E8E2D8; padding-bottom:8px; margin-bottom:14px;">
          <b style="font-size:16px; color:#92400E;">🎤 PART 3: THẢO LUẬN & PHẢN BIỆN CHUYÊN SÂU (4 CÂU HỎI)</b>
        </div>
        <div style="display:grid; grid-template-columns:1fr; gap:12px;">
          ${p3Questions.map((q, idx) => `
            <div class="q-item-box" style="margin-bottom:0; background:#FAF7F2; padding:14px;">
              <div style="font-size:14px; font-weight:800; color:#1E293B; margin-bottom:6px;">
                <span style="color:#D97706;">Câu ${idx + 1}:</span> "${q.text}"
              </div>
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                <button type="button" 
                        class="btn-3d btn-3d-red" 
                        id="btn_rec_${q.id}" 
                        style="padding:6px 14px; font-size:12px;" 
                        onclick="window.ftProdSection.toggleSpeech('${q.id}', 'btn_rec_${q.id}', 'status_${q.id}')">
                  <i class="fa-solid fa-microphone"></i> Bấm để trả lời
                </button>
                <span id="status_${q.id}" style="font-size:12px; font-weight:800; color:#64748B;">Chưa ghi âm (0 từ)</span>
              </div>
              <textarea id="${q.id}" 
                        class="diag-textarea" 
                        style="height:65px;" 
                        placeholder="Transcript câu trả lời sẽ xuất hiện tại đây..." 
                        oninput="window.ftProdSection.recordSpeakingText('${q.id}', this.value, 'status_${q.id}')"></textarea>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.restoreSpeakingInputs();
  }

  // =========================================================================
  // 5. THU ÂM & CHUYỂN GIỌNG NÓI THÀNH VĂN BẢN (STT)
  // =========================================================================
  toggleSpeech(targetId, btnId, statusId) {
    if (!this.speechRecognition) {
      alert("Trình duyệt chưa hỗ trợ Web Speech! Em có thể gõ trực tiếp câu trả lời vào ô nhé.");
      return;
    }

    const btn = document.getElementById(btnId);
    const area = document.getElementById(targetId);
    const statusEl = statusId ? document.getElementById(statusId) : null;

    if (!this.isRecording) {
      try {
        this.speechRecognition.start();
        this.isRecording = true;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-stop"></i> Đang thu âm... Bấm dừng`;
        if (statusEl) {
          statusEl.style.color = "#DC2626";
          statusEl.innerText = "● Đang thu âm giọng nói...";
        }

        this.speechRecognition.onresult = (e) => {
          let str = '';
          for (let i = 0; i < e.results.length; ++i) str += e.results[i][0].transcript + ' ';
          const fullText = str.trim();
          if (area) {
            area.value = fullText;
            this.userAnswers.speaking[targetId] = fullText;
            const words = this.countWords(fullText);
            if (statusEl) {
              statusEl.style.color = "#059669";
              statusEl.innerText = `✓ Đã ghi nhận: ${words} từ`;
            }
          }
        };

        this.speechRecognition.onerror = () => {
          this.isRecording = false;
          if (btn) btn.innerHTML = `<i class="fa-solid fa-microphone"></i> Bấm để nói lại`;
        };
      } catch (e) {}
    } else {
      try {
        this.speechRecognition.stop();
        this.isRecording = false;
        if (btn) btn.innerHTML = `<i class="fa-solid fa-microphone"></i> Bấm để nói tiếp`;
        if (statusEl && area) {
          const words = this.countWords(area.value);
          statusEl.style.color = words > 0 ? "#059669" : "#64748B";
          statusEl.innerText = words > 0 ? `✓ Hoàn thành: ${words} từ` : "Chưa ghi âm";
        }
      } catch (e) {}
    }
  }

  recordSpeakingText(qId, val, statusId) {
    if (this.isReviewMode) return;
    this.userAnswers.speaking[qId] = String(val).trim();
    const statusEl = document.getElementById(statusId);
    if (statusEl) {
      const words = this.countWords(val);
      statusEl.style.color = words > 0 ? "#059669" : "#64748B";
      statusEl.innerText = words > 0 ? `✓ Đã nhập: ${words} từ` : "Chưa ghi âm (0 từ)";
    }
  }

  // =========================================================================
  // 6. CHẤM ĐIỂM CHUẨN XÁC: WRITING & SPEAKING
  // =========================================================================
  evaluateWriting() {
    const t1 = (document.getElementById('ft_writing_task1')?.value || this.userAnswers.writing.task1 || '').trim();
    const t2 = (document.getElementById('ft_writing_task2')?.value || this.userAnswers.writing.task2 || '').trim();

    this.userAnswers.writing.task1 = t1;
    this.userAnswers.writing.task2 = t2;

    const wt1Words = this.countWords(t1);
    const wt2Words = this.countWords(t2);

    let t1Band = 0.0;
    let t2Band = 0.0;

    // Chấm sơ bộ Task 1 (Hệ số 1)
    if (wt1Words === 0) t1Band = 0.0;
    else if (wt1Words < 30) t1Band = 2.0;
    else if (wt1Words < 80) t1Band = 3.5;
    else if (wt1Words < 150) t1Band = 5.0;
    else t1Band = 6.5;

    // Chấm sơ bộ Task 2 (Hệ số 2)
    if (wt2Words === 0) t2Band = 0.0;
    else if (wt2Words < 40) t2Band = 2.0;
    else if (wt2Words < 120) t2Band = 3.5;
    else if (wt2Words < 250) t2Band = 5.0;
    else t2Band = 6.5;

    let writeBand = "0.0";
    if (wt1Words === 0 && wt2Words === 0) {
      writeBand = "0.0";
    } else {
      const combined = (t1Band * 1 + t2Band * 2) / 3;
      const whole = Math.floor(combined);
      const dec = combined - whole;
      if (dec < 0.25) writeBand = whole.toFixed(1);
      else if (dec < 0.75) writeBand = (whole + 0.5).toFixed(1);
      else writeBand = (whole + 1.0).toFixed(1);
    }

    return {
      writeBand,
      t1Band: t1Band.toFixed(1),
      t2Band: t2Band.toFixed(1),
      wt1Words,
      wt2Words,
      t1Text: t1,
      t2Text: t2
    };
  }

  evaluateSpeaking() {
    const allSpkTranscripts = Object.values(this.userAnswers.speaking || {}).join(' ').trim();
    const spkAllWords = this.countWords(allSpkTranscripts);

    let spkBand = "0.0";
    if (spkAllWords === 0) {
      spkBand = "0.0";
    } else if (spkAllWords < 30) {
      spkBand = "2.0";
    } else if (spkAllWords < 80) {
      spkBand = "3.5";
    } else if (spkAllWords < 180) {
      spkBand = "5.0";
    } else if (spkAllWords < 300) {
      spkBand = "6.0";
    } else {
      spkBand = "7.0";
    }

    return {
      spkBand,
      totalWords: spkAllWords,
      transcripts: this.userAnswers.speaking
    };
  }

  // =========================================================================
  // 7. PHỤC HỒI DỮ LIỆU ĐÃ LÀM VÀ KHÓA CHỈNH SỬA (REVIEW MODE)
  // =========================================================================
  restoreWritingInputs() {
    const t1 = document.getElementById('ft_writing_task1');
    const t2 = document.getElementById('ft_writing_task2');
    if (t1 && this.userAnswers.writing.task1) {
      t1.value = this.userAnswers.writing.task1;
      this.updateWordCount('ft_writing_task1', 'wc_task1', 150);
      if (this.isReviewMode) t1.disabled = true;
    }
    if (t2 && this.userAnswers.writing.task2) {
      t2.value = this.userAnswers.writing.task2;
      this.updateWordCount('ft_writing_task2', 'wc_task2', 250);
      if (this.isReviewMode) t2.disabled = true;
    }
  }

  restoreSpeakingInputs() {
    Object.entries(this.userAnswers.speaking || {}).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        this.recordSpeakingText(id, val, `status_${id}`);
        if (this.isReviewMode) el.disabled = true;
      }
    });
  }

  restore(writingAnswers, speakingAnswers) {
    this.isReviewMode = true;
    if (writingAnswers) {
      this.userAnswers.writing.task1 = writingAnswers.task1 || '';
      this.userAnswers.writing.task2 = writingAnswers.task2 || '';
      this.restoreWritingInputs();
    }
    if (speakingAnswers) {
      this.userAnswers.speaking = speakingAnswers || {};
      this.restoreSpeakingInputs();
    }
  }
}

export const ftProdSection = new FtProdSection();
window.ftProdSection = ftProdSection;
