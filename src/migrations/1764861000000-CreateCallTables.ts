import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCallTables1764861000000 implements MigrationInterface {
  name = 'CreateCallTables1764861000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCallSessionsTable = await queryRunner.hasTable('call_sessions');
    const hasCallParticipantsTable = await queryRunner.hasTable('call_participants');
    if (hasCallSessionsTable && hasCallParticipantsTable) {
      return;
    }

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCallParticipantsTable = await queryRunner.hasTable('call_participants');
    const hasCallSessionsTable = await queryRunner.hasTable('call_sessions');
    if (!hasCallParticipantsTable && !hasCallSessionsTable) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE \`call_participants\`
      DROP FOREIGN KEY \`FK_call_participants_user_id\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`call_participants\`
      DROP FOREIGN KEY \`FK_call_participants_call_session_id\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`call_sessions\`
      DROP FOREIGN KEY \`FK_call_sessions_initiator_id\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`call_sessions\`
      DROP FOREIGN KEY \`FK_call_sessions_conversation_id\`
    `).catch(() => undefined);
    await queryRunner.query(`DROP TABLE \`call_participants\``);
    await queryRunner.query(`DROP TABLE \`call_sessions\``);
  }
}
