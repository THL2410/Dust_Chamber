-- CẢNH BÁO: xóa toàn bộ dữ liệu thiết kế và lịch sử tính toán. Chỉ dùng khi dev.
-- =====================================================================
-- 0. DỌN DẸP CẤU TRÚC CŨ TRƯỚC KHI TẠO MỚI
-- (Giữ nguyên bảng users và refresh_tokens)
-- =====================================================================
DROP VIEW IF EXISTS v_design_summary CASCADE;
DROP TABLE IF EXISTS fraction_collector_suggestions CASCADE;
DROP TABLE IF EXISTS fraction_results CASCADE;
DROP TABLE IF EXISTS dust_fractions CASCADE;
DROP TABLE IF EXISTS design_results CASCADE;
DROP TABLE IF EXISTS design_inputs CASCADE;
DROP TABLE IF EXISTS design_projects CASCADE;
DROP TABLE IF EXISTS dust_collectors CASCADE;
DROP TABLE IF EXISTS alpha_coefficients CASCADE;

DROP TYPE IF EXISTS design_mode CASCADE;
DROP TYPE IF EXISTS capture_regime CASCADE;

