/**
 * curriculum-system/engine-system.js
 * CỔNG TRUNG GIAN MASTER (GATEWAY / FACADE) ĐIỀU PHỐI TOÀN BỘ LỘ TRÌNH 5 CHẶNG
 * BẢN FULL ĐẦY ĐỦ 100% - BẢO TOÀN NGUYÊN VẸN MỌI HỢP ĐỒNG API CŨ
 * - KẾT NỐI 3 MODULE CON: SESSION MATRIX, REMEDIAL PRUNER, PHASE SCHEDULER
 * - DUY TRÌ 100% TƯƠNG THÍCH VỚI UI-SYSTEM.JS VÀ ROADMAP.HTML (KHÔNG LÀM GÃY HỆ THỐNG)
 * - TÍCH HỢP BẮC CẦU TỰ ĐỘNG TỪ BÀI THI DIAGNOSTIC SANG LỘ TRÌNH CHỜ DUYỆT (PENDING_ADMIN_APPROVAL)
 */

import { EngineSessionMatrix } from './engine-core/engine-session-matrix.js';
import { EngineRemedialPruner } from './engine-core/engine-remedial-pruner.js';
import { EnginePhaseScheduler } from './engine-core/engine-phase-scheduler.js';

export class CurriculumEngineSystem {
  constructor() {
    this.allNodes = [];
  }

  /**
   * Nạp danh sách toàn bộ các bài học (nodes) và tự động sinh câu giải thích Benefit
   */
  setNodes(nodes) {
    if (!Array.isArray(nodes)) {
      this.allNodes = [];
      return;
    }
    this.allNodes = nodes.map(n => ({
      ...n,
      benefit: n.benefit || EngineSessionMatrix.generateBenefit(n)
    }));
  }

  /**
   * Sinh câu giải thích lợi ích học thuật
   */
  generateBenefit(node) {
    return EngineSessionMatrix.generateBenefit(node);
  }

  /**
   * Tính số buổi học theo công thức lũy tiến sư phạm (300k/buổi - 12 buổi/tháng)
   */
  calculateSessionsByBands(startBand, targetBand) {
    return EngineSessionMatrix.calculateSessionsByBands(startBand, targetBand);
  }

  /**
   * Bóc tách các thẻ câu sai từ Blueprint bài thi chẩn đoán
   */
  extractRemedialTagsFromBlueprint(blueprintProfile = {}) {
    return EngineRemedialPruner.extractRemedialTagsFromBlueprint(blueprintProfile);
  }

  /**
   * Kiểm tra bài học có phải là bài cứu câu sai khẩn cấp hay không
   */
  isNodeMatchingRemedial(node, remedialTags = []) {
    return EngineRemedialPruner.isNodeMatchingRemedial(node, remedialTags);
  }

  /**
   * Lọc bài học theo Band và cứu bài khẩn cấp (miễn trừ 100% khỏi Head-cut)
   */
  pruneCurriculumByBands(startBand = 0.0, targetBand = 7.0, aiOptions = {}) {
    return EngineRemedialPruner.pruneCurriculumByBands(this.allNodes, startBand, targetBand, aiOptions);
  }

  /**
   * Tính toán toàn bộ thông số tổng kết (ngày, giờ, tuần, học phí, số buổi)
   */
  calculateTotals(retainedNodes, speedProfile = 'normal', dailyHours = 1.5, startBand = 0.0, targetBand = 7.0) {
    return EngineSessionMatrix.calculateTotals(retainedNodes, speedProfile, dailyHours, startBand, targetBand);
  }

  /**
   * Điều phối băm lịch học: Tự động chọn 5 Chặng tuần tự hoặc Xoay vòng Spiral
   */
  generateDailyCalendar(retainedNodes, speedProfile = 'normal', dailyHours = 1.5, startBand = 0.0, targetBand = 7.0, aiOptions = {}) {
    const stats = this.calculateSessionsByBands(startBand, targetBand);
    const targetDays = stats.days; // Chuẩn 91 ngày cho mốc 5.5 -> 7.0
    const dailyTargetMinutes = Math.round(dailyHours * 60); // 90 phút/ngày

    if (aiOptions.schedule_mode === 'SEQUENTIAL_PHASES' || aiOptions.blueprintProfile) {
      return EnginePhaseScheduler.generateSequentialPhasesCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions);
    }

