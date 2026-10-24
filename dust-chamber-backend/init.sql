-- =====================================================================
-- 1. HÀM DÙNG CHUNG
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 2. KHUNG CƠ BẢN (USERS & AUTH)
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  phone         VARCHAR(20),
  role          VARCHAR(20)  NOT NULL DEFAULT 'user',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent VARCHAR(255),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 3. ENUMS & BẢNG TRA CỨU (BUỒNG LẮNG BỤI)
-- =====================================================================
CREATE TYPE design_mode    AS ENUM ('CHECK', 'DESIGN');
CREATE TYPE capture_regime AS ENUM ('FULL', 'PARTIAL', 'OTHER_DEVICE');

CREATE TABLE alpha_coefficients (                       
  temperature_c  smallint         PRIMARY KEY,
  alpha          double precision NOT NULL CHECK (alpha > 0)
);

CREATE TABLE dust_collectors (                          
  id                 smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code               varchar(30)      NOT NULL UNIQUE,
  name               varchar(100)     NOT NULL,
  min_diameter_um    double precision NOT NULL CHECK (min_diameter_um > 0),
  max_diameter_um    double precision NOT NULL,
  typical_efficiency varchar(50)      NOT NULL,
  note               varchar(300),
  is_active          boolean          NOT NULL DEFAULT true,
  CONSTRAINT ck_collector_range CHECK (max_diameter_um >= min_diameter_um)
);

