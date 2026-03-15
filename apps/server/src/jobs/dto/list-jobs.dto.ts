import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus } from '@prisma/client';

export class ListJobsDto {
    @IsOptional()
    @IsString()
    companyId?: string;

    @IsOptional()
    @IsEnum(JobStatus, { message: `status must be one of ${Object.values(JobStatus).join(', ')}` })
    status?: JobStatus;

    @IsOptional()
    @IsISO8601()
    from?: string;

    @IsOptional()
    @IsISO8601()
    to?: string;

    @IsOptional()
    @IsString()
    workerId?: string;

    @IsOptional()
    @IsString()
    clientEmail?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    take?: number;

    @IsOptional()
    @IsString()
    cursor?: string;
}
