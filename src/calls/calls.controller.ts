import { Controller, Get, Request, UseGuards, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CallsService } from './calls.service';
import { CallResponseDto } from './dto/call-response.dto';

@ApiTags('Calls')
@ApiBearerAuth('JWT-auth')
@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get the active call for the authenticated user' })
  @ApiResponse({ status: 200, type: CallResponseDto })
  async getActiveCall(@Request() req) {
    return this.callsService.getActiveCall(req.user);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get call history for the authenticated user' })
  @ApiResponse({ status: 200, type: [CallResponseDto] })
  async getHistory(@Request() req, @Query() paginationDto: PaginationDto) {
    return this.callsService.getHistory(req.user, paginationDto);
  }

  @Get('rtc-config')
  @ApiOperation({ summary: 'Get RTC configuration for the reference client' })
  @ApiResponse({ status: 200 })
  async getRtcConfig() {
    return this.callsService.getRtcConfiguration();
  }
}
