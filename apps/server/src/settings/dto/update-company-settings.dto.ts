import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanySettingsDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(80)
    timezone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(80)
    bookingSlug?: string;
}
