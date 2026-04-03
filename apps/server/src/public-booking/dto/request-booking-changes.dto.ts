import { IsOptional, IsString, MaxLength } from "class-validator";

export class RequestBookingChangesDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;
}
