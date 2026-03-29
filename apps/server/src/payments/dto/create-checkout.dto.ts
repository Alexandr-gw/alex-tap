import { IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
    @IsString()
    jobId!: string;

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
