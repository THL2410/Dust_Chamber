import { PartialType } from '@nestjs/swagger';
import { CreateCalculationDto } from './create-calculation.dto';

/**
 * Dữ liệu sửa phép tính: mọi trường đều tùy chọn.
 * - Trường không gửi        -> giữ nguyên giá trị đang lưu.
 * - Trường gửi giá trị mới  -> dùng giá trị mới.
 * - Trường gửi null         -> xóa giá trị (chỉ áp dụng cho trường vốn được phép trống,
 *                              ví dụ chamberLengthM, dMinTargetUm, pipeDiameterM).
 * - particleFractions       -> nếu gửi thì thay TOÀN BỘ phân bố cỡ hạt; không gửi thì giữ phân bố cũ.
 */
export class UpdateCalculationDto extends PartialType(CreateCalculationDto) {}