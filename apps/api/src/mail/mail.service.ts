import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

export interface OrderItemEmail {
  productName: string
  variantName?: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface OrderEmailDetails {
  orderNumber: string
  customerName: string
  customerEmail: string
  total: number
  subtotal: number
  deliveryFee: number
  discount: number
  orderType: string
  deliveryAddress?: string
  items: OrderItemEmail[]
  placedAt?: Date
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor(private configService: ConfigService) {
    this.initTransporter()
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST')
    const port = this.configService.get<number>('SMTP_PORT', 587)
    const user = this.configService.get<string>('SMTP_USER')
    const pass = this.configService.get<string>('SMTP_PASS')
    const secure = this.configService.get<boolean>('SMTP_SECURE', port === 465)

    if (!host || !user) {
      this.logger.warn('SMTP settings incomplete in environment variables (SMTP_HOST, SMTP_USER). Email sending will be skipped.')
      return
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: String(secure) === 'true' || Number(port) === 465,
      auth: {
        user,
        pass,
      },
    })
  }

  async sendOrderConfirmationEmail(order: OrderEmailDetails): Promise<boolean> {
    if (!order.customerEmail) {
      this.logger.warn(`No customer email provided for order #${order.orderNumber}. Skipping email sending.`)
      return false
    }

    if (!this.transporter) {
      this.initTransporter()
      if (!this.transporter) {
        this.logger.warn(`SMTP Transporter not configured. Skipping confirmation email for order #${order.orderNumber}.`)
        return false
      }
    }

    const fromAddress = this.configService.get<string>('SMTP_FROM', 'Kebab Biteri <no-reply@kebab-biteri.com>')
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">
            <strong>${item.productName}</strong> ${item.variantName ? `(${item.variantName})` : ''}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: right;">€${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: right;">€${item.lineTotal.toFixed(2)}</td>
        </tr>
      `,
      )
      .join('')

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6; border: 1px solid #e0e0e0; borderRadius: 8px; overflow: hidden;">
        <div style="background-color: #e53e3e; color: #ffffff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🌯 Kebab Biteri</h1>
          <p style="margin: 5px 0 0 0; font-size: 16px;">¡Pedido Confirmado!</p>
        </div>

        <div style="padding: 20px;">
          <p>Hola <strong>${order.customerName}</strong>,</p>
          <p>¡Gracias por tu pedido! Tu orden <strong>#${order.orderNumber}</strong> ha sido confirmada y está siendo procesada.</p>

          <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2d3748;">Detalles de la Orden</h3>
            <p style="margin: 4px 0;"><strong>Tipo:</strong> ${order.orderType === 'DELIVERY' ? '🛵 Entrega a domicilio' : '📦 Para llevar'}</p>
            ${order.deliveryAddress ? `<p style="margin: 4px 0;"><strong>Dirección:</strong> ${order.deliveryAddress}</p>` : ''}
          </div>

          <h3 style="color: #2d3748;">Resumen de Productos</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 10px;">Producto</th>
                <th style="padding: 10px; text-align: center;">Cant.</th>
                <th style="padding: 10px; text-align: right;">Precio</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; margin-top: 20px; font-size: 15px;">
            <p style="margin: 4px 0;">Subtotal: €${order.subtotal.toFixed(2)}</p>
            ${order.deliveryFee > 0 ? `<p style="margin: 4px 0;">Envío: €${order.deliveryFee.toFixed(2)}</p>` : ''}
            ${order.discount > 0 ? `<p style="margin: 4px 0; color: #e53e3e;">Descuento: -€${order.discount.toFixed(2)}</p>` : ''}
            <h2 style="margin: 10px 0 0 0; color: #2d3748;">Total: €${order.total.toFixed(2)}</h2>
          </div>
        </div>

        <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0;">¡Gracias por elegir Kebab Biteri!</p>
        </div>
      </div>
    `

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: order.customerEmail,
        subject: `Confirmación de Pedido #${order.orderNumber} - Kebab Biteri`,
        html: htmlContent,
      })
      this.logger.log(`Order confirmation email sent for #${order.orderNumber} to ${order.customerEmail} (MessageId: ${info.messageId})`)
      return true
    } catch (error: any) {
      this.logger.error(`Failed to send order confirmation email for #${order.orderNumber}: ${error.message}`, error.stack)
      return false
    }
  }

  async sendVerificationEmail(customerName: string, email: string, code: string): Promise<boolean> {
    if (!email) return false
    if (!this.transporter) {
      this.initTransporter()
      if (!this.transporter) return false
    }

    const fromAddress = this.configService.get<string>('SMTP_FROM', 'Kebab Biteri <no-reply@kebab-biteri.com>')

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; line-height: 1.6; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #F4BE2C; color: #18181b; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800;">🌯 Kebab Biteri</h1>
          <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: 700;">Código de Verificación de Cuenta / Account Verification Code</p>
        </div>

        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; margin-top: 0;">Hola <strong>${customerName || 'Cliente'}</strong>,</p>
          <p style="font-size: 15px; color: #3f3f46;">
            Gracias por crear tu cuenta en <strong>Kebab Biteri</strong>. Utiliza el siguiente código de 6 dígitos para verificar tu cuenta y completar tu registro:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #f4f4f5; border: 2px dashed #F4BE2C; border-radius: 12px; padding: 18px 36px; letter-spacing: 12px; font-size: 36px; font-weight: 900; color: #18181b; font-family: monospace;">
              ${code}
            </div>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
              ⏰ Este código es válido para completar tu registro en Kebab Biteri.
            </p>
          </div>

          <p style="font-size: 13px; color: #71717a; margin-top: 20px;">
            Si no creaste una cuenta en Kebab Biteri, puedes ignorar este mensaje de forma segura.
          </p>
        </div>

        <div style="background-color: #f4f4f5; padding: 15px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7;">
          <p style="margin: 0;">© Kebab Biteri — Todos los derechos reservados.</p>
        </div>
      </div>
    `

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: `${code} es tu código de verificación de cuenta - Kebab Biteri`,
        html: htmlContent,
      })
      this.logger.log(`Verification email with code sent to ${email} (MessageId: ${info.messageId})`)
      return true
    } catch (error: any) {
      this.logger.error(`Failed to send verification code email to ${email}: ${error.message}`, error.stack)
      return false
    }
  }

  async sendPasswordResetEmail(customerName: string, email: string, token: string): Promise<boolean> {
    if (!email) return false
    if (!this.transporter) {
      this.initTransporter()
      if (!this.transporter) return false
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000').replace(/\/$/, '')
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`
    const fromAddress = this.configService.get<string>('SMTP_FROM', 'Kebab Biteri <no-reply@kebab-biteri.com>')

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #e50909; color: #ffffff; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800;">🌯 Kebab Biteri</h1>
          <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600;">Restablecer contraseña</p>
        </div>

        <div style="padding: 25px; background-color: #ffffff;">
          <p style="font-size: 16px;">Hola <strong>${customerName}</strong>,</p>
          <p style="font-size: 15px; color: #4a5568;">
            Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>Kebab Biteri</strong>. Haz clic en el botón a continuación para elegir una nueva contraseña:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #e50909; color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              Restablecer mi contraseña
            </a>
          </div>

          <p style="font-size: 13px; color: #718096; margin-top: 20px;">
            Este enlace expira en <strong>1 hora</strong> y solo puede ser utilizado una vez. Si no solicitaste este cambio, ignora este mensaje y tu contraseña permanecerá sin cambios.
          </p>
          <p style="font-size: 12px; color: #a0aec0; word-break: break-all;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
            <a href="${resetUrl}" style="color: #e50909;">${resetUrl}</a>
          </p>
        </div>

        <div style="background-color: #f7fafc; padding: 15px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0;">© Kebab Biteri — Todos los derechos reservados.</p>
        </div>
      </div>
    `

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: `Restablece tu contraseña - Kebab Biteri`,
        html: htmlContent,
      })
      this.logger.log(`Password reset email sent to ${email} (MessageId: ${info.messageId})`)
      return true
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`, error.stack)
      return false
    }
  }

  async sendLoginOtpEmail(customerName: string, email: string, otp: string, expiresMinutes: number = 5): Promise<boolean> {
    if (!email) return false
    if (!this.transporter) {
      this.initTransporter()
      if (!this.transporter) return false
    }

    const fromAddress = this.configService.get<string>('SMTP_FROM', 'Kebab Biteri <no-reply@kebab-biteri.com>')

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; line-height: 1.6; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #F4BE2C; color: #18181b; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; tracking: -0.5px;">🌯 Kebab Biteri</h1>
          <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: 700; opacity: 0.9;">Código de Verificación de Inicio de Sesión / Login Verification Code</p>
        </div>

        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; margin-top: 0;">Hola <strong>${customerName || 'Cliente'}</strong>,</p>
          <p style="font-size: 15px; color: #3f3f46;">
            Se ha solicitado un inicio de sesión en tu cuenta de <strong>Kebab Biteri</strong>. Utiliza el siguiente código de verificación para completar el acceso:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #f4f4f5; border: 2px dashed #F4BE2C; border-radius: 12px; padding: 18px 36px; letter-spacing: 12px; font-size: 36px; font-weight: 900; color: #18181b; font-family: monospace;">
              ${otp}
            </div>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
              ⏰ Este código expira en <strong>${expiresMinutes} minutos</strong> y es de un solo uso.
            </p>
          </div>

          <p style="font-size: 13px; color: #71717a; margin-top: 20px;">
            🔒 <strong>Aviso de seguridad:</strong> Si no intentaste iniciar sesión en Kebab Biteri, puedes ignorar este mensaje. Nunca compartas este código con nadie.
          </p>
        </div>

        <div style="background-color: #f4f4f5; padding: 15px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7;">
          <p style="margin: 0;">© Kebab Biteri — Todos los derechos reservados.</p>
        </div>
      </div>
    `

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: email,
        subject: `${otp} es tu código de verificación - Kebab Biteri`,
        html: htmlContent,
      })
      this.logger.log(`Login OTP email sent to ${email} (MessageId: ${info.messageId})`)
      return true
    } catch (error: any) {
      this.logger.error(`Failed to send login OTP email to ${email}: ${error.message}`, error.stack)
      return false
    }
  }
}

