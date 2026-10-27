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

// Cột trả về cho danh sách / xem theo id (đọc từ view v_design_summary).
const SUMMARY_COLUMNS = `id, user_id AS "userId", name, mode, created_at AS "createdAt",
  flow_rate_m3_h AS "flowRateM3H", temperature_c AS "temperatureC",
  dust_concentration_g_m3 AS "dustConcentrationGM3",
  h_m AS "hM", l_m AS "lM", b_m AS "bM",
  d_min_calc_um AS "dMinCalcUm", is_retained AS "isRetained",
  eta_total_percent AS "etaTotalPercent", cb_out_mg_m3 AS "cbOutMgM3",
  fan_power_kw AS "fanPowerKw"`;

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

    if (userId !== undefined) filter("user_id =", userId);
    if (q.search?.trim()) filter("name ILIKE", `%${q.search.trim()}%`);
    if (q.mode) filter("mode =", q.mode);
    if (q.fromDate) filter("created_at >=", new Date(`${q.fromDate}T00:00:00+07:00`));
    if (q.toDate) {
      filter("created_at <", new Date(Date.parse(`${q.toDate}T00:00:00+07:00`) + 86400000));
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sortColumns: Record<string, string> = {
      createdAt: "created_at",
      name: "name",
      etaTotalPercent: "eta_total_percent",
    };
    const sort = sortColumns[String(q.sortBy ?? "createdAt")] ?? "created_at";
    const direction = String(q.order).toUpperCase() === "ASC" ? "ASC" : "DESC";
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;

    const [count]: Array<{ total: number }> = await this.db.query(
        `SELECT COUNT(*)::int AS total FROM v_design_summary ${where}`, values,
    );
    const data = await this.db.query(
        `SELECT ${SUMMARY_COLUMNS}
       FROM v_design_summary ${where}
       ORDER BY ${sort} ${direction}, id DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, (page - 1) * limit],
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

  // // POST /api/history — transaction bao trọn phương án, kết quả và phân cấp bụi.
  // async create(dto: CreateHistoryDto, user: JwtUser) {
  //   const name = dto.name.trim();
  //   if (!name) throw new BadRequestException("Tên phương án không được để trống");
  //   const input = this.check(dto.input, INPUT, INPUT_REQUIRED, INPUT_NULLABLE);
  //   const result = this.check(dto.result, RESULT, RESULT, [], ["is_retained"]);
  //   this.validateInput(input);
  //   for (const key of ["h_m", "l_m", "b_m"]) this.between(result, key, 0, Infinity, false);
  //   if ((dto.fractions?.length ?? 0) > 32767) throw new BadRequestException("Quá nhiều dải bụi");
  //
  //   try {
  //     return await this.db.transaction(async manager => {
  //       const [project]: Array<{ id: number }> = await manager.query(
  //           `INSERT INTO design_projects (user_id, name, mode, note) VALUES ($1, $2, $3, $4) RETURNING id`,
  //           [user.id, name, dto.mode, dto.note ?? null],
  //       );
  //       await this.insert(manager, "design_inputs", INPUT, input, project.id);
  //       await this.insert(manager, "design_results", RESULT, result, project.id);
  //
  //       for (const [i, raw] of (dto.fractions ?? []).entries()) {
  //         if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
  //           throw new BadRequestException("fractions phải chứa object");
  //         }
  //         const f = raw as unknown as Row;
  //         for (const key of Object.keys(f)) {
  //           if (!["d_from_um", "d_to_um", "mass_percent", "result", "collector_ids"].includes(key)) {
  //             throw new BadRequestException(`Trường dải bụi không hợp lệ: ${key}`);
  //           }
  //         }
  //         for (const key of ["d_from_um", "mass_percent"]) {
  //           if (typeof f[key] !== "number" || !Number.isFinite(f[key])) {
  //             throw new BadRequestException(`Thiếu hoặc sai trường: ${key}`);
  //           }
  //         }
  //         if (f.d_to_um !== undefined && f.d_to_um !== null &&
  //             (typeof f.d_to_um !== "number" || !Number.isFinite(f.d_to_um))) {
  //           throw new BadRequestException("d_to_um phải là số hoặc null");
  //         }
  //         this.between(f, "d_from_um", 0, Infinity);
  //         this.between(f, "mass_percent", 0, 100);
  //         if (typeof f.d_to_um === "number" && f.d_to_um < (f.d_from_um as number)) {
  //           throw new BadRequestException("d_to_um phải >= d_from_um");
  //         }
  //         const fr = this.check(f.result, FRACTION_RESULT, FRACTION_RESULT, [], [], ["regime"]);
  //         if (!["FULL", "PARTIAL", "OTHER_DEVICE"].includes(String(fr.regime))) {
  //           throw new BadRequestException("regime không hợp lệ");
  //         }
  //         this.between(fr, "efficiency_percent", 0, 100);
  //         const ids = f.collector_ids ?? [];
  //         if (!Array.isArray(ids) || ids.some(id => !Number.isInteger(id) || id < 1 || id > 32767) ||
  //             new Set(ids).size !== ids.length) {
  //           throw new BadRequestException("collector_ids phải là danh sách ID số nguyên dương không trùng");
  //         }
  //         const [fraction]: Array<{ id: number }> = await manager.query(
  //             `INSERT INTO dust_fractions (project_id, sort_order, d_from_um, d_to_um, mass_percent)
  //              VALUES ($1,$2,$3,$4,$5) RETURNING id`,
  //             [project.id, i + 1, f.d_from_um, f.d_to_um ?? null, f.mass_percent],
  //         );
  //         await manager.query(
  //             `INSERT INTO fraction_results
  //              (fraction_id, d_rep_um, settling_velocity_m_s, efficiency_percent,
  //               inlet_conc_g_m3, outlet_conc_g_m3, regime)
  //              VALUES ($1,$2,$3,$4,$5,$6,$7)`,
  //             [fraction.id, fr.d_rep_um, fr.settling_velocity_m_s, fr.efficiency_percent,
  //               fr.inlet_conc_g_m3, fr.outlet_conc_g_m3, fr.regime],
  //         );
  //         for (const collectorId of ids) await manager.query(
  //             `INSERT INTO fraction_collector_suggestions (fraction_id, collector_id) VALUES ($1,$2)`,
  //             [fraction.id, collectorId],
  //         );
  //       }
  //       return { message: "Lưu lịch sử thành công", id: project.id };
  //     });
  //   } catch (error) {
  //     if (error instanceof QueryFailedError &&
  //         ["23502", "23503", "23505", "23514", "22P02"].includes(
  //             (error.driverError as { code?: string } | undefined)?.code ?? "")) {
  //       throw new BadRequestException("Dữ liệu không thỏa ràng buộc trong PostgreSQL");
  //     }
  //     throw error;
  //   }
  // }

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