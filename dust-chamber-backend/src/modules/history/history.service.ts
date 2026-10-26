
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { DesignSummary } from "./entities/design-summary.entity";
import { HistoryQueryDto } from "./dto/history-query.dto";
import { CreateHistoryDto } from "./dto/create-history.dto";

// Các cột của design_inputs trong init.sql
const INPUT_COLUMNS = [
  "flow_rate_m3_h","temperature_c","dust_concentration_g_m3",
  "dust_density_kg_m3","d_min_target_um","chamber_height_m","chamber_length_m","chamber_width_m",
  "gas_velocity_m_s","operating_hours_per_day","pipe_velocity_m_s","pipe_diameter_m","pipe_length_m",
  "friction_r_pa_m","roughness_beta","local_resistance_sum","chamber_pressure_drop_pa","fan_efficiency",
] as const;

// Các cột bắt buộc của design_inputs
const REQUIRED_INPUT_COLUMNS = [
  "flow_rate_m3_h",
  "temperature_c",
  "dust_concentration_g_m3",
  "dust_density_kg_m3",
];

// Các cột của design_results trong init.sql
const RESULT_COLUMNS = ["h_m","l_m",
  "b_m","mu_pa_s","rho_gas_kg_m3","u_m_s","tau1_s","tau2_s","l_min_m","bl_m2","d_min_calc_um",
  "d_limit_um","is_retained","gv_kg_h","yv_percent","gs_kg_h","qs_m3_h","gb_kg_h","m1_kg_h",
  "m2_kg_h","mt_kg_h","mn_kg_day","mr_kg_h","cb_out_mg_m3","eta_total_percent","d0_m","vt_m_s","alpha",
  "dp_friction_pa","p_dynamic_pa","p_local_pa","dp_pipe_pa","dp_system_pa","fan_power_kw",
] as const;

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(DesignSummary)
    private readonly historyRepository:
      Repository<DesignSummary>,

    private readonly dataSource: DataSource,
  ) {}

  // GET /api/history
  async findAll(query: HistoryQueryDto) {
    const {
      page,
      limit,
      search,
      sortBy,
      order,
    } = query;

    const qb = this.historyRepository
      .createQueryBuilder("history");

    if (search?.trim()) {
      qb.andWhere(
        "history.name ILIKE :search",
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    qb.orderBy(`history.${sortBy}`, order)
      .addOrderBy("history.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Kiểm tra dữ liệu trước khi INSERT.
  // Tên cột được giới hạn theo danh sách cố định.
  private validateData(
    data: Record<string, unknown>,
    allowed: readonly string[],
    required: readonly string[],
    booleanColumn?: string,
  ) {
    const unknownFields = Object.keys(data).filter(
      (key) => !allowed.includes(key),
    );

    if (unknownFields.length > 0) {
      throw new BadRequestException(
        `Trường không hợp lệ: ${unknownFields.join(", ")}`,
      );
    }

    for (const column of required) {
      if (data[column] === null ||
          data[column] === undefined) {
        throw new BadRequestException(
          `Thiếu trường bắt buộc: ${column}`,
        );
      }
    }

    for (const [key, value] of Object.entries(data)) {
      if (value === null) {
        continue;
      }

      if (key === booleanColumn) {
        if (typeof value !== "boolean") {
          throw new BadRequestException(
            `${key} phải là boolean`,
          );
        }
      } else if (
        typeof value !== "number" ||
        !Number.isFinite(value)
      ) {
        throw new BadRequestException(
          `${key} phải là số hợp lệ`,
        );
      }
    }
  }

  // POST /api/history
  async create(dto: CreateHistoryDto) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException(
        "Tên phương án không được để trống",
      );
    }

    this.validateData(
      dto.input,
      INPUT_COLUMNS,
      REQUIRED_INPUT_COLUMNS,
    );

    this.validateData(
      dto.result,
      RESULT_COLUMNS,
      RESULT_COLUMNS,
      "is_retained",
    );

    const input = dto.input;
    const hasPositive = (key: string) => {
      const value = input[key];
      return typeof value === "number" && value > 0;
    };

    const completeChamber =
      hasPositive("chamber_height_m") &&
      hasPositive("chamber_length_m") &&
      hasPositive("chamber_width_m");

    const partialChamber =
      hasPositive("d_min_target_um") &&
      (
        hasPositive("chamber_height_m") ||
        hasPositive("chamber_length_m") ||
        hasPositive("chamber_width_m")
      );

    if (!completeChamber && !partialChamber) {
      throw new BadRequestException(
        "Cần đủ 3 kích thước buồng, hoặc d_min_target_um và ít nhất một kích thước",
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Tạo phương án
      const projects: Array<{ id: number }> =
        await manager.query(
          `INSERT INTO design_projects
             (name, mode, note)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [name, dto.mode, dto.note ?? null],
        );

      const projectId = projects[0].id;

      // 2. Lưu đầu vào
      const inputColumns = INPUT_COLUMNS.filter(
        (column) => dto.input[column] !== undefined,
      );

      const inputNames = ["project_id", ...inputColumns];

      const inputValues = [
        projectId,
        ...inputColumns.map(
          (column) => dto.input[column],
        ),
      ];

      const inputParams = inputValues
        .map((_, index) => `$${index + 1}`)
        .join(", ");

      await manager.query(
        `INSERT INTO design_inputs
          (${inputNames.join(", ")})
         VALUES (${inputParams})`,
        inputValues,
      );

      // 3. Lưu kết quả đã tính toán
      const resultNames = [
        "project_id",
        ...RESULT_COLUMNS,
      ];

      const resultValues = [
        projectId,
        ...RESULT_COLUMNS.map(
          (column) => dto.result[column],
        ),
      ];

      const resultParams = resultValues
        .map((_, index) => `$${index + 1}`)
        .join(", ");

      await manager.query(
        `INSERT INTO design_results
          (${resultNames.join(", ")})
         VALUES (${resultParams})`,
        resultValues,
      );

      return {
        message: "Lưu lịch sử thành công",
        id: projectId,
      };
    });
  }

  // GET /api/history/:id
  // Lấy thông tin chi tiết của một phương án
  async findOne(id: number) {
    const projects: Array<Record<string, unknown>> =
      await this.dataSource.query(
        `SELECT *
         FROM design_projects
         WHERE id = $1`,
        [id],
      );

    if (projects.length === 0) {
      throw new NotFoundException(
        `Không tìm thấy lịch sử có ID ${id}`,
      );
    }

    const inputs: Array<Record<string, unknown>> =
      await this.dataSource.query(
        `SELECT *
         FROM design_inputs
         WHERE project_id = $1`,
        [id],
      );

    const results: Array<Record<string, unknown>> =
      await this.dataSource.query(
        `SELECT *
         FROM design_results
         WHERE project_id = $1`,
        [id],
      );

    return {
      project: projects[0],
      input: inputs[0] ?? null,
      result: results[0] ?? null,
    };
  }
}
