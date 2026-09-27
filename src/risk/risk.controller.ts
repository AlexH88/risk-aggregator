import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RiskService } from './risk.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { QueryHistoryDto } from './dto/query-history.dto';

@ApiTags('risk')
@Controller('risk')
export class RiskController {
  constructor(private readonly risk: RiskService) {}

  @Post('calculate')
  calculate(@Body() dto: CreateRiskDto) {
    return this.risk.calculate(dto);
  }

  @Get('history')
  history(@Query() q: QueryHistoryDto) {
    return this.risk.history(q);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.risk.getById(id);
  }
}