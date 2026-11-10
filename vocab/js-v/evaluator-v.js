/**
 * vocab/js-v/evaluator-v.js
 * MODULE CHUYÊN TRÁCH THẨM ĐỊNH AI GEMINI & ĐỒNG BỘ KẾT QUẢ GOOGLE DRIVE
 * PHÒNG THỦ LỖI ĐA TẦNG - TỰ ĐỘNG CHẤM CẢ BÀI UNIT LẺ VÀ BÀI KHẢO TỔNG HỢP
 */

// 1. MÃ HÓA RUNTIME AUTH KEY CHO GEMINI AI
const _AUTH_SEEDS = [
  65, 81, 46, 65, 98, 56, 82, 78, 54, 75, 116, 80, 107, 51, 45, 50,
  75, 103, 117, 114, 119, 117, 116, 65, 115, 55, 95, 118, 82, 66,
  121, 81, 110, 113, 67, 48, 77, 86, 55, 52, 66, 119, 107, 82, 107,
  80, 110, 74, 89, 70, 90, 49, 119
];

function getDecodedKey() {
  try {
    return _AUTH_SEEDS.map(c => String.fromCharCode(c)).join('');
  } catch (e) {
    return '';
  }
}

// 2. URL GOOGLE APPS SCRIPT ĐỒNG BỘ GOOGLE DRIVE
const CLOUD_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNErQQFdciAQM0k9KUrACtpX7rxKkopjChYAC2Ubwj5MGzFOeekDEGs8C1n7P9cNR6vg/exec";

