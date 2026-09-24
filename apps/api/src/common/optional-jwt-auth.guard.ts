import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Optional JWT guard for endpoints that support both logged-in users and guests.
 * - Valid token → `req.user` is populated as usual.
 * - Missing or invalid token → `req.user = null` and the request continues.
 *
 * Route handlers must check for `null` before using `user.userId`.
 * Use this ONLY on endpoints that intentionally allow anonymous access
 * (e.g. guest checkout). For everything else, use `JwtAuthGuard` (strict).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null
  }
}
