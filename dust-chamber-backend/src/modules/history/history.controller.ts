
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { HistoryService } from "./history.service";
import { HistoryQueryDto } from "./dto/history-query.dto";
import { CreateHistoryDto } from "./dto/create-history.dto";

@ApiTags("History")
@ApiBearerAuth()
@Controller("history")
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
  ) {}

  // GET /api/history
  @Get()
  @ApiOperation({
    summary: "Lấy danh sách lịch sử tính toán",
  })
  findAll(@Query() query: HistoryQueryDto) {
    return this.historyService.findAll(query);
  }

  // POST /api/history
  @Post()
  @ApiOperation({
    summary: "Lưu kết quả tính toán vào lịch sử",
  })
  create(@Body() dto: CreateHistoryDto) {
    return this.historyService.create(dto);
  }

  // GET /api/history/:id
  @Get(":id")
  @ApiOperation({
    summary: "Xem chi tiết lịch sử tính toán",
  })
  findOne(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.historyService.findOne(id);
  }
}
