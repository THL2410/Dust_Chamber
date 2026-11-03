-- Dùng cho DB ĐÃ CÓ DỮ LIỆU (DB mới đã có sẵn thay đổi này trong init.sql). Chạy lại nhiều lần vẫn an toàn.
-- Cho phép lưu phương án thiếu số liệu: ở chế độ DESIGN, Cb và phân bố hạt là tùy chọn.
--   NULL = "Không có số liệu" (frontend hiển thị như vậy).
-- Không sửa dữ liệu cũ: các phương án đã lưu trước đây giữ nguyên kết quả, kể cả η của dải < 40 μm.
BEGIN;

-- Cb có thể bỏ trống ở chế độ DESIGN
ALTER TABLE design_inputs ALTER COLUMN dust_concentration_g_m3 DROP NOT NULL;

-- Kết quả phụ thuộc Cb (gv … gb, ống, quạt) hoặc phụ thuộc cả Cb lẫn phân bố hạt (m1 … cb_out);
-- eta_total_percent chỉ phụ thuộc phân bố hạt.
ALTER TABLE design_results
  ALTER COLUMN gv_kg_h DROP NOT NULL,
  ALTER COLUMN yv_percent DROP NOT NULL,
  ALTER COLUMN gs_kg_h DROP NOT NULL,
  ALTER COLUMN qs_m3_h DROP NOT NULL,
  ALTER COLUMN gb_kg_h DROP NOT NULL,
  ALTER COLUMN m1_kg_h DROP NOT NULL,
  ALTER COLUMN m2_kg_h DROP NOT NULL,
  ALTER COLUMN mt_kg_h DROP NOT NULL,
  ALTER COLUMN mn_kg_day DROP NOT NULL,
  ALTER COLUMN mr_kg_h DROP NOT NULL,
  ALTER COLUMN cb_out_mg_m3 DROP NOT NULL,
  ALTER COLUMN eta_total_percent DROP NOT NULL,
  ALTER COLUMN d0_m DROP NOT NULL,
  ALTER COLUMN vt_m_s DROP NOT NULL,
  ALTER COLUMN dp_friction_pa DROP NOT NULL,
  ALTER COLUMN p_dynamic_pa DROP NOT NULL,
  ALTER COLUMN p_local_pa DROP NOT NULL,
  ALTER COLUMN dp_pipe_pa DROP NOT NULL,
  ALTER COLUMN dp_system_pa DROP NOT NULL,
  ALTER COLUMN fan_power_kw DROP NOT NULL;

-- Kết quả theo dải: dải < 40 μm không có η; thiếu Cb thì không có nồng độ vào/ra
ALTER TABLE fraction_results
  ALTER COLUMN efficiency_percent DROP NOT NULL,
  ALTER COLUMN inlet_conc_g_m3 DROP NOT NULL,
  ALTER COLUMN outlet_conc_g_m3 DROP NOT NULL;

COMMIT;
