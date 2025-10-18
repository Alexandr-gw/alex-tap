import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
        // Add proper RBAC here: admin/manager or job's client.
        return this.payments.createCheckoutSession(companyId, claims.sub, dto);
    }
}
