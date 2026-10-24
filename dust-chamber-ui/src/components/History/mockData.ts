export interface HistoryItem {
    id: number | string;
    projectName: string;
    createdAt: string;
    efficiency: number;
}

export const mockHistoryData: HistoryItem[] = [
    { id: 1, projectName: 'Cấu hình buồng lắng xi măng Hà Tiên', createdAt: '2026-10-20T08:30:00Z', efficiency: 95.5 },
    { id: 2, projectName: 'Dự án lọc bụi xưởng mộc ABC', createdAt: '2026-10-21T09:15:00Z', efficiency: 88.2 },
    { id: 3, projectName: 'Thiết kế buồng lắng nhà máy thép', createdAt: '2026-10-21T14:20:00Z', efficiency: 92.0 },
    { id: 4, projectName: 'Test cấu hình hạt bụi d=50µm', createdAt: '2026-10-22T10:05:00Z', efficiency: 85.0 },
    { id: 5, projectName: 'Lọc bụi tĩnh điện khu CN Tân Bình', createdAt: '2026-10-22T16:45:00Z', efficiency: 98.1 },
    { id: 6, projectName: 'Mô phỏng bụi rơm rạ', createdAt: '2026-10-23T08:10:00Z', efficiency: 75.4 },
    { id: 7, projectName: 'Tính toán lại xưởng mộc ABC (Lần 2)', createdAt: '2026-10-23T11:30:00Z', efficiency: 91.5 },
    { id: 8, projectName: 'Cấu hình tối ưu vận tốc dòng khí', createdAt: '2026-10-24T09:20:00Z', efficiency: 96.8 },
    { id: 9, projectName: 'Buồng lắng đa tầng - Bản nháp 1', createdAt: '2026-10-24T13:15:00Z', efficiency: 89.9 },
    { id: 10, projectName: 'Test nhiệt độ cao 150 độ C', createdAt: '2026-10-24T15:00:00Z', efficiency: 82.3 },
    { id: 11, projectName: 'Dự án lò đốt rác thải sinh hoạt', createdAt: '2026-10-25T07:45:00Z', efficiency: 97.2 },
    { id: 12, projectName: 'Cấu hình hạt d=100µm', createdAt: '2026-10-25T10:10:00Z', efficiency: 99.1 },
    { id: 13, projectName: 'Lọc bụi nhà máy xay xát lúa gạo', createdAt: '2026-10-25T14:30:00Z', efficiency: 94.6 },
    { id: 14, projectName: 'Điều chỉnh kích thước L=5m, B=2m', createdAt: '2026-10-26T08:20:00Z', efficiency: 93.4 },
    { id: 15, projectName: 'Nghiệm thu mô hình chuẩn', createdAt: '2026-10-26T16:00:00Z', efficiency: 98.8 }
];

export interface HistoryDetail {
    id: number | string;
    projectName: string;
    createdAt: string;
    efficiency: number;
    inputs: {
        gasFlow: number;      // Lưu lượng khí (m3/h)
        temperature: number;  // Nhiệt độ (oC)
        dustDensity: number;  // Khối lượng riêng (kg/m3)
        particleSize: number; // Đường kính hạt bụi (µm)
    };
    dimensions: {
        length: number; // Chiều dài L (m)
        width: number;  // Chiều rộng B (m)
        height: number; // Chiều cao H (m)
    };
    results: {
        gasVelocity: number;      // Vận tốc dòng khí (m/s)
        settlingVelocity: number; // Vận tốc lắng (m/s)
        residenceTime: number;    // Thời gian lưu (s)
    };
}

export const getMockHistoryDetail = (id: number | string): HistoryDetail => {
    const baseInfo = mockHistoryData.find(item => item.id === id);

    return {
        id: id,
        projectName: baseInfo?.projectName || `Dự án mô phỏng #${id}`,
        createdAt: baseInfo?.createdAt || new Date().toISOString(),
        efficiency: baseInfo?.efficiency || 95.5,
        inputs: {
            gasFlow: 15000 + Number(id) * 100, // Sinh số ngẫu nhiên dựa vào id
            temperature: 120 + Number(id),
            dustDensity: 2500,
            particleSize: 50 + Number(id) * 2,
        },
        dimensions: {
            length: 8.5 + Number(id) * 0.1,
            width: 3.2,
            height: 2.5,
        },
        results: {
            gasVelocity: 0.54,
            settlingVelocity: 0.15,
            residenceTime: 15.7 + Number(id) * 0.5,
        }
    };
};