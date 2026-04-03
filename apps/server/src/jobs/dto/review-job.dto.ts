import { Transform } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsISO8601,
    IsOptional,
    IsString,
} from 'class-validator';

export class ReviewJobDto {
    @IsOptional()
    @Transform(({ value }) => (value === '' ? null : value))
    @IsString()
    workerId?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    workerIds?: string[];

    @IsOptional()
    @IsISO8601()
    start?: string;

    @IsOptional()
    @IsISO8601()
    end?: string;

    @IsOptional()
    @IsBoolean()
    confirm?: boolean;

    @IsOptional()
    @IsString()
    alertId?: string;
}
