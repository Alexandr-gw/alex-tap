import { Body, Controller, Post, UseGuards, Param, Get } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AuthUser, CompanyId } from '@/common/decorators/auth-user.decorator';

@Controller('api/v1/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
    constructor(private readonly payments: PaymentsService) {}

    @Post('checkout')
    async checkout(
        @CompanyId() companyId: string,
        @AuthUser() claims: any,
        @Body() dto: CreateCheckoutDto,
    ) {
        return this.payments.createCheckoutSession(companyId, claims.sub, dto);
    }

    @Get("checkout-session/:sessionId")
    async getCheckoutSessionSummary(
        @CompanyId() companyId: string,
        @AuthUser() claims: any,
        @Param("sessionId") sessionId: string
    ) {
        return this.payments.getCheckoutSessionSummaryPrivate({ companyId, sessionId });
    }
}
