import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { verify } from 'jsonwebtoken';

@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return false;
    }

    try {
      const payload = verify(token, process.env.JWT_SHARED_SECRET!) as any;
      client.data.user = { externalId: payload.sub, name: payload.name };
      return true;
    } catch (error) {
      return false;
    }
  }
}