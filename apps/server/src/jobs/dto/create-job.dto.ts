import { IsISO8601, IsOptional, IsString, IsEmail, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ClientDto {
    @IsString() name: string;
    @IsOptional() @IsEmail() email?: string;
    @IsOptional() @IsString() phone?: string;
}

export class CreateJobDto {
    @IsString() companyId: string;
    @IsString() serviceId: string;
    @IsString() workerId: string;
    @IsISO8601() start: string;
    @IsOptional() @IsString() notes?: string;

    @IsObject()
    @ValidateNested()
    @Type(() => ClientDto)
    client: ClientDto;
}
