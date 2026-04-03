import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, IsUUID, Validate } from 'class-validator';

class IsoAfterConstraint {
    validate(value: string, args: any) {
        const [relatedPropertyName] = args.constraints;
        const from = new Date((args.object as any)[relatedPropertyName]);
        const to = new Date(value);
        return !isNaN(from.getTime()) && !isNaN(to.getTime()) && to.getTime() > from.getTime();
    }
    defaultMessage(args: any) {
        const [relatedPropertyName] = args.constraints;
        return `"${args.property}" must be after "${relatedPropertyName}"`;
    }
}

export class GetWorkerSlotsDto {
    @IsISO8601()
    @Transform(({ value }) => new Date(value).toISOString())
    from!: string;

    @IsISO8601()
    @Validate(IsoAfterConstraint, ['from'])
    @Transform(({ value }) => new Date(value).toISOString())
    to!: string;

    @IsUUID()
    serviceId!: string;

    @IsString()
    @IsOptional()
    stepMins?: string;
}

export class GetWorkerSlotsDayDto {
    @IsString()
    day!: string; // "YYYY-MM-DD"

    @IsUUID()
    serviceId!: string;

    @IsString()
    @IsOptional()
    stepMins?: string;
}

export class GetPublicSlotsDayDto {
    @IsString()
    companyId!: string;

    @IsString()
    day!: string; // "YYYY-MM-DD"

    @IsOptional()
    @IsUUID()
    serviceId?: string;

    @IsOptional()
    @IsUUID()
    workerId?: string;

    @IsOptional()
    @IsString()
    stepMins?: string;
}