import { BadRequestException, NotFoundException } from "@nestjs/common";
import { HistoryService } from "./history.service";

// Repository dùng mock nên không cần nạp module TypeORM của Nest trong unit test.
jest.mock("@nestjs/typeorm", () => ({
  InjectRepository: () => () => undefined,
}));

const resultFields = [
  "h_m", "l_m", "b_m", "mu_pa_s", "rho_gas_kg_m3", "u_m_s", "tau1_s", "tau2_s",
  "l_min_m", "bl_m2", "d_min_calc_um", "d_limit_um", "gv_kg_h", "yv_percent",
  "gs_kg_h", "qs_m3_h", "gb_kg_h", "m1_kg_h", "m2_kg_h", "mt_kg_h",
  "mn_kg_day", "mr_kg_h", "cb_out_mg_m3", "eta_total_percent", "d0_m", "vt_m_s",
  "alpha", "dp_friction_pa", "p_dynamic_pa", "p_local_pa", "dp_pipe_pa", "dp_system_pa", "fan_power_kw",
];
const payload = () => ({
  name: "Test Hoài Bắc", mode: "DESIGN" as const,
  input: {
    flow_rate_m3_h: 5000, temperature_c: 30, dust_concentration_g_m3: 2,
    dust_density_kg_m3: 2500, chamber_height_m: 2, chamber_length_m: 5, chamber_width_m: 3,
  },
  result: { ...Object.fromEntries(resultFields.map(k => [k, 1])), is_retained: true },
  fractions: [{ d_from_um: 1, d_to_um: 10, mass_percent: 100,
    result: { d_rep_um: 5, settling_velocity_m_s: 0.1, efficiency_percent: 80,
      inlet_conc_g_m3: 2, outlet_conc_g_m3: 0.4, regime: "FULL" },
    collector_ids: [1],
  }],
});

describe("HistoryService", () => {
  const query = jest.fn();
  const transaction = jest.fn();
  const findOneBy = jest.fn();
  const service = new HistoryService(
    { findOneBy } as any,
    { query, transaction } as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockResolvedValue([]);
    transaction.mockImplementation((callback) => callback({
      query: jest.fn((sql: string) => {
        if (sql.includes("INSERT INTO design_projects")) return Promise.resolve([{ id: 7 }]);
        if (sql.includes("INSERT INTO dust_fractions")) return Promise.resolve([{ id: 22 }]);
        return Promise.resolve([]);
      }),
    }));
  });

  it("trả danh sách có phân trang và filter", async () => {
    query.mockResolvedValueOnce([{ total: 2 }]).mockResolvedValueOnce([{ id: 7 }]);
    const result = await service.findAll({ page: 1, limit: 10, search: "Test",
      sortBy: "createdAt", order: "DESC", mode: "DESIGN" });
    expect(result.meta.total).toBe(2);
    expect(result.data).toHaveLength(1);
    expect(query.mock.calls[1][0]).toContain("ORDER BY created_at DESC");
  });

  it("chặn ngày lọc ngược", async () => {
    await expect(service.findAll({ page: 1, limit: 10, sortBy: "createdAt",
      order: "DESC", fromDate: "2026-10-31", toDate: "2026-10-01" }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("lưu phương án, kết quả và phân cấp bụi trong transaction", async () => {
    await expect(service.create(payload() as any)).resolves.toEqual({
      message: "Lưu lịch sử thành công", id: 7,
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("từ chối thiếu trường kết quả", async () => {
    const data = payload();
    delete (data.result as any).h_m;
    await expect(service.create(data as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("trả 404 nếu không có dự án", async () => {
    findOneBy.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
