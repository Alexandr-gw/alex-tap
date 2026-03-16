import { IsString, MaxLength } from 'class-validator';

export class UpdateJobInternalNotesDto {
    @IsString()
    @MaxLength(10000)
    internalNotes!: string;
}
