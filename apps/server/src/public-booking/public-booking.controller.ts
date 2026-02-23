import { Controller, Get, Post, Query, Param, BadRequestException, Body } from "@nestjs/common";
import { PublicBookingService } from "./public-booking.service";
import { PublicCheckoutDto } from "./dto/public-checkout.dto";

@Controller("public")
export class PublicBookingController {
    constructor(private readonly svc: PublicBookingService) {}

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
        @Query("companyId") companyId?: string,
        @Query("serviceId") serviceId?: string,
        @Query("from") from?: string,
        @Query("to") to?: string,
    ) {
        if (!companyId || !serviceId || !from || !to) {
            throw new BadRequestException("Missing query params: companyId, serviceId, from, to");
        }
        return this.svc.getPublicSlots({ companyId, serviceId, from, to });
    }

    // POST /public/bookings/checkout
    @Post("bookings/checkout")
    async checkout(@Body() dto: PublicCheckoutDto) {
        return this.svc.createPublicCheckout(dto);
    }
}