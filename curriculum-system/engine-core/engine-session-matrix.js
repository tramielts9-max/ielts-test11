/**
 * curriculum-system/engine-core/engine-session-matrix.js
 * MODULE TOÁN HỌC SƯ PHẠM & MA TRẬN SỐ BUỔI HỌC (300K/BUỔI - 12 BUỔI/NỬA BAND + LŨY TIẾN)
 * BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ DÒNG CODE TÍNH NĂNG NÀO
 * - TÍNH CHUẨN SỐ BUỔI THEO CÔNG THỨC LŨY TIẾN: 5.5 -> 7.0 = 42 BUỔI / 91 NGÀY BTVN
 * - QUY ĐỔI CHUẨN XÁC: 3 BUỔI/TUẦN (2H/BUỔI) = 12 BUỔI/THÁNG • BTVN: 1.5H/NGÀY
 * - BẢO TOÀN TOÀN BỘ LOGIC SINH BENEFIT TỰ ĐỘNG THEO TỪNG KỸ NĂNG VÀ DẠNG BÀI
 */

export class EngineSessionMatrix {
  /**
   * Tự động sinh câu giải thích lợi ích học thuật cho từng bài tập
   */
  static generateBenefit(node) {
    if (!node) return "Củng cố phản xạ và độ chính xác ngôn ngữ học thuật.";
    const d = (node.domain || '').toUpperCase();
    const t = (node.title || '').toLowerCase();

    if (d === 'GRAMMAR') {
      if (t.includes('lý thuyết')) return "Nắm vững bản chất công thức, tránh dịch 'word-by-word' từ tiếng Việt.";
      return "Triệt tiêu lỗi sai thì, sai cấu trúc câu đơn/phức khi viết và nói.";
    }
    if (d === 'VOCABULARY') return "Nạp từ vựng học thuật theo ngữ cảnh mạch tư duy (Collocations & Topic Words).";
    if (d === 'PRE_LISTENING') return "Luyện tai bắt âm nối, nuốt âm (-s, -ed), số liệu và tên riêng chuẩn xác.";
    if (d === 'PRE_READING') return "Rèn kỹ thuật Skimming & Scanning định vị từ khóa không cần tra từ điển.";
    if (d === 'PRE_SPEAKING') return "Shadowing nhại giọng bản ngữ, chuẩn hóa ngữ điệu và phản xạ kéo dài câu trả lời.";
    if (d.includes('PRE_WRITING')) return "Chuyển ngữ kịch bản Việt ➔ Anh 3 mốc Band, rèn tư duy dàn ý PEEL.";
    if (d === 'READING') {
      if (t.includes('có mớm')) return "Luyện chiến thuật làm chủ dạng bài (Gap Fill, TFNG) có mớm dẫn dắt.";
      return "Tự lực định vị từ khóa dưới áp lực bấm giờ 15-20p/Passage chuẩn phòng thi.";
    }
    if (d === 'LISTENING') return "Rèn độ nhạy bắt từ khóa chuyển ý (Signposting) và bẫy đổi ý (actually, but).";
    if (d === 'WRITING_T1') return "Tự viết bài mô tả biểu đồ 150 từ hoàn chỉnh trong đúng 20 phút (Overview & Grouping).";
    if (d === 'WRITING_T2') return "Viết bài luận học thuật 250 từ chuẩn 4 đoạn PEEL, nâng cấp từ vựng C1 chuẩn xác.";
    if (d === 'SPEAKING') return "Phản xạ trả lời trôi chảy theo cấu trúc AREA, không bị khựng quá 3 giây.";
    if (d === 'MOCK_TEST') return "Rèn luyện thể lực và tâm lý phòng thi dưới áp lực làm bài liên tục 3 tiếng.";
    return "Củng cố phản xạ và độ chính xác ngôn ngữ học thuật.";
  }

  /**
   * Tính số buổi học theo công thức lũy tiến sư phạm:
   * 0.0 - 5.5: Chuẩn 12 buổi cho mỗi 0.5 Band
   * 5.5 - 6.0: 13 buổi
   * 6.0 - 6.5: 14 buổi
   * 6.5 - 7.0: 15 buổi
   */
  static calculateSessionsByBands(startBand, targetBand) {
    const s = Math.round((parseFloat(startBand) || 0.0) * 2) / 2;
    const t = Math.round((Math.min(7.0, parseFloat(targetBand) || 7.0)) * 2) / 2;

    if (s >= t) return { sessions: 12, months: 1.0, days: 26, hours: 39, weeks: 4 };

    const stepCosts = {
      '0.0-0.5': 12, '0.5-1.0': 12, '1.0-1.5': 12, '1.5-2.0': 12,
      '2.0-2.5': 12, '2.5-3.0': 12, '3.0-3.5': 12, '3.5-4.0': 12,
      '4.0-4.5': 12, '4.5-5.0': 12,
      '5.0-5.5': 12, // Chuẩn 12 buổi
      '5.5-6.0': 13, // +1 buổi = 13
      '6.0-6.5': 14, // +1 buổi = 14
      '6.5-7.0': 15  // +1 buổi = 15
    };

    let totalSessions = 0;
    let curr = s;

    while (curr < t) {
      const next = Math.round((curr + 0.5) * 2) / 2;
      const key = `${curr.toFixed(1)}-${next.toFixed(1)}`;
      totalSessions += (stepCosts[key] || 12);
      curr = next;
    }

    const months = Math.round((totalSessions / 12) * 10) / 10;
    const days = Math.round(months * 26);
    const hours = Math.round(days * 1.5 * 10) / 10;
    const weeks = Math.round(months * 4);

    return {
      sessions: totalSessions,
      months,
      days,
      hours,
      weeks
    };
  }

  /**
   * Tính toán toàn bộ thông số tổng kết lộ trình để hiển thị lên UI
   */
  static calculateTotals(retainedNodes, speedProfile = 'normal', dailyHours = 1.5, startBand = 0.0, targetBand = 7.0) {
    const stats = this.calculateSessionsByBands(startBand, targetBand);

    return {
      totalSelfStudyHours: stats.hours,
      totalDays: stats.days,
      estimatedMonths: stats.months,
      totalWeeks: stats.weeks,
      totalLiveSessions: stats.sessions,
      totalTeacherHours: stats.sessions * 2,
      tuitionVND: (stats.sessions * 300000).toLocaleString('vi-VN') + 'đ',
      nodeCount: (retainedNodes || []).length
    };
  }
}
