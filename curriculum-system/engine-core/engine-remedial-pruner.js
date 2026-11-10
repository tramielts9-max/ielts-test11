/**
 * curriculum-system/engine-core/engine-remedial-pruner.js
 * BỘ MÁY BÓC TÁCH BLUEPRINT CÂU SAI & BỘ LỌC CỨU BÀI KHẨN CẤP (REMEDIAL URGENT INJECTION)
 * BẢN FULL ĐẦY ĐỦ 100% - KHÔNG CẮT BỚT BẤT KỲ DÒNG CODE TÍNH NĂNG NÀO
 * - BÓC TÁCH TOÀN BỘ BLUEPRINT LỖ HỔNG TỪ BÀI THI DIAGNOSTIC (NGỮ PHÁP, ĐỌC, NGHE, VIẾT, NÓI)
 * - NGUYÊN TẮC CỨU BÀI TỐI CAO: GIỮ 100% ĐỐT BÀI TẬP TƯƠNG ỨNG VỚI CÂU SAI & MIỄN TRỪ HOÀN TOÀN KHỎI HEAD-CUT
 * - BẢO TOÀN LUẬT CHẶN BÀI VỠ LÒNG A1, BẢO VỆ 28 UNIT TỪ VỰNG & GỌT TỈA THEO TRẦN MỤC TIÊU
 */

export class EngineRemedialPruner {
  /**
   * Bóc tách toàn bộ danh sách thẻ (tags) câu sai từ Blueprint bài thi chẩn đoán
   */
  static extractRemedialTagsFromBlueprint(blueprintProfile = {}) {
    if (!blueprintProfile || typeof blueprintProfile !== 'object') return [];

    const tags = new Set();

    // 1. Tags ngữ pháp làm sai (VD: G_PAST_SIMPLE, G_IRREG_V2, G_ARTICLES)
    if (Array.isArray(blueprintProfile.wrongGrammarTags)) {
      blueprintProfile.wrongGrammarTags.forEach(t => {
        if (t && typeof t === 'string') tags.add(t.trim().toUpperCase());
      });
    }

    // 2. Kỹ năng đọc sai (VD: READ_TFNG_TRAP, READ_Q05, READ_CAM...)
    if (Array.isArray(blueprintProfile.failedReadingSkills)) {
      blueprintProfile.failedReadingSkills.forEach(t => {
        if (t && typeof t === 'string') tags.add(t.trim().toUpperCase());
      });
    }

    // 3. Kỹ năng nghe sai (VD: LIS_P1_Q2, LIS_MAP_LABELLING)
    if (Array.isArray(blueprintProfile.failedListeningSkills)) {
      blueprintProfile.failedListeningSkills.forEach(t => {
        if (t && typeof t === 'string') tags.add(t.trim().toUpperCase());
      });
    }

    // 4. Tiêu chí viết yếu (VD: TR_TASK2_MISSING, GRA)
    if (Array.isArray(blueprintProfile.weakWritingCriteria)) {
      blueprintProfile.weakWritingCriteria.forEach(t => {
        if (t && typeof t === 'string') tags.add(t.trim().toUpperCase());
      });
    }

    // 5. Tiêu chí nói yếu (VD: FC_SHORT_RESPONSE, PRON)
    if (Array.isArray(blueprintProfile.weakSpeakingCriteria)) {
      blueprintProfile.weakSpeakingCriteria.forEach(t => {
        if (t && typeof t === 'string') tags.add(t.trim().toUpperCase());
      });
    }

    return Array.from(tags);
  }

  /**
   * Kiểm tra xem một bài học cụ thể có khớp với lỗ hổng kiến thức cần cứu bài hay không
   */
  static isNodeMatchingRemedial(node, remedialTags = []) {
    if (!node || !remedialTags || remedialTags.length === 0) return false;
    const nodeTags = (node.tags || []).map(t => String(t).toUpperCase());
    const nodeId = String(node.id || '').toUpperCase();
    const nodeTitle = String(node.title || '').toUpperCase();

    return remedialTags.some(rt => {
      if (!rt) return false;
      const target = rt.toUpperCase();

      // Khớp trực tiếp tag
      if (nodeTags.includes(target)) return true;

      // Khớp id hoặc từ khóa trong title
      if (nodeId.includes(target) || target.includes(nodeId)) return true;

      // Khớp các tiền tố ngữ pháp đặc trị
      if (target.startsWith('G_') && nodeTags.some(t => t.includes(target) || target.includes(t))) return true;

      // Khớp kỹ năng đọc
      if (target.startsWith('READ_') && node.domain === 'READING') {
        if (target.includes('TFNG') && nodeTitle.includes('TFNG')) return true;
        if (target.includes('MAP') && nodeTitle.includes('MAP')) return true;
      }

      // Khớp kỹ năng nghe
      if (target.startsWith('LIS_') && (node.domain === 'LISTENING' || node.domain === 'PRE_LISTENING')) {
        if (target.includes('P1') && (nodeTags.includes('LIS_P1') || nodeTitle.includes('PART 1'))) return true;
        if (target.includes('MAP') && nodeTitle.includes('MAP')) return true;
      }

      return false;
    });
  }

