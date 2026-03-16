import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClientDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(60)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(60)
    lastName?: string;

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
}
