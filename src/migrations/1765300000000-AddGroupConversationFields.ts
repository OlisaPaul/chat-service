import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupConversationFields1765300000000
  implements MigrationInterface
{
  name = 'AddGroupConversationFields1765300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasConversationsTable = await queryRunner.hasTable('conversations');
    if (!hasConversationsTable) {
      return;
    }

    const hasNameColumn = await queryRunner.hasColumn('conversations', 'name');
    if (!hasNameColumn) {
      await queryRunner.query(
        'ALTER TABLE `conversations` ADD `name` varchar(255) NULL',
      );
    }

    await queryRunner.query(
      'ALTER TABLE `conversations` MODIFY `participantIdsHash` varchar(255) NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasConversationsTable = await queryRunner.hasTable('conversations');
    if (!hasConversationsTable) {
      return;
    }

    const hasNameColumn = await queryRunner.hasColumn('conversations', 'name');
    if (hasNameColumn) {
      await queryRunner.query(
        'ALTER TABLE `conversations` DROP COLUMN `name`',
      );
    }

    await queryRunner.query(
      "UPDATE `conversations` SET `participantIdsHash` = CONCAT('legacy-', `id`) WHERE `participantIdsHash` IS NULL",
    );
    await queryRunner.query(
      'ALTER TABLE `conversations` MODIFY `participantIdsHash` varchar(255) NOT NULL',
    );
  }
}
