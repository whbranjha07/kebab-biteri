import * as crypto from 'crypto'

// Redsys / Banco Sabadell TPV Virtual signature helpers.
// Sabadell's card gateway is operated on the Redsys platform, so the
// merchant integration follows the standard Redsys HMAC-SHA256 v1 protocol.

export interface RedsysMerchantParams {
  DS_MERCHANT_MERCHANTCODE: string
  DS_MERCHANT_TERMINAL: string
  DS_MERCHANT_TRANSACTIONTYPE: string
  DS_MERCHANT_AMOUNT: string
  DS_MERCHANT_CURRENCY: string
  DS_MERCHANT_ORDER: string
  DS_MERCHANT_MERCHANTURL: string
  DS_MERCHANT_URLOK: string
  DS_MERCHANT_URLKO: string
  DS_MERCHANT_PRODUCTDESCRIPTION?: string
  DS_MERCHANT_TITULAR?: string
  DS_MERCHANT_MERCHANTNAME?: string
  DS_MERCHANT_CONSUMERLANGUAGE?: string
  DS_MERCHANT_PAYMETHODS?: string
  [key: string]: string | undefined
}

const GATEWAY_URLS = {
  test: 'https://sis-t.redsys.es:25443/sis/realizarPago',
  prod: 'https://sis.redsys.es/sis/realizarPago',
}

export function getGatewayUrl(env: string | undefined): string {
  return env === 'prod' ? GATEWAY_URLS.prod : GATEWAY_URLS.test
}

// Generate a 12-char numeric-prefixed order id (Redsys requires 4-12 chars,
// first 4 must be digits). Kept independent from the MongoDB ObjectId so we
// can look the order up from the notification via `paymentProviderRef`.
export function generateRedsysOrderId(): string {
  const ts = Date.now().toString().slice(-8) // 8 digits
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${ts}${rand}` // 12 digits
}

// Redsys signature: 3DES-CBC encrypt the base64 merchant key using the order id
// as plaintext (zero-padded), then HMAC-SHA256 the base64 merchant parameters
// with that derived key. Result is base64.
function deriveKey(merchantKeyBase64: string, orderId: string): Buffer {
  const key = Buffer.from(merchantKeyBase64, 'base64')
  const iv = Buffer.alloc(8, 0)
  const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv)
  cipher.setAutoPadding(false)
  // Zero-pad orderId to multiple of 8 bytes for DES block size
  const paddedLen = Math.ceil(orderId.length / 8) * 8
  const plaintext = Buffer.alloc(paddedLen, 0)
  Buffer.from(orderId, 'utf8').copy(plaintext)
  return Buffer.concat([cipher.update(plaintext), cipher.final()])
}

export function signMerchantParams(
  params: RedsysMerchantParams,
  merchantKeyBase64: string,
): { merchantParameters: string; signature: string } {
  const json = JSON.stringify(params)
  const merchantParameters = Buffer.from(json, 'utf8').toString('base64')
  const derivedKey = deriveKey(merchantKeyBase64, params.DS_MERCHANT_ORDER)
  const signature = crypto
    .createHmac('sha256', derivedKey)
    .update(merchantParameters)
    .digest('base64')
  return { merchantParameters, signature }
}

export interface NotificationVerified {
  valid: boolean
  params: Record<string, string>
  orderId: string
  responseCode: string
  authorized: boolean
}

// Redsys notification: POST with Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature.
// Verify by recomputing the signature (using URL-safe base64 variant per Redsys spec).
export function verifyNotification(
  merchantParameters: string,
  receivedSignature: string,
  merchantKeyBase64: string,
): NotificationVerified {
  const decoded = Buffer.from(merchantParameters, 'base64').toString('utf8')
  const params = JSON.parse(decoded) as Record<string, string>
  const orderId = params.Ds_Order || params.DS_ORDER || ''
  const responseCode = params.Ds_Response || params.DS_RESPONSE || ''

  const derivedKey = deriveKey(merchantKeyBase64, orderId)
  const computed = crypto
    .createHmac('sha256', derivedKey)
    .update(merchantParameters)
    .digest('base64')

  // Redsys sends signature URL-safe base64 (- and _ instead of + and /).
  const normalize = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/')
  const valid = normalize(computed) === normalize(receivedSignature)

  // Response codes 0000-0099 mean authorized. Anything else is failure.
  const numeric = parseInt(responseCode, 10)
  const authorized = !isNaN(numeric) && numeric >= 0 && numeric <= 99

  return { valid, params, orderId, responseCode, authorized }
}

// Map internal payment method to Redsys Ds_Merchant_Paymethods filter.
// Omit the field entirely to let the customer choose on the gateway page.
export function paymethodFilter(method: string): string | undefined {
  switch (method) {
    case 'BIZUM':
      return 'z'
    case 'CARD':
    case 'APPLE_PAY':
    case 'GOOGLE_PAY':
      return 'C' // any card method (includes wallet cards)
    default:
      return undefined
  }
}
