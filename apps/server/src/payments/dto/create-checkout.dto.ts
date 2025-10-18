import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCheckoutDto {
    @IsString() @IsUUID()
    jobId!: string;

    @IsOptional() @IsString()
    successUrl?: string;

    @IsOptional() @IsString()
    cancelUrl?: string;

    @IsOptional() @IsString()
    idempotencyKey?: string;
}
