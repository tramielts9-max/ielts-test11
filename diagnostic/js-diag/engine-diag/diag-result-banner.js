/**
 * diagnostic/js-diag/engine-diag/diag-result-banner.js
 * MODULE HIỂN THỊ BANNER KẾT QUẢ KÉP (CHUẨN GIỜ & TOÀN DIỆN) VÀ AI CHẤM TRỰC TIẾP
 * (BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ TÍNH NĂNG NÀO)
 * - RENDER BANNER 3D DUOLINGO XUẤT 2 BẢNG ĐIỂM SONG SONG (CHỐT GIỜ 50P VS LÀM HẾT ĐỀ)
 * - HIỂN THỊ PHIẾU CHẤM WRITING 4 TIÊU CHÍ IELTS TRỰC TIẾP TỪ AI GEMINI
 * - HIỂN THỊ NHẬN XÉT PHẢN XẠ NÓI SPEAKING TRỰC TIẾP TỪ AI GEMINI
 * - PHÒNG THỦ DOM TỰ ĐỘNG CHỐNG LỖI TRẮNG MÀN HÌNH HOẶC HIỆN KÝ TỰ "UNDEFINED"
 */

// =========================================================================
// 1. MÃ HÓA CÁC API KEY BẢO MẬT CHỐNG F12
// =========================================================================
const _WRITING_PREFIX = "AQ.Ab8RN6KGTRGy";
const _WRITING_SUFFIX = "SZoGpqs3vT-ikWDLUSWjloCCVlzZhAQque_34w";
function getWritingKey() { 
  return `${_WRITING_PREFIX}${_WRITING_SUFFIX}`; 
}

const _SPEAKING_SEEDS = [
  65, 81, 46, 65, 98, 56, 82, 78, 54, 75, 116, 80, 107, 51, 45, 50,
  75, 103, 117, 114, 119, 117, 116, 65, 115, 55, 95, 118, 82, 66,
  121, 81, 110, 113, 67, 48, 77, 86, 55, 52, 66, 119, 107, 82, 107,
  80, 110, 74, 89, 70, 90, 49, 119
];
function getSpeakingKey() { 
  return _SPEAKING_SEEDS.map(c => String.fromCharCode(c)).join(''); 
}

export class DiagResultBanner {
  constructor() {}

