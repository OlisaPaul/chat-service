import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class RoleAuthorizationService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Determines if a user with the initiator role can initiate a conversation
   * with a user having the recipient role.
   *
   * Hierarchy Rules:
   * - Bishop: Can initiate with anyone (Deanery, Parish, Parishioner)
   * - Deanery: Can only initiate with Parish
   * - Parish: Can only initiate with Parishioner
   * - Parishioner: Cannot initiate conversations with anyone
   *
   * Note: All roles can participate in existing conversations (respond to messages)
   */
  canInitiateConversation(
    initiatorRole: UserRole | undefined,
    recipientRole: UserRole | undefined,
  ): boolean {
    if (!this.configService.get<boolean>('auth.roleAuthorizationEnabled')) {
      return true;
    }

    // If either role is undefined, deny by default for safety
    if (!initiatorRole || !recipientRole) {
      return false;
    }

    switch (initiatorRole) {
      case UserRole.BISHOP:
        // Bishop can initiate with anyone
        return true;

      case UserRole.DEANERY:
        // Deanery can only initiate with Parish
        return recipientRole === UserRole.PARISH;

      case UserRole.PARISH:
        // Parish can only initiate with Parishioner
        return recipientRole === UserRole.PARISHIONER;

      case UserRole.PARISHIONER:
        // Parishioner cannot initiate conversations
        return false;

      default:
        // Unknown role, deny by default
        return false;
    }
  }

  /**
   * Gets a human-readable error message for forbidden conversation initiation
   */
  getForbiddenMessage(
    initiatorRole: UserRole | undefined,
    recipientRole: UserRole | undefined,
  ): string {
    if (!initiatorRole) {
      return 'Your role is not defined. Cannot initiate conversations.';
    }

    if (!recipientRole) {
      return 'Recipient role is not defined. Cannot initiate conversation.';
    }

    switch (initiatorRole) {
      case UserRole.PARISHIONER:
        return 'Parishioners cannot initiate conversations. You can only respond to messages from Parish, Deanery, or Bishop.';

      case UserRole.PARISH:
        if (recipientRole !== UserRole.PARISHIONER) {
          return 'Parish can only initiate conversations with Parishioners. You can respond to messages from Deanery or Bishop.';
        }
        break;

      case UserRole.DEANERY:
        if (recipientRole !== UserRole.PARISH) {
          return 'Deanery can only initiate conversations with Parish. You can respond to messages from Bishop.';
        }
        break;
    }

    return `You do not have permission to initiate a conversation with a ${recipientRole}.`;
  }
}
