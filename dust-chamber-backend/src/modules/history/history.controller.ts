import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Query,
} from "@nestjs/common";
import {
  ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse,
  ApiOperation, ApiTags,
} from "@nestjs/swagger";
import { CurrentUser, JwtUser } from "commons/decorators/current-user.decorator";
import { HistoryQueryDto } from "./dto/history-query.dto";
import { HistoryService } from "./history.service";
import {Roles} from "commons/decorators/roles.decorator";

@ApiTags("History")
@ApiBearerAuth()
@Controller("history")
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @Roles("user","admin")
  @ApiOperation({
    summary: "Xem tất cả lịch sử (phân trang, tìm kiếm, lọc). Admin: tất cả; user: của chính mình",
  })
  findAll(@Query() query: HistoryQueryDto, @CurrentUser() user: JwtUser) {
    return this.historyService.findAll(query, user);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Xem lịch sử theo người dùng (admin: bất kỳ; user: chỉ của mình)" })
  @ApiForbiddenResponse({ description: "Không có quyền xem lịch sử của người khác" })
  findByUser(
      @Param("userId", ParseIntPipe) userId: number,
      @Query() query: HistoryQueryDto,
      @CurrentUser() user: JwtUser,
  ) {
    return this.historyService.findByUser(userId, query, user);
  }


  @Get(":id")
  @ApiOperation({ summary: "Xem một lịch sử theo id" })
  @ApiOkResponse({ description: "Một dòng tóm tắt của phương án" })
  @ApiNotFoundResponse({ description: "Không tìm thấy lịch sử" })
  @ApiForbiddenResponse({ description: "Không có quyền xem lịch sử của người khác" })
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.historyService.findOne(id, user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa lịch sử (xóa kèm thông số, kết quả, dải bụi)" })
  @ApiNotFoundResponse({ description: "Không tìm thấy lịch sử" })
  @ApiForbiddenResponse({ description: "Không có quyền xóa lịch sử của người khác" })
  remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.historyService.remove(id, user);
  }
}