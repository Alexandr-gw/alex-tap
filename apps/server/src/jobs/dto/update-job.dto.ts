import { Transform, Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { JobStatus } from '@prisma/client';

class UpdateJobLineItemDto {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    name!: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity!: number;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    unitPriceCents!: number;
}

export class UpdateJobDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

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
    @IsEnum(JobStatus, { message: `status must be one of ${Object.values(JobStatus).join(', ')}` })
    status?: JobStatus;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateJobLineItemDto)
    lineItems?: UpdateJobLineItemDto[];
}