  /**
   * Lọc kho bài tập theo Band điểm và can thiệp cứu bài khẩn cấp:
   * - CỨU BÀI KHẨN CẤP: Giữ lại 100% bài học mà học sinh đã làm sai ở bài test, cấm cắt đầu.
   * - CHẶN A1: Chặn bài vỡ lòng nếu trình độ học sinh đã vượt ngưỡng A1.
   * - TỪ VỰNG: Giữ nguyên 28 Unit nếu có chỉ đạo FULL_100_PERCENT.
   * - GỌT ĐẦU & ĐUÔI: Loại bỏ bài quá dễ hoặc quá khó so với mục tiêu.
   */
  static pruneCurriculumByBands(allNodes = [], startBand = 0.0, targetBand = 7.0, aiOptions = {}) {
    if (!Array.isArray(allNodes)) return [];

    const sBand = parseFloat(startBand) || 0.0;
    const tBand = Math.min(7.0, parseFloat(targetBand) || 7.0);

    // Bóc tách tags cứu bài từ blueprintProfile hoặc các trường yếu
    const blueprintProfile = aiOptions.blueprintProfile || aiOptions.details?.blueprintProfile || {};
    const blueprintRemedialTags = this.extractRemedialTagsFromBlueprint(blueprintProfile);

    const weakTags = [
      ...(aiOptions.retained_weak_tags || []),
      ...(aiOptions.weak_tags || []),
      ...blueprintRemedialTags
    ];

    const prunedTags = aiOptions.pruned_tags || aiOptions.mastered_tags || [];
    const excludedDomains = (aiOptions.pruned_domains || aiOptions.excluded_domains || []).map(d => String(d).toUpperCase());
    const focusDomains = (aiOptions.focus_domains || []).map(d => String(d).toUpperCase());
    const isFullVocab = (aiOptions.vocab_requirement === 'FULL_100_PERCENT');
    const prohibitedLevels = aiOptions.quota_policy?.prohibited_levels || [];

    return allNodes.filter((node, idx) => {
      if (!node) return false;
      const d = (node.domain || '').toUpperCase();
      const nodeTags = node.tags || [];
      const stg = node.stage || 'S1';
      const titleLower = (node.title || '').toLowerCase();
      const idUpper = (node.id || '').toUpperCase();

      const isRemedial = this.isNodeMatchingRemedial(node, weakTags);

      // 🔴 NGUYÊN TẮC CỨU BÀI TỐI CAO:
      // NẾU LÀ ĐỐT CỨU BÀI DO HỌC SINH LÀM SAI TRONG BÀI THI -> BẮT BUỘC GIỮ LẠI 100%, CẤM CẮT ĐẦU!
      if (isRemedial) {
        node.isRemedial = true;
        node.remedialReason = "Đặc trị lỗi sai bài thi chẩn đoán (Diagnostic Blueprint)";
        return true;
      }

      // 1. LUẬT LỌC TRÌNH ĐỘ CỦA AI: CHẶN CÁC BÀI VỠ LÒNG NẾU THUỘC PROHIBITED LEVELS
      if (prohibitedLevels.includes("A1")) {
        const isA1Content = idUpper.includes('_A1') || titleLower.includes(' a1') || nodeTags.some(t => String(t).includes('_A1'));
        if (isA1Content && !isRemedial) {
          return false;
        }
      }

      // 2. BẢO TỒN 100% KHO TỪ VỰNG 28 UNIT KHI CÓ CHỈ ĐẠO
      if (isFullVocab && d === 'VOCABULARY') {
        return true;
      }

      // 3. CẮT BỎ CÁC DOMAIN BỊ AI LOẠI TRỪ (VÍ DỤ: PRE_READING)
      if (excludedDomains.some(ex => d === ex || d.startsWith(ex) || ex.includes(d))) {
        return false;
      }

      // 4. CẮT BỎ CÁC TAGS RÂU RIA AI ĐÁNH GIÁ ĐÃ VỮNG
      if (prunedTags.length > 0 && nodeTags.length > 0 && nodeTags.every(t => prunedTags.includes(t))) {
        return false;
      }

      // 5. BẢO VỆ CÁC DOMAIN TRỌNG TÂM ĐỂ DÀNH NGUYÊN LIỆU CHO CÁC CHẶNG
      if (focusDomains.some(fc => d === fc || d.includes(fc))) {
        if (tBand <= 5.5 && stg === 'S4') return false;
        return true;
      }

      // 6. CẮT ĐẦU THEO BAND XUẤT PHÁT (HEAD-CUT) - CHỈ ÁP DỤNG NẾU KHÔNG PHẢI BÀI CỨU
      if (sBand >= 3.5 && stg === 'S1') return false;
      if (sBand >= 4.5 && stg === 'S1') return false;
      if (sBand >= 5.0 && stg === 'S2' && !d.includes('PRE_WRITING')) return false;
      if (sBand >= 5.5 && stg === 'S2') return false;
      if (sBand >= 6.0 && stg === 'S3' && (titleLower.includes('có mớm') || d.includes('PRE_'))) return false;
      if (sBand >= 6.5 && stg === 'S3') return false;

      // 7. CẮT ĐUÔI THEO BAND MỤC TIÊU (TAIL-CUT)
      if (tBand <= 5.0 && (stg === 'S3' || stg === 'S4')) return false;
      if (tBand <= 5.5 && stg === 'S4') return false;
      if (tBand <= 6.0 && stg === 'S4') return false;
      if (tBand <= 6.5 && stg === 'S4' && idx % 3 === 0) return false;

      return true;
    });
  }
}
