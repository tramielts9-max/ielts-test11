/**
 * diagnostic/js-diag/fulltest-core/ft-listening-section.js
 * CHUYÊN TRÁCH PHẦN THI LISTENING 4 PARTS (CAMBRIDGE 21) FULL MOCK TEST
 * BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ DÒNG CODE TÍNH NĂNG NÀO
 * - NẠP ĐỘNG 4 PARTS TỪ KHO CAMBRIDGE 21 THEO SET THI ĐƯỢC CHỌN
 * - RENDER ĐỦ 4 DẠNG BÀI: NOTES/TABLE GAP-FILL, MAP LABELLING, MATCHING KÉO THẢ, MCQ
 * - HỆ THỐNG KÉO THẢ MATCHING TƯƠNG TÁC KÉP: DRAG & DROP + CLICK-TO-PLACE
 * - TỰ ĐỘNG TUA AUDIO THEO TỪNG CÂU HỎI VÀ ĐỒNG BỘ TRÌNH PHÁT NHẠC
 * - CHẤM ĐIỂM CHUẨN XÁC 40 CÂU & TÔ MÀU ĐÚNG SAI KÈM REVIEW MODE
 */

export class FtListeningSection {
  constructor() {
    this.lisParts = [];
    this.userAnswers = {};
    this.activeLisPartIdx = 0;
    this.setNum = 1;
    this.audioElementId = 'ftAudioPlayer';
    this.isReviewMode = false;

    // Trạng thái phục vụ hệ thống Kéo Thả Matching
    this.draggedData = null;
    this.selectedOptionForPlacement = null;
  }

