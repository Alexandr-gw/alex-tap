import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsDateString,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(160)
    subject?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsOptional()
    @IsDateString()
    startAt?: string;

    @IsOptional()
    @IsDateString()
    endAt?: string;

    @IsOptional()
    @IsString()
    customerId?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(25)
    @IsString({ each: true })
    assigneeIds?: string[];

    @IsOptional()
    @IsBoolean()
    completed?: boolean;
}
