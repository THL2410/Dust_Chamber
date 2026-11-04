import { PartialType } from '@nestjs/swagger';
import { CreateCalculationDto } from './create-calculation.dto';

/**
 * Dữ liệu sửa phương án đã lưu: mọi trường đều tùy chọn.
 * - Trường không gửi        -> giữ nguyên giá trị đang lưu.
 * - Trường gửi giá trị mới  -> dùng giá trị mới.
 * - Trường gửi null         -> xóa giá trị (chỉ với trường vốn được phép trống: Cb ở chế độ DESIGN,
 *                              d_min, H, L, B, d0).
 * - particleFractions       -> gửi thì thay TOÀN BỘ phân bố cỡ hạt; không gửi thì giữ phân bố cũ.
 * Sau khi trộn, phương án được tính lại bằng đúng bộ công thức của preview và lưu mới.
 */
export class UpdateCalculationDto extends PartialType(CreateCalculationDto) {}
