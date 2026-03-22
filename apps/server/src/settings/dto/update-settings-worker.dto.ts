import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSettingsWorkerDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(40)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    colorTag?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsString()
    @IsIn(['MANAGER', 'WORKER'])
    role?: 'MANAGER' | 'WORKER';
}