-- =====================================================================
-- 4. PHƯƠNG ÁN THIẾT KẾ & ĐẦU VÀO
-- =====================================================================
CREATE TABLE design_projects (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name             varchar(200) NOT NULL,
  mode             design_mode  NOT NULL,
  note             text,
  formula_version  smallint     NOT NULL DEFAULT 1,      
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_design_projects_created_at ON design_projects (created_at DESC);
CREATE TRIGGER trg_design_projects_updated
  BEFORE UPDATE ON design_projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE design_inputs (
  project_id                integer PRIMARY KEY REFERENCES design_projects (id) ON DELETE CASCADE,
  flow_rate_m3_h            double precision NOT NULL CHECK (flow_rate_m3_h > 0),            
  temperature_c             double precision NOT NULL CHECK (temperature_c BETWEEN -50 AND 1000), 
  dust_concentration_g_m3   double precision NOT NULL CHECK (dust_concentration_g_m3 >= 0),  
  dust_density_kg_m3        double precision NOT NULL CHECK (dust_density_kg_m3 > 0),        
  d_min_target_um           double precision CHECK (d_min_target_um > 0),                    
  chamber_height_m          double precision CHECK (chamber_height_m > 0),                   
  chamber_length_m          double precision CHECK (chamber_length_m > 0),                   
  chamber_width_m           double precision CHECK (chamber_width_m > 0),                    
  gas_velocity_m_s          double precision NOT NULL DEFAULT 0.18 CHECK (gas_velocity_m_s > 0),
  operating_hours_per_day   double precision NOT NULL DEFAULT 16 CHECK (operating_hours_per_day BETWEEN 0 AND 24),
  pipe_velocity_m_s         double precision NOT NULL DEFAULT 15 CHECK (pipe_velocity_m_s > 0),
  pipe_diameter_m           double precision CHECK (pipe_diameter_m > 0),                    
  pipe_length_m             double precision NOT NULL DEFAULT 32 CHECK (pipe_length_m >= 0), 
  friction_r_pa_m           double precision NOT NULL DEFAULT 4.05 CHECK (friction_r_pa_m >= 0),
  roughness_beta            double precision NOT NULL DEFAULT 1 CHECK (roughness_beta >= 0),
  local_resistance_sum      double precision NOT NULL DEFAULT 0 CHECK (local_resistance_sum >= 0), 
  chamber_pressure_drop_pa  double precision NOT NULL DEFAULT 245 CHECK (chamber_pressure_drop_pa >= 0),
  fan_efficiency            double precision NOT NULL DEFAULT 0.6 CHECK (fan_efficiency > 0 AND fan_efficiency <= 1),
  CONSTRAINT ck_input_mode_data CHECK (
    (chamber_height_m IS NOT NULL AND chamber_length_m IS NOT NULL AND chamber_width_m IS NOT NULL)
    OR (d_min_target_um IS NOT NULL
        AND (chamber_height_m IS NOT NULL OR chamber_length_m IS NOT NULL OR chamber_width_m IS NOT NULL))
  )
);

CREATE TABLE dust_fractions (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id    integer          NOT NULL REFERENCES design_projects (id) ON DELETE CASCADE,
  sort_order    smallint         NOT NULL,
  d_from_um     double precision NOT NULL CHECK (d_from_um >= 0),
  d_to_um       double precision,                          
  mass_percent  double precision NOT NULL CHECK (mass_percent BETWEEN 0 AND 100),
  CONSTRAINT uq_fraction_order UNIQUE (project_id, sort_order),
  CONSTRAINT ck_fraction_range CHECK (d_to_um IS NULL OR d_to_um >= d_from_um)
);

-- =====================================================================
-- 5. KẾT QUẢ TÍNH TOÁN & VIEW
-- =====================================================================
CREATE TABLE design_results (
  project_id            integer PRIMARY KEY REFERENCES design_projects (id) ON DELETE CASCADE,
  h_m                   double precision NOT NULL CHECK (h_m > 0),
  l_m                   double precision NOT NULL CHECK (l_m > 0),
  b_m                   double precision NOT NULL CHECK (b_m > 0),
  mu_pa_s               double precision NOT NULL,   
  rho_gas_kg_m3         double precision NOT NULL,   
  u_m_s                 double precision NOT NULL,   
  tau1_s                double precision NOT NULL,   
  tau2_s                double precision NOT NULL,   
  l_min_m               double precision NOT NULL,   
  bl_m2                 double precision NOT NULL,   
  d_min_calc_um         double precision NOT NULL,   
  d_limit_um            double precision NOT NULL,   
  is_retained           boolean          NOT NULL,   
  gv_kg_h               double precision NOT NULL,   
  yv_percent            double precision NOT NULL,   
  gs_kg_h               double precision NOT NULL,   
  qs_m3_h               double precision NOT NULL,   
  gb_kg_h               double precision NOT NULL,   
  m1_kg_h               double precision NOT NULL,   
  m2_kg_h               double precision NOT NULL,   
  mt_kg_h               double precision NOT NULL,   
  mn_kg_day             double precision NOT NULL,   
  mr_kg_h               double precision NOT NULL,   
  cb_out_mg_m3          double precision NOT NULL,   
  eta_total_percent     double precision NOT NULL,   
  d0_m                  double precision NOT NULL,   
  vt_m_s                double precision NOT NULL,   
  alpha                 double precision NOT NULL,   
  dp_friction_pa        double precision NOT NULL,   
  p_dynamic_pa          double precision NOT NULL,   
  p_local_pa            double precision NOT NULL,   
  dp_pipe_pa            double precision NOT NULL,   
  dp_system_pa          double precision NOT NULL,   
  fan_power_kw          double precision NOT NULL    
);

CREATE TABLE fraction_results (
  fraction_id            integer PRIMARY KEY REFERENCES dust_fractions (id) ON DELETE CASCADE,
  d_rep_um               double precision NOT NULL,   
  settling_velocity_m_s  double precision NOT NULL,   
  efficiency_percent     double precision NOT NULL CHECK (efficiency_percent BETWEEN 0 AND 100), 
  inlet_conc_g_m3        double precision NOT NULL,
  outlet_conc_g_m3       double precision NOT NULL,
  regime                 capture_regime   NOT NULL
);
CREATE INDEX idx_fraction_results_regime ON fraction_results (regime);

CREATE TABLE fraction_collector_suggestions (
  fraction_id   integer  NOT NULL REFERENCES fraction_results (fraction_id) ON DELETE CASCADE,
  collector_id  smallint NOT NULL REFERENCES dust_collectors (id) ON DELETE RESTRICT,
  PRIMARY KEY (fraction_id, collector_id)
);
CREATE INDEX idx_suggestions_collector ON fraction_collector_suggestions (collector_id);

CREATE VIEW v_design_summary AS
SELECT p.id, p.name, p.mode, p.created_at,
       i.flow_rate_m3_h, i.temperature_c, i.dust_concentration_g_m3,
       r.h_m, r.l_m, r.b_m, r.d_min_calc_um, r.is_retained,
       r.eta_total_percent, r.cb_out_mg_m3, r.fan_power_kw
FROM design_projects p
JOIN design_inputs  i ON i.project_id = p.id
JOIN design_results r ON r.project_id = p.id;

-- =====================================================================
-- 6. DỮ LIỆU MẪU CỐ ĐỊNH
-- =====================================================================
INSERT INTO alpha_coefficients (temperature_c, alpha) VALUES
  (5,1.03),(10,1.02),(15,1.01),(20,1.00),(25,0.99),(30,0.98),
  (35,0.97),(40,0.96),(45,0.95),(50,0.94),(60,0.93),(70,0.92);

INSERT INTO dust_collectors (code, name, min_diameter_um, max_diameter_um, typical_efficiency, note) VALUES
  ('CYCLONE',       'Cyclone đơn',                5,    500, '70–90 %',    'Rẻ, bền; kém với hạt < 5 μm'),
  ('MULTI_CYCLONE', 'Cyclone đa ống',             3,    200, '80–95 %',    'Hiệu suất cao hơn cyclone đơn, trở lực lớn hơn'),
  ('WET_SCRUBBER',  'Tháp rửa khí (lọc bụi ướt)', 0.5,  100, '90–99 %',    'Phát sinh nước thải'),
  ('BAGHOUSE',      'Lọc túi vải',                0.1,  100, '> 99 %',     'Khí không quá nóng/ẩm; cần vệ sinh túi'),
  ('ESP',           'Lọc bụi tĩnh điện',          0.05, 100, '95–99,9 %',  'Đầu tư lớn, phù hợp lưu lượng lớn');