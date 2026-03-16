import { IsString, MaxLength } from 'class-validator';

export class CreateJobCommentDto {
    @IsString()
    @MaxLength(5000)
    body!: string;
}
