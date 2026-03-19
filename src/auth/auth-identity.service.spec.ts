import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthIdentityService } from './auth-identity.service';
import { AuthProfileMapper, AuthTokenVerifier } from './auth-provider.interfaces';
import { UsersService } from '../users/users.service';

describe('AuthIdentityService', () => {
  let service: AuthIdentityService;
  let configService: jest.Mocked<ConfigService>;
  let usersService: jest.Mocked<UsersService>;
  let tokenVerifier: jest.Mocked<AuthTokenVerifier>;
  let profileMapper: jest.Mocked<AuthProfileMapper>;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'auth.autoProvisionUsers') {
          return true;
        }

        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    usersService = {
      upsertExternalUser: jest.fn(),
      findByExternalId: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    tokenVerifier = {
      verify: jest.fn(),
    };

    profileMapper = {
      normalize: jest.fn(),
    };

    service = new AuthIdentityService(
      configService,
      usersService,
      tokenVerifier,
      profileMapper,
    );
  });

  it('uses injected token verification and profile mapping adapters', async () => {
    tokenVerifier.verify.mockReturnValue({ sub: 'appA:alice', name: 'Alice' });
    profileMapper.normalize.mockReturnValue({
      externalId: 'appA:alice',
      name: 'Alice',
      rawPayload: { sub: 'appA:alice', name: 'Alice' },
    });
    usersService.upsertExternalUser.mockResolvedValue({ id: 1 } as any);

    const payload = service.verifyToken('token');
    const user = await service.resolveUserFromPayload(payload);

    expect(tokenVerifier.verify).toHaveBeenCalledWith('token');
    expect(profileMapper.normalize).toHaveBeenCalledWith(payload);
    expect(usersService.upsertExternalUser).toHaveBeenCalledWith(
      'appA:alice',
      'Alice',
      undefined,
      undefined,
    );
    expect(user).toEqual({ id: 1 });
  });

  it('requires pre-provisioned users when auto provisioning is disabled', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'auth.autoProvisionUsers') {
        return false as any;
      }

      return undefined as any;
    });
    profileMapper.normalize.mockReturnValue({
      externalId: 'appA:bob',
      name: 'Bob',
      rawPayload: { sub: 'appA:bob', name: 'Bob' },
    });
    usersService.findByExternalId.mockResolvedValue(null);

    await expect(
      service.resolveUserFromPayload({ sub: 'appA:bob', name: 'Bob' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.upsertExternalUser).not.toHaveBeenCalled();
  });
});