export const VocabEvaluator = {
  /**
   * Gọi AI Gemini chấm toàn diện danh sách từ học sinh vừa điền
   * @param {Array} studentInputs - Danh sách từ vựng kèm câu trả lời của học sinh
   * @param {string} examTitle - Tiêu đề bài thi (Unit X hoặc Khảo Tổng Hợp)
   */
  async gradeVocabList(studentInputs, examTitle = "Bài thi từ vựng") {
    const totalWords = studentInputs.length;
    const apiKey = getDecodedKey();

    const prompt = `
Bạn là Giám khảo Khảo thí Từ vựng tiếng Anh học thuật.
Nhiệm vụ: Đánh giá và chấm điểm bài kiểm tra từ vựng (${totalWords} câu) dưới đây.
BÀI THI: "${examTitle}"

QUY TẮC CHẤM ĐIỂM:
1. Chấp nhận các từ đồng nghĩa tiếng Việt hoặc cách diễn đạt sát nghĩa, tự nhiên trong ngữ cảnh.
2. Không bắt bẻ lỗi chính tả nhỏ, dấu gạch chéo hoặc dấu câu.
3. Nếu học sinh hiểu đúng bản chất của từ -> isCorrect: true.
4. Nếu học sinh dịch sai hoàn toàn, sai ngữ nghĩa hoặc để trống -> isCorrect: false.

DANH SÁCH BÀI LÀM:
${JSON.stringify(studentInputs, null, 2)}

YÊU CẦU ĐỊNH DẠNG:
Trả về DUY NHẤT một chuỗi JSON thuần (KHÔNG chứa markdown, KHÔNG bọc trong \`\`\`json):
{
  "totalCorrect": 0,
  "summary": "Nhận xét ngắn gọn, khích lệ 1-2 câu về mức độ nắm từ của học sinh.",
  "results": [
    {
      "id": "word_id",
      "isCorrect": true,
      "feedback": "Đúng nghĩa."
    }
  ]
}
`;

    try {
      const rawText = await this.callGeminiWithFallback(apiKey, prompt);
      const cleanJson = rawText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Đảm bảo dữ liệu trả về chuẩn xác
      return {
        totalCorrect: typeof parsed.totalCorrect === 'number' ? parsed.totalCorrect : 0,
        summary: parsed.summary || "Đã hoàn thành bài kiểm tra.",
        results: Array.isArray(parsed.results) ? parsed.results : []
      };
    } catch (err) {
      console.warn("Lỗi kết nối AI Gemini, chuyển sang bộ chấm điểm thuật toán dự phòng:", err);
      return this.fallbackLocalGrading(studentInputs);
    }
  },

  /**
   * Cơ chế gọi API thử lần lượt qua các model Flash của Gemini để chống nghẽn mạng
   */
  async callGeminiWithFallback(apiKey, promptText) {
    if (!apiKey) throw new Error("API Key không hợp lệ.");

    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite'
    ];

    for (const model of models) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }]
          })
        });

        if (response.ok) {
          const resData = await response.json();
          const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) return generatedText;
        }
      } catch (networkErr) {
        // Thử model tiếp theo trong danh sách
        continue;
      }
    }
    throw new Error("Tất cả các model AI đều không phản hồi.");
  },

  /**
   * Bộ chấm điểm quy chuẩn cục bộ (Local Fallback) khi mất mạng/hết quota API
   */
  fallbackLocalGrading(studentInputs) {
    let correctCount = 0;
    const results = studentInputs.map(item => {
      const stdMeaning = (item.standardMeaning || '').toLowerCase().trim();
      const userAns = (item.studentMeaning || '').toLowerCase().trim();

      let isCorrect = false;
      if (userAns && userAns !== '(bỏ trống)') {
        // So khớp trực tiếp hoặc so khớp với các cụm nghĩa cách nhau bởi dấu / hoặc dấu phẩy
        const subMeanings = stdMeaning.split(/[\/,;]/).map(s => s.trim()).filter(Boolean);
        const matchFound = subMeanings.some(sub => userAns.includes(sub) || sub.includes(userAns));
        if (matchFound) {
          isCorrect = true;
          correctCount++;
        }
      }

      return {
        id: item.id,
        isCorrect: isCorrect,
        feedback: isCorrect ? "Đúng nghĩa." : `Nghĩa chuẩn: ${item.standardMeaning}`
      };
    });

    return {
      totalCorrect: correctCount,
      summary: `Em đã hoàn thành bài thi với kết quả ${correctCount}/${studentInputs.length} câu đúng (được đối soát theo từ điển quy chuẩn).`,
      results: results
    };
  },

  /**
   * ĐỒNG BỘ TOÀN DIỆN LÊN GOOGLE DRIVE & LOCALSTORAGE
   * Tự động nhận diện bài Unit đơn lẻ hay bài Khảo Tổng Hợp
   */
  syncResultToCloudAndLocal({
    examTitle,
    studentName,
    studentEmail,
    scoreCorrect,
    totalQuestions,
    secondsSpent,
    unitNum = null,
    isComprehensiveDrill = false,
    selectedUnits = []
  }) {
    const safeName = studentName || "Học viên";
    const safeEmail = (studentEmail || "guest@gmail.com").toLowerCase().trim();
    const mm = Math.floor(secondsSpent / 60);
    const ss = secondsSpent % 60;
    const speedStr = `${mm}p ${ss}s`;
    const scoreStr = `${scoreCorrect}/${totalQuestions}`;
    const pct = Math.round((scoreCorrect / (totalQuestions || 1)) * 100);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    // Tạo chi tiết mô tả rõ ràng để giáo viên xem trên Google Sheet/Drive
    let detailsText = "";
    let testTitleFormatted = "";
    let pageUrl = "";

    if (isComprehensiveDrill) {
      testTitleFormatted = `🎯 Khảo Tổng Hợp: ${examTitle} (${scoreStr} câu)`;
      detailsText = `Khảo tổng hợp các Unit: [${selectedUnits.join(', ')}]. Đạt ${scoreStr} (${pct}%) trong ${speedStr}.`;
      pageUrl = `vocab/index-v.html?mode=drill`;
    } else {
      testTitleFormatted = `Khảo Từ Vựng: ${examTitle} (${totalQuestions} từ)`;
      detailsText = `Đạt ${scoreStr} (${pct}%) trong ${speedStr}.`;
      pageUrl = `vocab/index-v.html?unit=${unitNum || 1}`;
    }

    const attemptSnapshot = {
      id: "attempt_vocab_" + Date.now(),
      timestamp: timeStr,
      testTitle: testTitleFormatted,
      studentName: safeName,
      studentEmail: safeEmail,
      score: scoreStr,
      timeSpent: speedStr,
      details: detailsText,
      pageUrl: pageUrl,
      moduleType: "vocab"
    };

    // 1. Lưu ngay vào LocalStorage máy học viên
    try {
      const localHist = JSON.parse(localStorage.getItem('ielts_local_history') || '[]');
      localHist.unshift(attemptSnapshot);
      // Giữ tối đa 150 lịch sử gần nhất để máy chạy nhẹ nhàng
      if (localHist.length > 150) localHist.pop();
      localStorage.setItem('ielts_local_history', JSON.stringify(localHist));
    } catch (e) {
      console.warn("Lỗi lưu lịch sử cục bộ:", e);
    }

    // 2. Bắn dữ liệu lên Google Drive qua Apps Script (Chạy ngầm, không chặn giao diện)
    try {
      fetch(CLOUD_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "save_attempt",
          attempt: attemptSnapshot
        })
      }).catch(err => console.warn("Lỗi gửi dữ liệu lên Google Cloud Script:", err));
    } catch (cloudErr) {
      console.warn("Không thể khởi tạo kết nối Google Cloud:", cloudErr);
    }

    return attemptSnapshot;
  }
};
