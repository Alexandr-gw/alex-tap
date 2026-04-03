import { IsISO8601, IsString } from 'class-validator';

export class GetPublicSlotsDto {
  @IsString()
  companyId!: string;

  @IsString()
  serviceId!: string;

  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
