import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, QueryFailedError, Repository } from "typeorm";
import { CreateHistoryDto } from "./dto/create-history.dto";
import { HistoryQueryDto } from "./dto/history-query.dto";
import { JwtUser } from "commons/decorators/current-user.decorator";
import { DesignResult } from "./entities/design-result.entity";

const INPUT = [
  "flow_rate_m3_h", "temperature_c", "dust_concentration_g_m3", "dust_density_kg_m3",
  "d_min_target_um", "chamber_height_m", "chamber_length_m", "chamber_width_m",
  "gas_velocity_m_s", "operating_hours_per_day", "pipe_velocity_m_s", "pipe_diameter_m",
  "pipe_length_m", "friction_r_pa_m", "roughness_beta", "local_resistance_sum",
  "chamber_pressure_drop_pa", "fan_efficiency",
] as const;
const INPUT_REQUIRED = [
  "flow_rate_m3_h", "temperature_c", "dust_concentration_g_m3", "dust_density_kg_m3",
];
const INPUT_NULLABLE = [
  "d_min_target_um", "chamber_height_m", "chamber_length_m", "chamber_width_m", "pipe_diameter_m",
];
const INPUT_POSITIVE = [
  "flow_rate_m3_h", "dust_density_kg_m3", "d_min_target_um", "chamber_height_m",
  "chamber_length_m", "chamber_width_m", "gas_velocity_m_s", "pipe_velocity_m_s", "pipe_diameter_m",
];
const INPUT_NONNEGATIVE = [
  "dust_concentration_g_m3", "pipe_length_m", "friction_r_pa_m", "roughness_beta",
  "local_resistance_sum", "chamber_pressure_drop_pa",
];
const RESULT = [
  "h_m", "l_m", "b_m", "mu_pa_s", "rho_gas_kg_m3", "u_m_s", "tau1_s", "tau2_s",
  "l_min_m", "bl_m2", "d_min_calc_um", "d_limit_um", "is_retained", "gv_kg_h",
  "yv_percent", "gs_kg_h", "qs_m3_h", "gb_kg_h", "m1_kg_h", "m2_kg_h",
  "mt_kg_h", "mn_kg_day", "mr_kg_h", "cb_out_mg_m3", "eta_total_percent", "d0_m",
  "vt_m_s", "alpha", "dp_friction_pa", "p_dynamic_pa", "p_local_pa", "dp_pipe_pa",
  "dp_system_pa", "fan_power_kw",
] as const;
const FRACTION_RESULT = [
  "d_rep_um", "settling_velocity_m_s", "efficiency_percent",
  "inlet_conc_g_m3", "outlet_conc_g_m3", "regime",
] as const;

type Row = Record<string, unknown>;

// Đã bổ sung u.full_name AS "ownerName" vào SUMMARY_COLUMNS để phục vụ Admin.
const SUMMARY_COLUMNS = `
  v.id, v.user_id AS "userId", u.full_name AS "ownerName", v.name, v.mode, v.created_at AS "createdAt",
  v.flow_rate_m3_h AS "flowRateM3H", v.temperature_c AS "temperatureC",
  v.dust_concentration_g_m3 AS "dustConcentrationGM3",
  v.h_m AS "hM", v.l_m AS "lM", v.b_m AS "bM",
  v.d_min_calc_um AS "dMinCalcUm", v.is_retained AS "isRetained",
  v.eta_total_percent AS "etaTotalPercent", v.cb_out_mg_m3 AS "cbOutMgM3",
  v.fan_power_kw AS "fanPowerKw"
`;

@Injectable()
export class HistoryService {
  constructor(
      @InjectRepository(DesignResult)
      private readonly results: Repository<DesignResult>,
      private readonly db: DataSource,
  ) {}

  private assertCanAccess(user: JwtUser, ownerId: number) {
    if (user.role !== "admin" && user.id !== ownerId) {
      throw new ForbiddenException("Bạn không có quyền truy cập lịch sử của người khác");
    }
  }

  private async getAccessibleProject(id: number, user: JwtUser) {
    const [project]: Array<Row & { user_id: number }> = await this.db.query(
        `SELECT * FROM design_projects WHERE id = $1`, [id],
    );
    if (!project) throw new NotFoundException(`Không tìm thấy lịch sử ID ${id}`);
    this.assertCanAccess(user, project.user_id);
    return project;
  }

  async findAll(q: HistoryQueryDto, user: JwtUser) {
    return this.list(q, user.role === "admin" ? undefined : user.id);
  }

  async findByUser(userId: number, q: HistoryQueryDto, user: JwtUser) {
    this.assertCanAccess(user, userId);
    const result = await this.list(q, userId);
    const hasFilter = Boolean(q.search?.trim() || q.mode || q.fromDate || q.toDate);
    if (result.meta.total === 0 && !hasFilter) {
      throw new NotFoundException("Người dùng này chưa có lịch sử tính toán nào");
    }
    return result;
  }

