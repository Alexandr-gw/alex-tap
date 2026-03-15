import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsDateString,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateTaskDto {
    @IsString()
    @MaxLength(160)
    subject!: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsDateString()
    scheduledAt!: string;

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

