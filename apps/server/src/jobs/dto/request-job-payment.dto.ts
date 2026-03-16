import { IsOptional, IsString } from 'class-validator';

export class RequestJobPaymentDto {
    @IsOptional()
    @IsString()
    successUrl?: string;

    @IsOptional()
    @IsString()
    cancelUrl?: string;

    @IsOptional()
    @IsString()
    idempotencyKey?: string;
}
