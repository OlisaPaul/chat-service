import { ConfigService } from '@nestjs/config';
import { RoleAuthorizationService } from './role-authorization.service';
import { UserRole } from '../entities/user.entity';

describe('RoleAuthorizationService', () => {
  let service: RoleAuthorizationService;

  beforeEach(() => {
    service = new RoleAuthorizationService({
      get: jest.fn((key: string) =>
        key === 'auth.roleAuthorizationEnabled' ? true : undefined,
      ),
    } as unknown as ConfigService);
  });

  describe('canInitiateConversation', () => {
    describe('Bishop role', () => {
      it('should allow Bishop to initiate with Bishop', () => {
        expect(
          service.canInitiateConversation(UserRole.BISHOP, UserRole.BISHOP),
        ).toBe(true);
      });

      it('should allow Bishop to initiate with Deanery', () => {
        expect(
          service.canInitiateConversation(UserRole.BISHOP, UserRole.DEANERY),
        ).toBe(true);
      });

      it('should allow Bishop to initiate with Parish', () => {
        expect(
          service.canInitiateConversation(UserRole.BISHOP, UserRole.PARISH),
        ).toBe(true);
      });

      it('should allow Bishop to initiate with Parishioner', () => {
        expect(
          service.canInitiateConversation(
            UserRole.BISHOP,
            UserRole.PARISHIONER,
          ),
        ).toBe(true);
      });
    });

    describe('Deanery role', () => {
      it('should not allow Deanery to initiate with Bishop', () => {
        expect(
          service.canInitiateConversation(UserRole.DEANERY, UserRole.BISHOP),
        ).toBe(false);
      });

      it('should not allow Deanery to initiate with Deanery', () => {
        expect(
          service.canInitiateConversation(UserRole.DEANERY, UserRole.DEANERY),
        ).toBe(false);
      });

      it('should allow Deanery to initiate with Parish', () => {
        expect(
          service.canInitiateConversation(UserRole.DEANERY, UserRole.PARISH),
        ).toBe(true);
      });

      it('should not allow Deanery to initiate with Parishioner', () => {
        expect(
          service.canInitiateConversation(
            UserRole.DEANERY,
            UserRole.PARISHIONER,
          ),
        ).toBe(false);
      });
    });

    describe('Parish role', () => {
      it('should not allow Parish to initiate with Bishop', () => {
        expect(
          service.canInitiateConversation(UserRole.PARISH, UserRole.BISHOP),
        ).toBe(false);
      });

      it('should not allow Parish to initiate with Deanery', () => {
        expect(
          service.canInitiateConversation(UserRole.PARISH, UserRole.DEANERY),
        ).toBe(false);
      });

      it('should not allow Parish to initiate with Parish', () => {
        expect(
          service.canInitiateConversation(UserRole.PARISH, UserRole.PARISH),
        ).toBe(false);
      });

      it('should allow Parish to initiate with Parishioner', () => {
        expect(
          service.canInitiateConversation(
            UserRole.PARISH,
            UserRole.PARISHIONER,
          ),
        ).toBe(true);
      });
    });

    describe('Parishioner role', () => {
      it('should not allow Parishioner to initiate with Bishop', () => {
        expect(
          service.canInitiateConversation(
            UserRole.PARISHIONER,
            UserRole.BISHOP,
          ),
        ).toBe(false);
      });

      it('should not allow Parishioner to initiate with Deanery', () => {
        expect(
          service.canInitiateConversation(
            UserRole.PARISHIONER,
            UserRole.DEANERY,
          ),
        ).toBe(false);
      });

      it('should not allow Parishioner to initiate with Parish', () => {
        expect(
          service.canInitiateConversation(
            UserRole.PARISHIONER,
            UserRole.PARISH,
          ),
        ).toBe(false);
      });

      it('should not allow Parishioner to initiate with Parishioner', () => {
        expect(
          service.canInitiateConversation(
            UserRole.PARISHIONER,
            UserRole.PARISHIONER,
          ),
        ).toBe(false);
      });
    });

    describe('Undefined roles', () => {
      it('should deny when initiator role is undefined', () => {
        expect(
          service.canInitiateConversation(undefined, UserRole.BISHOP),
        ).toBe(false);
      });

      it('should deny when recipient role is undefined', () => {
        expect(
          service.canInitiateConversation(UserRole.BISHOP, undefined),
        ).toBe(false);
      });

      it('should deny when both roles are undefined', () => {
        expect(service.canInitiateConversation(undefined, undefined)).toBe(
          false,
        );
      });
    });
  });

  describe('getForbiddenMessage', () => {
    it('should return appropriate message for Parishioner', () => {
      const message = service.getForbiddenMessage(
        UserRole.PARISHIONER,
        UserRole.BISHOP,
      );
      expect(message).toContain('Parishioners cannot initiate conversations');
    });

    it('should return appropriate message for Parish trying to contact non-Parishioner', () => {
      const message = service.getForbiddenMessage(
        UserRole.PARISH,
        UserRole.BISHOP,
      );
      expect(message).toContain(
        'Parish can only initiate conversations with Parishioners',
      );
    });

    it('should return appropriate message for Deanery trying to contact non-Parish', () => {
      const message = service.getForbiddenMessage(
        UserRole.DEANERY,
        UserRole.BISHOP,
      );
      expect(message).toContain(
        'Deanery can only initiate conversations with Parish',
      );
    });

    it('should return message for undefined initiator role', () => {
      const message = service.getForbiddenMessage(undefined, UserRole.BISHOP);
      expect(message).toContain('Your role is not defined');
    });

    it('should return message for undefined recipient role', () => {
      const message = service.getForbiddenMessage(UserRole.BISHOP, undefined);
      expect(message).toContain('Recipient role is not defined');
    });
  });
});
