import { IsEnum, IsISO8601, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus } from '@prisma/client';

export class ListJobsDto {
    @IsOptional()
    @IsOptional() @IsString()
    companyId?: string;
    @IsEnum(JobStatus, { message: `status must be one of ${Object.values(JobStatus).join(', ')}` })
    status?: JobStatus;

    @IsOptional() @IsISO8601() from?: string;
    @IsOptional() @IsISO8601() to?: string;
    @IsOptional() @IsString()  workerId?: string;
    @IsOptional() @IsString()  clientEmail?: string;

    @IsOptional()
    @Type(() => Number)        // <— turn "10" into 10
    @IsInt()
    @Min(1)
    take?: number;

    @IsOptional() @IsString() cursor?: string;
}
