import { IsISO8601, IsOptional, IsString, IsBoolean } from 'class-validator';

export class ReviewJobDto {
    @IsOptional()
    @IsString()
    workerId?: string;

    @IsOptional()
    @IsISO8601()
    start?: string;

    @IsOptional()
    @IsBoolean()
    confirm?: boolean;

    @IsOptional()
    @IsString()
    alertId?: string;
}
