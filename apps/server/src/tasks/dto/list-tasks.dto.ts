import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

function toOptionalBoolean(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
}

export class ListTasksDto {
    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;

    @IsOptional()
    @IsString()
    workerId?: string;

    @IsOptional()
    @IsString()
    customerId?: string;

    @IsOptional()
    @Transform(({ value }) => toOptionalBoolean(value))
    @IsBoolean()
    completed?: boolean;
}
