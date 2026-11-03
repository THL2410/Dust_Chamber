-- Dùng cho DB ĐÃ CÓ DỮ LIỆU (không dùng cho DB mới, init.sql đã có sẵn cột này).
-- Trước đây u_m_s lưu vận tốc lắng của hạt d_limit. Nay u_m_s = B3 (vận tốc khí ngang),
-- vận tốc lắng chuyển sang cột settling_velocity_limit_m_s.
-- Vận tốc ngang suy ngược từ τ2 = L/u  =>  u = L/τ2.
BEGIN;
ALTER TABLE design_results ADD COLUMN IF NOT EXISTS settling_velocity_limit_m_s double precision;
UPDATE design_results
   SET settling_velocity_limit_m_s = u_m_s,
       u_m_s = l_m / tau2_s
 WHERE settling_velocity_limit_m_s IS NULL;
ALTER TABLE design_results ALTER COLUMN settling_velocity_limit_m_s SET NOT NULL;
COMMIT;
