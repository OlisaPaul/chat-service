import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialChatPlatformSchema1763000000000
  implements MigrationInterface
{
  name = 'InitialChatPlatformSchema1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) {
      await queryRunner.query(`
        CREATE TABLE \`users\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`externalId\` varchar(255) NOT NULL,
          \`name\` varchar(255) NOT NULL,
          \`avatarUrl\` varchar(255) NULL,
          \`role\` enum ('bishop', 'deanery', 'parish', 'parishioner') NULL,
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`IDX_users_external_id\` (\`externalId\`)
        ) ENGINE=InnoDB
      `);
    }

    const hasConversationsTable = await queryRunner.hasTable('conversations');
    if (!hasConversationsTable) {
      await queryRunner.query(`
        CREATE TABLE \`conversations\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`type\` enum ('private', 'group') NOT NULL DEFAULT 'private',
          \`participantIdsHash\` varchar(255) NULL,
          \`name\` varchar(255) NULL,
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`IDX_conversations_participant_ids_hash\` (\`participantIdsHash\`)
        ) ENGINE=InnoDB
      `);
    }

    const hasConversationParticipantsTable = await queryRunner.hasTable(
      'conversation_participants',
    );
    if (!hasConversationParticipantsTable) {
      await queryRunner.query(`
        CREATE TABLE \`conversation_participants\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`role\` enum ('member', 'admin') NOT NULL DEFAULT 'member',
          \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`conversation_id\` int NULL,
          \`user_id\` int NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`IDX_conversation_participants_conversation_id\` (\`conversation_id\`),
          INDEX \`IDX_conversation_participants_user_id\` (\`user_id\`)
        ) ENGINE=InnoDB
      `);
      await queryRunner.query(`
        ALTER TABLE \`conversation_participants\`
        ADD CONSTRAINT \`FK_conversation_participants_conversation_id\`
        FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
      await queryRunner.query(`
        ALTER TABLE \`conversation_participants\`
        ADD CONSTRAINT \`FK_conversation_participants_user_id\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    const hasMessagesTable = await queryRunner.hasTable('messages');
    if (!hasMessagesTable) {
      await queryRunner.query(`
        CREATE TABLE \`messages\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`content\` text NULL,
          \`mediaUrl\` varchar(500) NULL,
          \`mediaType\` varchar(50) NULL,
          \`status\` enum ('sent', 'delivered', 'read') NOT NULL DEFAULT 'sent',
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`conversationId\` int NULL,
          \`senderId\` int NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`IDX_messages_conversation_id\` (\`conversationId\`),
          INDEX \`IDX_messages_sender_id\` (\`senderId\`)
        ) ENGINE=InnoDB
      `);
      await queryRunner.query(`
        ALTER TABLE \`messages\`
        ADD CONSTRAINT \`FK_messages_conversation_id\`
        FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
      await queryRunner.query(`
        ALTER TABLE \`messages\`
        ADD CONSTRAINT \`FK_messages_sender_id\`
        FOREIGN KEY (\`senderId\`) REFERENCES \`users\`(\`id\`)
        ON DELETE NO ACTION ON UPDATE NO ACTION
      `);
    }

    const hasCallSessionsTable = await queryRunner.hasTable('call_sessions');
    if (!hasCallSessionsTable) {
      await queryRunner.query(`
        CREATE TABLE \`call_sessions\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`type\` enum ('audio', 'video') NOT NULL,
          \`status\` enum ('initiated', 'ringing', 'accepted', 'rejected', 'cancelled', 'ended', 'missed', 'failed') NOT NULL DEFAULT 'initiated',
          \`startedAt\` datetime NULL,
          \`endedAt\` datetime NULL,
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          \`initiator_id\` int NULL,
          \`conversation_id\` int NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`IDX_call_sessions_initiator_id\` (\`initiator_id\`),
          INDEX \`IDX_call_sessions_conversation_id\` (\`conversation_id\`)
        ) ENGINE=InnoDB
      `);
      await queryRunner.query(`
        ALTER TABLE \`call_sessions\`
        ADD CONSTRAINT \`FK_call_sessions_initiator_id\`
        FOREIGN KEY (\`initiator_id\`) REFERENCES \`users\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
      await queryRunner.query(`
        ALTER TABLE \`call_sessions\`
        ADD CONSTRAINT \`FK_call_sessions_conversation_id\`
        FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    const hasCallParticipantsTable = await queryRunner.hasTable('call_participants');
    if (!hasCallParticipantsTable) {
      await queryRunner.query(`
        CREATE TABLE \`call_participants\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`role\` enum ('caller', 'callee') NOT NULL,
          \`status\` enum ('invited', 'accepted', 'rejected', 'left', 'missed') NOT NULL DEFAULT 'invited',
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`call_session_id\` int NULL,
          \`user_id\` int NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`IDX_call_participants_call_session_id\` (\`call_session_id\`),
          INDEX \`IDX_call_participants_user_id\` (\`user_id\`)
        ) ENGINE=InnoDB
      `);
      await queryRunner.query(`
        ALTER TABLE \`call_participants\`
        ADD CONSTRAINT \`FK_call_participants_call_session_id\`
        FOREIGN KEY (\`call_session_id\`) REFERENCES \`call_sessions\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
      await queryRunner.query(`
        ALTER TABLE \`call_participants\`
        ADD CONSTRAINT \`FK_call_participants_user_id\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `call_participants` DROP FOREIGN KEY `FK_call_participants_user_id`',
    ).catch(() => undefined);
    await queryRunner.query(
      'ALTER TABLE `call_participants` DROP FOREIGN KEY `FK_call_participants_call_session_id`',
    ).catch(() => undefined);
    await queryRunner.query(
      'ALTER TABLE `call_sessions` DROP FOREIGN KEY `FK_call_sessions_initiator_id`',
    ).catch(() => undefined);
    await queryRunner.query(
      'ALTER TABLE `call_sessions` DROP FOREIGN KEY `FK_call_sessions_conversation_id`',
    ).catch(() => undefined);
    await queryRunner.query(
      'ALTER TABLE `messages` DROP FOREIGN KEY `FK_messages_sender_id`',
    ).catch(() => undefined);
    await queryRunner.query(
      'ALTER TABLE `messages` DROP FOREIGN KEY `FK_messages_conversation_id`',
    ).catch(() => undefined);
    await queryRunner.query(
      'ALTER TABLE `conversation_participants` DROP FOREIGN KEY `FK_conversation_participants_user_id`',
    ).catch(() => undefined);
    await queryRunner.query(
      'ALTER TABLE `conversation_participants` DROP FOREIGN KEY `FK_conversation_participants_conversation_id`',
    ).catch(() => undefined);

    await queryRunner.query('DROP TABLE IF EXISTS `call_participants`');
    await queryRunner.query('DROP TABLE IF EXISTS `call_sessions`');
    await queryRunner.query('DROP TABLE IF EXISTS `messages`');
    await queryRunner.query('DROP TABLE IF EXISTS `conversation_participants`');
    await queryRunner.query('DROP TABLE IF EXISTS `conversations`');
    await queryRunner.query('DROP TABLE IF EXISTS `users`');
  }
}