    return EnginePhaseScheduler.generateStandardSpiralCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions);
  }

  /**
   * Ủy quyền thuật toán băm lịch 5 Chặng tuần tự
   */
  generateSequentialPhasesCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions) {
    return EnginePhaseScheduler.generateSequentialPhasesCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions);
  }

  /**
   * Ủy quyền thuật toán băm lịch xoay vòng tiêu chuẩn (Spiral)
   */
  generateStandardSpiralCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions) {
    return EnginePhaseScheduler.generateStandardSpiralCalendar(retainedNodes, targetDays, dailyTargetMinutes, speedProfile, stats, aiOptions);
  }

  /**
   * BẮC CẦU TỰ ĐỘNG TỪ BÀI THI DIAGNOSTIC SANG LỘ TRÌNH 5 CHẶNG
   * Sinh payload chuẩn có cờ "pending_admin_approval" để đưa vào Cổng duyệt Giáo viên
   */
  generateRoadmapFromDiagnostic(attemptSnapshot = {}) {
    const details = attemptSnapshot.details || {};
    const blueprintProfile = details.blueprintProfile || {};

    // 1. Xác định điểm xuất phát: Ưu tiên potentialBand -> officialBand -> score -> mặc định 4.0
    let startBand = 4.0;
    if (details.potentialBand && !isNaN(parseFloat(details.potentialBand))) {
      startBand = parseFloat(details.potentialBand);
    } else if (details.officialBand && !isNaN(parseFloat(details.officialBand))) {
      startBand = parseFloat(details.officialBand);
    } else if (attemptSnapshot.score) {
      const match = String(attemptSnapshot.score).match(/(\d+(\.\d+)?)/);
      if (match) startBand = parseFloat(match[1]);
    }
    startBand = Math.round(startBand * 2) / 2;

    // 2. Tự động đề xuất mục tiêu: startBand + 1.5 Band (trần tối đa 7.0)
    let targetBand = Math.min(7.0, Math.round((startBand + 1.5) * 2) / 2);
    if (targetBand <= startBand) {
      targetBand = Math.min(7.0, startBand + 0.5);
    }

    // 3. Đóng gói các lựa chọn AI & Chính sách hạn ngạch
    const aiOptions = {
      schedule_mode: 'SEQUENTIAL_PHASES',
      vocab_requirement: 'FULL_100_PERCENT',
      quota_policy: {
        max_pre_skill_ratio: 0.25,
        min_official_exam_ratio: 0.75,
        prohibited_levels: startBand >= 5.0 ? ["A1"] : [],
        review_interval_days: 3,
        review_skills: ["READING", "LISTENING"]
      },
      academic_summary: `Lộ trình thích ứng sinh tự động từ bài thi chẩn đoán [${attemptSnapshot.testTitle || 'Diagnostic'}]. Điểm chuẩn giờ: Band ${details.officialBand || startBand} | Tiềm năng: Band ${details.potentialBand || startBand}. Hệ thống đã nạp trực tiếp danh sách câu sai vào Chặng 1 & 2 để cứu bài.`,
      blueprintProfile: blueprintProfile
    };

    // 4. Lọc kho bài tập (Cứu bài khẩn cấp 100% câu sai)
    const retainedNodes = this.pruneCurriculumByBands(startBand, targetBand, aiOptions);
    const totals = this.calculateTotals(retainedNodes, 'normal', 1.5, startBand, targetBand);
    const scheduleData = this.generateDailyCalendar(retainedNodes, 'normal', 1.5, startBand, targetBand, aiOptions);

    const studentEmail = (attemptSnapshot.studentEmail || 'guest').toLowerCase().trim();

    return {
      createdAt: new Date().toISOString(),
      studentEmail: studentEmail,
      startBand: startBand,
      targetBand: targetBand,
      speedProfile: 'normal',
      dailyHours: 1.5,
      currentDay: 1,
      totals: totals,
      schedule: scheduleData.dailySchedule,
      completedNodeIds: [],
      aiDiagnosticData: aiOptions,

      // 🔴 BỘ CỜ BẢO MẬT & CỔNG PHÊ DUYỆT ADMIN GATE:
      approvalStatus: "pending_admin_approval",
      isLockedByAdmin: true,

      // Metadata nguồn gốc bài thi Diagnostic
      diagnosticSource: {
        attemptId: attemptSnapshot.id || null,
        testTitle: attemptSnapshot.testTitle || "TEST CHẨN ĐOÁN",
        officialBand: details.officialBand || String(startBand),
        potentialBand: details.potentialBand || String(startBand),
        overallScore: details.overallScore || attemptSnapshot.score || "N/A",
        timeSpent: attemptSnapshot.timeSpent || "N/A",
        completedAt: attemptSnapshot.timestamp || new Date().toISOString(),
        blueprintProfile: blueprintProfile
      }
    };
  }
}

// Khởi tạo đối tượng Singleton và xuất khẩu toàn cục
export const curriculumEngineSystem = new CurriculumEngineSystem();
window.curriculumEngineSystem = curriculumEngineSystem;

// Xuất khẩu các lớp con để các module khác có thể dùng độc lập khi cần
export { EngineSessionMatrix, EngineRemedialPruner, EnginePhaseScheduler };
