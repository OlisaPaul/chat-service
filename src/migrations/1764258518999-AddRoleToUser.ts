import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToUser1764258518999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) {
      return;
    }

    const hasRoleColumn = await queryRunner.hasColumn('users', 'role');
    if (hasRoleColumn) {
      return;
    }

    await queryRunner.query(`ALTER TABLE \`users\` ADD \`role\` varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');
    if (!hasUsersTable) {
      return;
    }

    const hasRoleColumn = await queryRunner.hasColumn('users', 'role');
    if (!hasRoleColumn) {
      return;
    }

    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`role\``);
  }
}
