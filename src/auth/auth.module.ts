import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthIdentityService } from './auth-identity.service';
import { JwtStrategy } from './jwt.strategy';
import { RoleAuthorizationService } from './role-authorization.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: 'jwt-chat' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
      }),
    }),
  ],
  providers: [AuthIdentityService, JwtStrategy, RoleAuthorizationService],
  exports: [
    AuthIdentityService,
    JwtModule,
    PassportModule,
    RoleAuthorizationService,
  ],
})
export class AuthModule {}
