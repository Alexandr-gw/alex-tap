import { IsISO8601, IsOptional, IsString, IsEmail, IsObject, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class PublicClientDto {
    @IsString() name!: string;

    @IsOptional() @IsEmail()
    email?: string;

    @IsOptional() @IsString()
    phone?: string;

    @IsOptional() @IsString()
    address?: string;

    @IsOptional() @IsString()
    notes?: string;
}

export class PublicCheckoutDto {
    @IsString() companyId!: string;
    @IsString() serviceId!: string;
    @IsString() bookingIntentId!: string;

    @IsISO8601()
    start!: string;

    @IsObject()
    @ValidateNested()
    @Type(() => PublicClientDto)
    client!: PublicClientDto;

    @IsOptional() @IsString()
    successUrl?: string;

    @IsOptional() @IsString()
    cancelUrl?: string;
}
