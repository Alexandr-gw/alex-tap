import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClientDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(40)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(250)
    address?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    internalNotes?: string;
}