  private async list(q: HistoryQueryDto, userId?: number) {
    if (q.fromDate && q.toDate && q.fromDate > q.toDate) {
      throw new BadRequestException("fromDate phải nhỏ hơn hoặc bằng toDate");
    }
    const conditions: string[] = [];
    const values: unknown[] = [];
    const filter = (sql: string, value: unknown) => {
      values.push(value);
      conditions.push(`${sql} $${values.length}`);
    };

    if (userId !== undefined) filter("v.user_id =", userId);
    if (q.search?.trim()) {
      values.push(`%${q.search.trim()}%`);
      // Tìm kiếm trên cả tên dự án hoặc tên người dùng (dành cho Admin)
      conditions.push(`(v.name ILIKE $${values.length} OR u.full_name ILIKE $${values.length})`);
    }
    if (q.mode) filter("v.mode =", q.mode);
    if (q.fromDate) filter("v.created_at >=", new Date(`${q.fromDate}T00:00:00+07:00`));
    if (q.toDate) {
      filter("v.created_at <", new Date(Date.parse(`${q.toDate}T00:00:00+07:00`) + 86400000));
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortColumns: Record<string, string> = {
      createdAt: "v.created_at",
      name: "v.name",
      etaTotalPercent: "v.eta_total_percent",
    };
    const sort = sortColumns[String(q.sortBy ?? "createdAt")] ?? "v.created_at";
    const direction = String(q.order).toUpperCase() === "ASC" ? "ASC" : "DESC";
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;

    const [count]: Array<{ total: number }> = await this.db.query(
        `SELECT COUNT(*)::int AS total FROM v_design_summary v LEFT JOIN users u ON v.user_id = u.id ${where}`, values,
    );
    const data = await this.db.query(
        `SELECT ${SUMMARY_COLUMNS}
         FROM v_design_summary v LEFT JOIN users u ON v.user_id = u.id
         ${where}
         ORDER BY ${sort} ${direction}, v.id DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, (page - 1) * limit], // Đã sửa (page - 1)
    );
    const total = count?.total ?? 0;
    return { data, meta: {
        page, limit, total, totalPages: Math.ceil(total / limit),
      } };
  }

  private check(
      obj: unknown, allowed: readonly string[], required: readonly string[],
      nullable: readonly string[] = [], booleanKeys: readonly string[] = [], stringKeys: readonly string[] = [],
  ): Row {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      throw new BadRequestException("Dữ liệu phải là object");
    }
    const data = obj as Row;
    for (const key of Object.keys(data)) {
      if (!allowed.includes(key)) throw new BadRequestException(`Trường không hợp lệ: ${key}`);
      const value = data[key];
      if (value === null && nullable.includes(key)) continue;
      if (stringKeys.includes(key) ? typeof value !== "string" :
          booleanKeys.includes(key) ? typeof value !== "boolean" :
              typeof value !== "number" || !Number.isFinite(value)) {
        throw new BadRequestException(`Sai kiểu dữ liệu: ${key}`);
      }
    }
    for (const key of required) {
      if (data[key] === undefined || data[key] === null) {
        throw new BadRequestException(`Thiếu trường: ${key}`);
      }
    }
    return data;
  }

  private between(data: Row, key: string, min: number, max: number, minIncluded = true) {
    const v = data[key];
    if (v !== undefined && v !== null &&
        (typeof v !== "number" || (minIncluded ? v < min : v <= min) || v > max)) {
      throw new BadRequestException(`Giá trị ${key} ngoài phạm vi cho phép`);
    }
  }

  private validateInput(input: Row) {
    for (const key of INPUT_POSITIVE) this.between(input, key, 0, Infinity, false);
    for (const key of INPUT_NONNEGATIVE) this.between(input, key, 0, Infinity);
    this.between(input, "temperature_c", -50, 1000);
    this.between(input, "operating_hours_per_day", 0, 24);
    this.between(input, "fan_efficiency", 0, 1, false);
    const has = (k: string) => {
      const value = input[k];
      return typeof value === "number" && value > 0;
    };
    if (!(
        (has("chamber_height_m") && has("chamber_length_m") && has("chamber_width_m")) ||
        (has("d_min_target_um") && (has("chamber_height_m") || has("chamber_length_m") || has("chamber_width_m")))
    )) throw new BadRequestException("Cần đủ L/W/H hoặc d_min_target_um và ít nhất một kích thước");
  }

  private insert(manager: EntityManager, table: "design_inputs" | "design_results", columns: readonly string[], data: Row, projectId: number) {
    const keys = columns.filter(k => data[k] !== undefined);
    const args = [projectId, ...keys.map(k => data[k])];
    const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
    return manager.query(
        `INSERT INTO ${table} (project_id, ${keys.join(", ")}) VALUES (${placeholders})`, args,
    );
  }

  async findOne(id: number, user: JwtUser) {
    const project = await this.getAccessibleProject(id, user);
    const [inputs, result, fractions] = await Promise.all([
      this.db.query(`SELECT * FROM design_inputs WHERE project_id = $1`, [id]),
      this.results.findOneBy({ project_id: id }),
      this.db.query(
          `SELECT f.*, to_jsonb(fr) - 'fraction_id' AS result,
                  COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name)
                    ORDER BY c.id)
                            FROM fraction_collector_suggestions s JOIN dust_collectors c ON c.id = s.collector_id
                            WHERE s.fraction_id = f.id), '[]'::jsonb) AS collectors
           FROM dust_fractions f LEFT JOIN fraction_results fr ON fr.fraction_id = f.id
           WHERE f.project_id = $1 ORDER BY f.sort_order`, [id],
      ),
    ]);
    return { project, input: inputs[0] ?? null, result, fractions };
  }

  async remove(id: number, user: JwtUser) {
    await this.getAccessibleProject(id, user);
    await this.db.query(`DELETE FROM design_projects WHERE id = $1`, [id]);
    return { message: `Đã xóa lịch sử ID ${id}`, id };
  }
}