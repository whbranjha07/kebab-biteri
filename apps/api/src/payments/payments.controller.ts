import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from '../dto/create-payment.dto'
import { JwtAuthGuard } from '../common/jwt-auth.guard'
import type { Request } from 'express'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(dto)
  }

  // Public: returns only order status/amount so both logged-in users and
  // guests can poll after being redirected back from Sabadell.
  @Get(':id/verify')
  async verify(@Param('id') id: string) {
    return this.paymentsService.verifyPayment(id)
  }

  // Banco Sabadell (Redsys TPV Virtual) — build signed redirect form.
  // Public so guests can pay after guest checkout; the order id is already
  // opaque and the merchant secret never leaves the server.
  @Post('sabadell/create')
  async sabadellCreate(@Body() body: { orderId: string; method: string }) {
    return this.paymentsService.createSabadellPayment(body.orderId, body.method)
  }

  // Banco Sabadell server-to-server notification (unauthenticated;
  // signature is verified inside the handler).
  @Post('sabadell/notification')
  async sabadellNotification(@Body() body: any) {
    return this.paymentsService.handleSabadellNotification(body)
  }

  // Legacy Stripe-style webhook — kept for compatibility.
  @Post('webhook')
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.body, signature ?? '')
  }
}