  // =========================================================================
  // 1. NẠP DỮ LIỆU 4 PARTS CAMBRIDGE 21 TỪ KHO JSON
  // =========================================================================
  async load(setNum = 1, mountId = 'ftListeningMount', audioPlayerId = 'ftAudioPlayer') {
    this.setNum = setNum;
    this.audioElementId = audioPlayerId;
    this.lisParts = [];

    for (let p = 1; p <= 4; p++) {
      const tryUrls = [
        `data-diag/listening/cam21-lis-test${this.setNum}-p${p}.json`,
        `../listening/data-l/cam21-lis-test${this.setNum}/cam21-lis-test${this.setNum}-p${p}.json`
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

      if (data) this.lisParts.push(data);
    }

    this.renderUI(mountId);
  }

  // =========================================================================
  // 2. RENDER KHUNG GIAO DIỆN CHÍNH & TAB CHUYỂN 4 PARTS
  // =========================================================================
  renderUI(mountId = 'ftListeningMount') {
    const mount = document.getElementById(mountId);
    const audioEl = document.getElementById(this.audioElementId);
    if (!mount) return;

    if (this.lisParts.length === 0) {
      mount.innerHTML = `<div style="text-align:center; padding:30px; color:#DC2626; font-weight:800;">⚠️ Đang tải hoặc không tìm thấy dữ liệu đề nghe Cambridge 21!</div>`;
      return;
    }

    // Nạp link audio của Part đầu tiên vào trình phát
    if (audioEl && this.lisParts[0].audioUrl) {
      audioEl.src = this.lisParts[0].audioUrl;
    }

    let html = `
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        ${this.lisParts.map((p, idx) => `
          <button type="button" 
                  id="btnLisPart_${idx}" 
                  class="btn-3d ${idx === 0 ? 'btn-3d-blue' : 'btn-3d-white'}" 
                  style="padding:8px 14px; font-size:13px;" 
                  onclick="window.ftListeningSection.switchPart(${idx})">
            Part ${idx + 1}
          </button>
        `).join('')}
      </div>
      <div id="ftLisActivePartBox"></div>
    `;

    mount.innerHTML = html;
    this.switchPart(0);
  }

  // =========================================================================
  // 3. CHUYỂN PART & TỰ ĐỘNG TUA / ĐỔI NGUỒN AUDIO
  // =========================================================================
  switchPart(idx) {
    if (!this.lisParts[idx]) return;
    this.activeLisPartIdx = idx;
    const part = this.lisParts[idx];

    // Cập nhật giao diện nút Tab
    this.lisParts.forEach((_, i) => {
      const btn = document.getElementById(`btnLisPart_${i}`);
      if (btn) btn.className = `btn-3d ${i === idx ? 'btn-3d-blue' : 'btn-3d-white'}`;
    });

    // Nếu Part có audioUrl riêng thì cập nhật
    const audioEl = document.getElementById(this.audioElementId);
    if (audioEl && part.audioUrl && audioEl.src !== part.audioUrl) {
      audioEl.src = part.audioUrl;
    }

    const box = document.getElementById('ftLisActivePartBox');
    if (!box) return;

    let qHtml = `<b style="font-size:16px; color:#0369A1; display:block; margin-bottom:14px;">${part.title}</b>`;

    (part.groups || []).forEach(g => {
      qHtml += `<div style="font-size:15px; font-weight:900; margin:14px 0 6px 0;">${g.title}</div>`;
      if (g.instructions) {
        qHtml += `<div style="background:#FAF7F2; border:1.5px solid #E8E2D8; border-radius:10px; padding:8px 12px; font-size:13px; font-weight:700; color:#475569; margin-bottom:12px;">${g.instructions}</div>`;
      }

      // 1. Dạng Table / Gap-fill Notes
      if (g.tableHtml || g.template) {
        let content = g.tableHtml || g.template;
        (g.questionIds || []).forEach(qId => {
          const q = (part.questions || {})[qId];
          const width = q?.inputWidth || "120px";
          const inputHtml = `
            <input type="text" 
                   class="diag-input" 
                   id="inp_ft_lis_${qId}" 
                   style="width:${width}; display:inline-block; padding:4px 8px; text-align:center; font-weight:800; color:#0284C7;" 
                   placeholder="[${q?.num || qId}]" 
                   oninput="window.ftListeningSection.recordAnswer('${qId}', this.value)">
          `;
          content = content.replace(new RegExp(`{{${qId}}}`, 'g'), inputHtml);
        });
        qHtml += `<div style="margin-bottom:16px; font-size:14px; line-height:1.8;">${content}</div>`;

      // 2. Dạng Bản đồ (Map Labelling)
      } else if (g.type === 'map' || g.imageUrl) {
        const letters = ['A','B','C','D','E','F','G','H','I'].slice(0, g.optionsCount || 9);
        const imgPath = g.imageUrl?.startsWith('../') ? g.imageUrl : `../listening/${g.imageUrl}`;

        qHtml += `
          <div style="background:#FFFFFF; border:2px solid #E8E2D8; border-radius:14px; padding:12px; text-align:center; margin-bottom:12px;">
            <img src="${imgPath}" alt="Map" style="max-width:100%; max-height:360px; border-radius:8px; border:1px solid #CBD5E1; object-fit:contain;">
          </div>
          <div style="overflow-x:auto; background:#FFFFFF; border:1.5px solid #E8E2D8; border-radius:12px; margin-bottom:16px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
              <thead>
                <tr style="background:#FAF7F2;">
                  <th style="padding:8px 12px; text-align:left;">Địa điểm</th>
                  ${letters.map(l => `<th style="padding:8px 4px; text-align:center;">${l}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${(g.questionIds || []).map(qId => {
                  const q = (part.questions || {})[qId];
                  return `
                    <tr style="border-top:1px solid #E8E2D8;" id="ft_lis_row_${qId}">
                      <td style="padding:8px 12px; font-weight:800;">Câu ${q?.num || qId}. ${q?.text || ''}</td>
                      ${letters.map(l => `
                        <td style="text-align:center; padding:4px;">
                          <input type="radio" 
                                 name="rad_ft_lis_${qId}" 
                                 value="${l}" 
                                 onchange="window.ftListeningSection.recordAnswer('${qId}', '${l}')" 
                                 style="cursor:pointer; accent-color:#0284C7; width:16px; height:16px;">
                        </td>
                      `).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;

      // 3. Dạng Kéo Thả Nối Thông Tin (Matching Drag & Drop + Click-to-place)
      } else if (g.type === 'matching' && Array.isArray(g.options)) {
        let leftRows = '';
        (g.questionIds || []).forEach(qId => {
          const q = (part.questions || {})[qId];
          leftRows += `
            <div class="q-item-box" id="ft_lis_card_${qId}" style="margin-bottom:8px; padding:12px 14px; background:#FFFFFF; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
              <div style="flex:1; min-width:200px;">
                <b style="font-size:13.5px; color:#1E293B;">Câu ${q?.num || qId}: ${q?.text || ''}</b>
              </div>
              <div id="ft_dropzone_${qId}" 
                   class="diag-dropzone" 
                   style="min-width:180px; min-height:40px; border:2px dashed #0284C7; border-radius:10px; background:#F0F9FF; display:flex; align-items:center; justify-content:center; padding:6px 12px; cursor:pointer; user-select:none; transition:all 0.15s ease;"
                   onclick="window.ftListeningSection.handleDropzoneClick('${qId}')"
                   ondragover="window.ftListeningSection.handleDragOver(event)"
                   ondragleave="window.ftListeningSection.handleDragLeave(event)"
                   ondrop="window.ftListeningSection.handleDrop(event, '${qId}')">
                <span style="color:#64748B; font-size:12px; font-style:italic;">Kéo hoặc bấm chọn vào đây</span>
              </div>
            </div>
            <div id="ft_lisfb_${qId}" style="display:none; font-size:12px; font-weight:800; margin-bottom:8px; padding:4px 8px; border-radius:6px;"></div>
          `;
        });

        const rightBank = `
          <div style="flex:1; min-width:240px; background:#FFFFFF; border:2.5px solid #BAE6FD; border-radius:16px; padding:16px; position:sticky; top:12px;">
            <b style="font-size:13.5px; color:#0369A1; display:block; margin-bottom:10px;">📋 ${g.optionsTitle || 'Ngân hàng đáp án (Kéo thả hoặc bấm để chọn)'}:</b>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${g.options.map(opt => `
                <div class="diag-matching-card" 
                     id="ft_opt_card_${opt.key}"
                     draggable="true" 
                     ondragstart="window.ftListeningSection.handleDragStart(event, '${opt.key}', '${opt.text.replace(/'/g, "\\'")}')" 
                     onclick="window.ftListeningSection.selectOptionCard('${opt.key}', '${opt.text.replace(/'/g, "\\'")}', this)"
                     style="background:#FAF7F2; border:2px solid #CBD5E1; border-bottom:4px solid #94A3B8; border-radius:10px; padding:8px 12px; font-size:13px; font-weight:700; cursor:grab; user-select:none; display:flex; align-items:center; gap:8px; transition:all 0.1s ease;">
                  <span style="background:#0284C7; color:white; padding:2px 7px; border-radius:6px; font-weight:900; font-size:12px;">${opt.key}</span>
                  <span style="color:#1E293B;">${opt.text}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        qHtml += `
          <div style="display:flex; gap:16px; margin-bottom:16px; flex-wrap:wrap; align-items:flex-start;">
            <div style="flex:1.4; min-width:280px; display:flex; flex-direction:column;">${leftRows}</div>
            ${rightBank}
          </div>
        `;

      // 4. Trắc nghiệm MCQ / Điền từ tự do
      } else {
        (g.questionIds || []).forEach(qId => {
          const q = (part.questions || {})[qId];
          if (!q) return;

          qHtml += `
            <div class="q-item-box" style="margin-bottom:10px;">
              <b style="font-size:13.5px; color:#1E293B; display:block; margin-bottom:6px;">Câu ${q.num || qId}. ${q.text || ''}</b>
              ${q.options ? `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:6px;">
                  ${q.options.map(opt => `
                    <label class="option-label" onclick="window.ftListeningSection.recordAnswer('${qId}', '${opt.charAt(0)}')">
                      <input type="radio" name="rad_ft_lis_${qId}" value="${opt.charAt(0)}">
                      <span>${opt}</span>
                    </label>
                  `).join('')}
                </div>
              ` : `
                <input type="text" 
                       class="diag-input" 
                       id="inp_ft_lis_${qId}" 
                       placeholder="Điền đáp án..." 
                       oninput="window.ftListeningSection.recordAnswer('${qId}', this.value)">
              `}
            </div>
          `;
        });
      }
    });

    box.innerHTML = qHtml;
    this.restorePartInputs(part);
  }

  // =========================================================================
  // 4. GHI NHẬN ĐÁP ÁN & KHÔI PHỤC DỮ LIỆU
  // =========================================================================
  recordAnswer(qId, val) {
    if (this.isReviewMode) return;
    this.userAnswers[qId] = String(val).trim();
  }

  restorePartInputs(part) {
    Object.entries(this.userAnswers).forEach(([qid, val]) => {
      const inp = document.getElementById(`inp_ft_lis_${qid}`);
      if (inp) inp.value = val;

      const rad = document.querySelector(`input[name="rad_ft_lis_${qid}"][value="${val}"]`);
      if (rad) rad.checked = true;

      // Khôi phục lại thẻ kéo thả vào dropzone
      const dz = document.getElementById(`ft_dropzone_${qid}`);
      if (dz && val) {
        let optText = val;
        (part.groups || []).forEach(g => {
          if (Array.isArray(g.options)) {
            const found = g.options.find(o => o.key === val);
            if (found) optText = found.text;
          }
        });
        this.renderDropzoneContent(qid, val, optText);
      }
    });
  }

  // =========================================================================
  // 5. TOÀN BỘ CƠ CHẾ KÉO THẢ MATCHING (DRAG & DROP + CLICK-TO-PLACE)
  // =========================================================================
  handleDragStart(e, key, text) {
    this.draggedData = { key, text };
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({ key, text }));
    } catch (err) {}
  }

  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#059669';
    e.currentTarget.style.background = '#ECFDF5';
  }

  handleDragLeave(e) {
    e.currentTarget.style.borderColor = '#0284C7';
    e.currentTarget.style.background = '#F0F9FF';
  }

  handleDrop(e, qId) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#0284C7';
    e.currentTarget.style.background = '#F0F9FF';

    let data = this.draggedData;
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (raw) data = JSON.parse(raw);
    } catch (err) {}

    if (data && data.key) {
      this.placeAnswerIntoDropzone(qId, data.key, data.text);
    }
  }

  selectOptionCard(key, text, el) {
    document.querySelectorAll('.diag-matching-card').forEach(c => {
      c.style.borderColor = '#CBD5E1';
      c.style.background = '#FAF7F2';
    });

    if (this.selectedOptionForPlacement && this.selectedOptionForPlacement.key === key) {
      this.selectedOptionForPlacement = null;
    } else {
      this.selectedOptionForPlacement = { key, text };
      if (el) {
        el.style.borderColor = '#0284C7';
        el.style.background = '#E0F2FE';
      }
    }
  }

  handleDropzoneClick(qId) {
    if (this.selectedOptionForPlacement) {
      this.placeAnswerIntoDropzone(qId, this.selectedOptionForPlacement.key, this.selectedOptionForPlacement.text);
      document.querySelectorAll('.diag-matching-card').forEach(c => {
        c.style.borderColor = '#CBD5E1';
        c.style.background = '#FAF7F2';
      });
      this.selectedOptionForPlacement = null;
    }
  }

  placeAnswerIntoDropzone(qId, key, text) {
    this.recordAnswer(qId, key);
    this.renderDropzoneContent(qId, key, text);
  }

  renderDropzoneContent(qId, key, text) {
    const dz = document.getElementById(`ft_dropzone_${qId}`);
    if (dz) {
      dz.style.background = '#FFFFFF';
      dz.style.borderColor = '#0284C7';
      dz.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-weight:900; background:#0284C7; color:white; padding:1px 6px; border-radius:4px; font-size:12px;">${key}</span>
            <span style="font-weight:800; color:#0369A1; font-size:12.5px;">${text}</span>
          </div>
          <button type="button" 
                  onclick="window.ftListeningSection.clearDropAnswer('${qId}', event)" 
                  style="background:#FEE2E2; color:#DC2626; border:none; border-radius:50%; width:20px; height:20px; font-weight:900; cursor:pointer; font-size:11px; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>
      `;
    }
  }

  clearDropAnswer(qId, e) {
    if (e) e.stopPropagation();
    this.recordAnswer(qId, '');
    const dz = document.getElementById(`ft_dropzone_${qId}`);
    if (dz) {
      dz.style.background = '#F0F9FF';
      dz.style.borderColor = '#0284C7';
      dz.innerHTML = `<span style="color:#64748B; font-size:12px; font-style:italic;">Kéo hoặc bấm chọn vào đây</span>`;
    }
  }

  // =========================================================================
  // 6. ĐỐI SOÁT ĐÁP ÁN, TÍNH BAND & RENDER REVIEW MODE
  // =========================================================================
  evaluate() {
    let lCorrect = 0;
    let totalQuestions = 0;

    this.lisParts.forEach(p => {
      Object.entries(p.answers || {}).forEach(([qid, exp]) => {
        totalQuestions++;
        const u = (this.userAnswers[qid] || '').toLowerCase().trim();
        if (!u) return;

        if (Array.isArray(exp)) {
          if (exp.some(a => String(a).toLowerCase().trim() === u)) lCorrect++;
        } else {
          if (u === String(exp).toLowerCase().trim()) lCorrect++;
        }
      });
    });

    return {
      lCorrect,
      total: totalQuestions || 40,
      band: this.calculateListeningBand(lCorrect)
    };
  }

  calculateListeningBand(correct) {
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
    this.lisParts.forEach(p => {
      Object.entries(p.answers || {}).forEach(([qid, exp]) => {
        const inp = document.getElementById(`inp_ft_lis_${qid}`);
        const dz = document.getElementById(`ft_dropzone_${qid}`);
        const u = (this.userAnswers[qid] || '').toLowerCase().trim();

        let isCorrect = false;
        if (u) {
          if (Array.isArray(exp)) {
            isCorrect = exp.some(a => String(a).toLowerCase().trim() === u);
          } else {
            isCorrect = u === String(exp).toLowerCase().trim();
          }
        }

        if (inp) {
          inp.style.background = isCorrect ? '#DCFCE7' : '#FEE2E2';
          inp.disabled = true;
        }
        if (dz) {
          dz.style.background = isCorrect ? '#DCFCE7' : '#FEE2E2';
          dz.style.borderColor = isCorrect ? '#22C55E' : '#EF4444';
        }
      });
    });
  }

  restore(savedAnswers) {
    this.isReviewMode = true;
    this.userAnswers = savedAnswers || {};
    this.switchPart(0);
    this.renderReviewMode();
  }

  seekAudio(sec) {
    const audio = document.getElementById(this.audioElementId);
    if (audio && sec !== undefined) {
      audio.currentTime = parseFloat(sec);
      audio.play().catch(() => {});
    }
  }
}

export const ftListeningSection = new FtListeningSection();
window.ftListeningSection = ftListeningSection;
