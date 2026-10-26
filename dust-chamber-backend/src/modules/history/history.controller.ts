import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateHistoryDto } from "./dto/create-history.dto";
import { HistoryQueryDto } from "./dto/history-query.dto";
import { HistoryService } from "./history.service";

@ApiTags("History")
@ApiBearerAuth()
@Controller("history")
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách lịch sử, phân trang, tìm kiếm và lọc" })
  findAll(@Query() query: HistoryQueryDto) {
    return this.historyService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: "Lưu thông số và kết quả tính toán" })
  create(@Body() dto: CreateHistoryDto) {
    return this.historyService.create(dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Xem chi tiết một phương án" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.historyService.findOne(id);
  }
}
