import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationContextToCalls1765600000000
  implements MigrationInterface
{
  name = 'AddConversationContextToCalls1765600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCallSessionsTable = await queryRunner.hasTable('call_sessions');
    const hasConversationsTable = await queryRunner.hasTable('conversations');
    if (!hasCallSessionsTable || !hasConversationsTable) {
      return;
    }

    const hasConversationColumn = await queryRunner.hasColumn(
      'call_sessions',
      'conversation_id',
    );
    if (!hasConversationColumn) {
      await queryRunner.query(`
        ALTER TABLE \`call_sessions\`
        ADD \`conversation_id\` int NULL
      `);
    }

    await queryRunner.query(`
      CREATE INDEX \`IDX_call_sessions_conversation_id\`
      ON \`call_sessions\` (\`conversation_id\`)
    `).catch(() => undefined);

    await queryRunner.query(`
      ALTER TABLE \`call_sessions\`
      ADD CONSTRAINT \`FK_call_sessions_conversation_id\`
      FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`)
      ON DELETE CASCADE ON UPDATE NO ACTION
    `).catch(() => undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCallSessionsTable = await queryRunner.hasTable('call_sessions');
    if (!hasCallSessionsTable) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE \`call_sessions\`
      DROP FOREIGN KEY \`FK_call_sessions_conversation_id\`
    `).catch(() => undefined);

    await queryRunner.query(`
      DROP INDEX \`IDX_call_sessions_conversation_id\`
      ON \`call_sessions\`
    `).catch(() => undefined);

    const hasConversationColumn = await queryRunner.hasColumn(
      'call_sessions',
      'conversation_id',
    );
    if (hasConversationColumn) {
      await queryRunner.query(`
        ALTER TABLE \`call_sessions\`
        DROP COLUMN \`conversation_id\`
      `);
    }
  }
}
