import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthIdentityService } from './auth-identity.service';
import { JwtStrategy } from './jwt.strategy';
import { RoleAuthorizationService } from './role-authorization.service';
import { AUTH_PROFILE_MAPPER, AUTH_TOKEN_VERIFIER } from './auth.constants';
import { JwtTokenVerifierService } from './jwt-token-verifier.service';
import { ClaimBasedProfileMapperService } from './claim-based-profile-mapper.service';

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
  providers: [
    AuthIdentityService,
    JwtStrategy,
    RoleAuthorizationService,
    JwtTokenVerifierService,
    ClaimBasedProfileMapperService,
    {
      provide: AUTH_TOKEN_VERIFIER,
      useExisting: JwtTokenVerifierService,
    },
    {
      provide: AUTH_PROFILE_MAPPER,
      useExisting: ClaimBasedProfileMapperService,
    },
  ],
  exports: [
    AuthIdentityService,
    JwtModule,
    PassportModule,
    RoleAuthorizationService,
    AUTH_TOKEN_VERIFIER,
    AUTH_PROFILE_MAPPER,
  ],
})
export class AuthModule {}
