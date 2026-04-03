import {Body, Controller, Get, Param, Post, Query, ValidationPipe} from "@nestjs/common";
import {Throttle} from "@nestjs/throttler";
import {PublicBookingService} from "./public-booking.service";
import {PublicCheckoutDto} from "./dto/public-checkout.dto";
import {PaymentsService} from "@/payments/payments.service";
import {RequestBookingChangesDto} from "./dto/request-booking-changes.dto";
import {GetPublicSlotsDto} from "./dto/get-public-slots.dto";

@Controller("api/v1/public")
@Throttle({default: {ttl: 60_000, limit: 30}})
export class PublicBookingController {
    constructor(private readonly svc: PublicBookingService,
                private readonly payments: PaymentsService,) {
    }

    // GET /public/companies/:companySlug/services/:serviceSlug
    @Get("companies/:companySlug/services/:serviceSlug")
    async getService(
        @Param("companySlug") companySlug: string,
        @Param("serviceSlug") serviceSlug: string,
    ) {
        return this.svc.getPublicService(companySlug, serviceSlug);
    }

    // GET /public/slots?companyId&serviceId&from&to
    @Get("slots")
    async getSlots(
        @Query(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
        query: GetPublicSlotsDto,
    ) {
        return this.svc.getPublicSlots(query);
    }

    // GET /public/companies/:companySlug/services
    @Get("companies/:companySlug/services")
    async listServices(@Param("companySlug") companySlug: string) {
        return this.svc.listPublicServices(companySlug);
    }

    // POST /public/bookings/checkout
    @Post("bookings/checkout")
    @Throttle({default: {ttl: 600_000, limit: 5}})
    async checkout(
        @Body(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
        dto: PublicCheckoutDto,
    ) {
        return this.svc.createPublicCheckout(dto);
    }

    @Get("bookings/access/:token")
    async getBookingByAccessToken(@Param("token") token: string) {
        return this.svc.getBookingByAccessToken(token);
    }

    @Post("bookings/access/:token/request-changes")
    @Throttle({default: {ttl: 1_800_000, limit: 3}})
    async requestBookingChanges(
        @Param("token") token: string,
        @Body(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
        dto: RequestBookingChangesDto,
    ) {
        return this.svc.requestBookingChanges(token, dto);
    }

    @Get("payments/checkout-session/:sessionId")
    async getPublicCheckoutSessionSummary(@Param("sessionId") sessionId: string) {
        return this.payments.getCheckoutSessionSummaryPublic({ sessionId });
    }
}
