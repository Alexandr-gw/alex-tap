import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class PaymentsController {
    private readonly payments;
    constructor(payments: PaymentsService);
    checkout(companyId: string, claims: any, dto: CreateCheckoutDto): Promise<{
        sessionId: string;
        url: string;
    }>;
}
