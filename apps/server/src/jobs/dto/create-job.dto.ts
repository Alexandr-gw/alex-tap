import { Transform, Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsEmail,
    IsISO8601,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';

class ClientDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

class JobLineItemDto {
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

export class CreateJobDto {
    @IsString()
    companyId!: string;

    @IsOptional()
    @IsString()
    serviceId?: string;

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
    @IsString()
    clientId?: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    internalNotes?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsISO8601()
    start!: string;

    @IsOptional()
    @IsISO8601()
    end?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => ClientDto)
    client?: ClientDto;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => JobLineItemDto)
    lineItems?: JobLineItemDto[];
}