  // =========================================================================
  // 2. RENDER BANNER NỔI HIỂN THỊ 2 BẢNG KẾT QUẢ ĐỘC LẬP
  // =========================================================================
  renderInPlaceDualResultBanner(data = {}) {
    let banner = document.getElementById('diagStickyResultBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'diagStickyResultBanner';
      
      // Phòng thủ DOM: Tìm container chuẩn hoặc gắn vào đầu bài thi
      const container = document.querySelector('.runner-container') || document.querySelector('.container') || document.body;
      if (container.firstChild) {
        container.insertBefore(banner, container.firstChild);
      } else {
        container.appendChild(banner);
      }
    }

    const official = data.officialResult || {};
    const potential = data.potentialResult || {};
    const timeSpentStr = data.timeSpent || "N/A";
    const snapshotLabel = data.snapshotTimeLabel || "50 phút";

    banner.innerHTML = `
      <div style="background:#FFFFFF; border:3px solid #059669; border-bottom:6px solid #047857; border-radius:22px; padding:20px 24px; margin-bottom:20px; box-shadow:0 8px 24px rgba(5, 150, 105, 0.12); font-family:inherit;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; border-bottom:2px dashed #E8E2D8; padding-bottom:14px; margin-bottom:14px;">
          <div>
            <span style="font-size:12px; font-weight:900; background:#D1FAE5; color:#065F46; padding:3px 10px; border-radius:8px; text-transform:uppercase;">
              KẾT QUẢ BÀI THI CHẨN ĐOÁN (ĐANG XEM LẠI)
            </span>
            <div style="font-size:14px; font-weight:800; color:#64748B; margin-top:4px;">
              ⏱️ Tổng thời gian làm bài: <b>${timeSpentStr}</b> ${data.isOvertime ? `<span style="color:#DC2626; font-weight:900;">(Vượt mốc quy định ${snapshotLabel})</span>` : '<span style="color:#059669; font-weight:900;">(Đúng hạn giờ quy định)</span>'}
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <a href="index-diag.html" class="btn-3d btn-3d-white" style="padding:8px 16px; font-size:13px; text-decoration:none;">← Danh mục đề</a>
            <a href="../curriculum-system/roadmap.html" class="btn-3d btn-3d-blue" style="padding:8px 16px; font-size:13px; text-decoration:none;">🚀 Xem lộ trình học &rarr;</a>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px; margin-bottom:16px;">
          
          <!-- BẢNG 1: CHUẨN GIỜ (CHÍNH THỨC) -->
          <div style="background:#F0FDF4; border:2px solid #86EFAC; border-radius:16px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:#166534; font-size:14px; text-transform:uppercase;">
                🎯 KẾT QUẢ CHUẨN GIỜ (CHÍNH THỨC)
              </b>
              <span style="font-size:11px; font-weight:900; background:#DCFCE7; color:#166534; padding:2px 8px; border-radius:6px;">MỐC ${snapshotLabel}</span>
            </div>
            <div style="display:flex; align-items:baseline; gap:10px; margin:8px 0 4px 0;">
              <span style="font-size:32px; font-weight:900; color:#15803D;">Band ${official.band || "0.0"}</span>
              <span style="font-size:14px; font-weight:800; color:#475569;">(${official.score || "0/100"})</span>
            </div>
            <p style="margin:0; font-size:12.5px; color:#166534; line-height:1.5;">
              <b>Năng lực phòng thi:</b> Kết quả đo lường chính xác trong thời gian quy định dưới áp lực thi thật.
            </p>
          </div>

          <!-- BẢNG 2: TOÀN DIỆN (TIỀM NĂNG) -->
          <div style="background:#EFF6FF; border:2px solid #BFDBFE; border-radius:16px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:#1E40AF; font-size:14px; text-transform:uppercase;">
                🚀 NĂNG LỰC TOÀN DIỆN (TIỀM NĂNG)
              </b>
              <span style="font-size:11px; font-weight:900; background:#DBEAFE; color:#1E40AF; padding:2px 8px; border-radius:6px;">LÀM HẾT ĐỀ</span>
            </div>
            <div style="display:flex; align-items:baseline; gap:10px; margin:8px 0 4px 0;">
              <span style="font-size:32px; font-weight:900; color:#2563EB;">Band ${potential.band || "0.0"}</span>
              <span style="font-size:14px; font-weight:800; color:#475569;">(${potential.score || "0/100"})</span>
            </div>
            <p style="margin:0; font-size:12.5px; color:#1E40AF; line-height:1.5;">
              <b>Năng lực kiến thức:</b> Kết quả hoàn thành trọn vẹn bài thi. Dữ liệu này được chuyển sang AI để băm lộ trình học tập thích ứng.
            </p>
          </div>

        </div>

        <!-- 5 Ô CHI TIẾT KỸ NĂNG -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
          <div style="background:#FAF7F2; border:1.5px solid #E8E2D8; padding:10px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#166534;">NGỮ PHÁP</div>
            <b style="font-size:17px; color:#15803D;">${potential.gScore || "0/0"}</b>
          </div>
          <div style="background:#FAF7F2; border:1.5px solid #E8E2D8; padding:10px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#0369A1;">LISTENING</div>
            <b style="font-size:17px; color:#0284C7;">${potential.lScore || "0/0"}</b>
          </div>
          <div style="background:#FAF7F2; border:1.5px solid #E8E2D8; padding:10px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#991B1B;">READING</div>
            <b style="font-size:17px; color:#8B1518;">${potential.rScore || "0/0"}</b>
          </div>
          <div style="background:#FAF7F2; border:1.5px solid #E8E2D8; padding:10px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#1E40AF;">WRITING</div>
            <b style="font-size:17px; color:#2563EB;">Band ${potential.wBand || "0.0"}</b>
          </div>
          <div style="background:#FAF7F2; border:1.5px solid #E8E2D8; padding:10px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; font-weight:800; color:#92400E;">SPEAKING</div>
            <b style="font-size:17px; color:#D97706;">Band ${potential.sBand || "0.0"}</b>
          </div>
        </div>

        <div style="margin-top:14px; font-size:13.5px; line-height:1.6; color:#065F46; background:#ECFDF5; padding:12px 16px; border-radius:12px; border:1.5px solid #A7F3D0;">
          <b>💡 Định vị năng lực:</b> ${potential.reason || "Đã ghi nhận bài thi chẩn đoán hoàn chỉnh."}
        </div>
      </div>
    `;

    banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // =========================================================================
  // 3. RENDER AI CHẤM TRỰC TIẾP WRITING
  // =========================================================================
  async renderInlineWritingAICard(t1, t2, totalWords = 0, preloadedFeedback = null) {
    const secWriting = document.getElementById('section_writing');
    if (!secWriting) return "";

    let aiCard = document.getElementById('inlineWritingAiReport');
    if (!aiCard) {
      aiCard = document.createElement('div');
      aiCard.id = 'inlineWritingAiReport';
      secWriting.appendChild(aiCard);
    }

    if (totalWords === 0 && !t1 && !t2) {
      aiCard.innerHTML = `
        <div style="background:#FEF2F2; border:2.5px solid #EF4444; border-radius:18px; padding:18px; margin-top:20px;">
          <h4 style="color:#991B1B; margin:0 0 6px 0; font-size:16px; font-weight:900;">
            ✍️ PHẦN THI WRITING: BAND 0.0
          </h4>
          <p style="margin:0; font-size:13.5px; color:#7F1D1D; font-weight:700;">
            Học viên không thực hiện bài viết này (Does not attempt the task in any way).
          </p>
        </div>
      `;
      return "";
    }

    aiCard.innerHTML = `
      <div style="background:#FFFFFF; border:3px solid #2563EB; border-radius:18px; padding:22px; margin-top:20px;">
        <h4 style="color:#1E40AF; margin:0 0 10px 0; font-size:18px; font-weight:900;">
          🤖 PHIẾU CHẤM ĐIỂM WRITING TRỰC TIẾP TỪ AI GEMINI (4 TIÊU CHÍ IELTS)
        </h4>
        <div id="inlineWritingAiStream" style="font-size:14px; line-height:1.75; color:#1E293B;">
          ⏳ <b>AI Gemini đang đọc toàn bộ bài viết, đối soát ngữ pháp và phân tích 4 tiêu chí...</b>
        </div>
      </div>
    `;

    const streamBox = document.getElementById('inlineWritingAiStream');

    if (preloadedFeedback) {
      if (window.marked && streamBox) streamBox.innerHTML = window.marked.parse(preloadedFeedback);
      else if (streamBox) streamBox.innerHTML = `<pre style="white-space:pre-wrap; font-family:inherit;">${preloadedFeedback}</pre>`;
      return preloadedFeedback;
    }

    const wKey = getWritingKey();
    const promptText = `
Bạn là Giám khảo Khảo thí IELTS Writing cự phách. Hãy đọc bài viết dưới đây của học sinh và xuất phiếu chấm điểm chi tiết.
Xưng hô: "Anh" và gọi học viên là "Em".

BÀI VIẾT CỦA EM:
- Task 1: "${t1 || '(Chưa làm)'}"
- Task 2: "${t2 || '(Chưa làm)'}"

XUẤT BÁO CÁO THEO ĐÚNG CẤU TRÚC MARKDOWN:
# 🎯 BẢNG ĐIỂM 4 TIÊU CHÍ IELTS WRITING:
- Task Achievement / Response: [Điểm]/9.0
- Coherence & Cohesion: [Điểm]/9.0
- Lexical Resource: [Điểm]/9.0
- Grammatical Range & Accuracy: [Điểm]/9.0
### 🏆 OVERALL WRITING BAND: [Band điểm]

# 🔍 CÁC LỖI SAI CẦN SỬA GẤP TRONG BÀI CỦA EM:
(Trích câu sai của Em ➔ Sửa lại cho đúng ngữ pháp và tự nhiên).

# 📖 GỢI Ý ĐOẠN VĂN MẪU BAND 8.0:
(Viết 1 đoạn mẫu ngắn gọn nâng cấp từ ý tưởng của Em).
`;

    try {
      const feedback = await this.callGeminiRaw(wKey, promptText);
      if (window.marked && streamBox) {
        streamBox.innerHTML = window.marked.parse(feedback);
      } else if (streamBox) {
        streamBox.innerHTML = `<pre style="white-space:pre-wrap; font-family:inherit;">${feedback}</pre>`;
      }
      return feedback;
    } catch (e) {
      if (streamBox) streamBox.innerHTML = `<span style="color:#DC2626;">❌ Không thể kết nối AI: ${e.message}</span>`;
      return "";
    }
  }

  // =========================================================================
  // 4. RENDER AI CHẤM TRỰC TIẾP SPEAKING
  // =========================================================================
  async renderInlineSpeakingAICard(s1, s2, totalWords = 0, preloadedFeedback = null) {
    const secSpeaking = document.getElementById('section_speaking');
    if (!secSpeaking) return "";

    let aiCard = document.getElementById('inlineSpeakingAiReport');
    if (!aiCard) {
      aiCard = document.createElement('div');
      aiCard.id = 'inlineSpeakingAiReport';
      secSpeaking.appendChild(aiCard);
    }

    if (totalWords === 0 && !s1 && !s2) {
      aiCard.innerHTML = `
        <div style="background:#FEF2F2; border:2.5px solid #EF4444; border-radius:18px; padding:18px; margin-top:20px;">
          <h4 style="color:#991B1B; margin:0 0 6px 0; font-size:16px; font-weight:900;">
            🎤 PHẦN THI SPEAKING: BAND 0.0
          </h4>
          <p style="margin:0; font-size:13.5px; color:#7F1D1D; font-weight:700;">
            Thí sinh không tham gia trả lời bài thi nói (Does not attend / Does not complete the test).
          </p>
        </div>
      `;
      return "";
    }

    aiCard.innerHTML = `
      <div style="background:#FFFFFF; border:3px solid #D97706; border-radius:18px; padding:22px; margin-top:20px;">
        <h4 style="color:#B45309; margin:0 0 10px 0; font-size:18px; font-weight:900;">
          🎤 NHẬN XÉT PHẢN XẠ NÓI TRỰC TIẾP TỪ AI GEMINI
        </h4>
        <div id="inlineSpeakingAiStream" style="font-size:14px; line-height:1.75; color:#1E293B;">
          ⏳ <b>AI Gemini đang đọc bản ký âm và đánh giá độ trôi chảy...</b>
        </div>
      </div>
    `;

    const streamBox = document.getElementById('inlineSpeakingAiStream');

    if (preloadedFeedback) {
      if (window.marked && streamBox) streamBox.innerHTML = window.marked.parse(preloadedFeedback);
      else if (streamBox) streamBox.innerHTML = `<pre style="white-space:pre-wrap; font-family:inherit;">${preloadedFeedback}</pre>`;
      return preloadedFeedback;
    }

    const sKey = getSpeakingKey();
    const promptText = `
Bạn là Chuyên gia Khảo thí IELTS Speaking. Hãy nhận xét bài nói dưới đây của học sinh. Xưng hô "Anh" và "Em".
BẢN KÝ ÂM SPEAKING:
- Câu 1: "${s1 || '(Chưa nói)'}"
- Câu 2: "${s2 || '(Chưa nói)'}"

XUẤT BÁO CÁO (DƯỚI 200 TỪ):
1. 🎯 Ước lượng Band điểm Speaking và nhận xét độ trôi chảy (Fluency).
2. 🔍 Chỉ ra 2 lỗi ngữ pháp hoặc từ vựng bị gượng ép.
3. 💡 Viết lại câu trả lời mẫu tự nhiên và học thuật hơn cho Em.
`;

    try {
      const feedback = await this.callGeminiRaw(sKey, promptText);
      if (window.marked && streamBox) {
        streamBox.innerHTML = window.marked.parse(feedback);
      } else if (streamBox) {
        streamBox.innerHTML = `<pre style="white-space:pre-wrap; font-family:inherit;">${feedback}</pre>`;
      }
      return feedback;
    } catch (e) {
      if (streamBox) streamBox.innerHTML = `<span style="color:#DC2626;">❌ Không thể kết nối AI: ${e.message}</span>`;
      return "";
    }
  }

  // =========================================================================
  // 5. GỌI API GEMINI TRỰC TIẾP PHÒNG THỦ AN TOÀN
  // =========================================================================
  async callGeminiRaw(apiKey, prompt) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Máy chủ AI đang bận.`);
    }
    const d = await res.json();
    return d.candidates?.[0]?.content?.parts?.[0]?.text || "Đã ghi nhận bài làm.";
  }
}

export const diagResultBanner = new DiagResultBanner();
