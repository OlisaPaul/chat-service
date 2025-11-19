import { MigrationInterface, QueryRunner } from 'typeorm';

interface ForeignKey {
  CONSTRAINT_NAME: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
  UPDATE_RULE: string;
  DELETE_RULE: string;
}

export class ConvertChatDbToUtf8mb451763551079540
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'users',
      'conversations',
      'conversation_participants',
      'messages',
    ];

    // 1️⃣ Get all foreign keys for these tables
    const foreignKeys: ForeignKey[] = await queryRunner.query(
      `
            SELECT
                kcu.CONSTRAINT_NAME,
                kcu.TABLE_NAME,
                kcu.COLUMN_NAME,
                kcu.REFERENCED_TABLE_NAME,
                kcu.REFERENCED_COLUMN_NAME,
                rc.UPDATE_RULE,
                rc.DELETE_RULE
            FROM information_schema.KEY_COLUMN_USAGE AS kcu
            JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc
                ON kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
                AND kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
            WHERE kcu.TABLE_SCHEMA = DATABASE()
              AND kcu.TABLE_NAME IN (${tables.map((t) => `'${t}'`).join(', ')})
            ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME;
            `,
    );

    // 2️⃣ Drop all foreign keys first
    for (const fk of foreignKeys) {
      console.log(fk);
      await queryRunner.query(
        `ALTER TABLE \`${fk.TABLE_NAME}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``,
      );
    }

    // 3️⃣ Convert all tables to utf8mb4
    for (const table of tables) {
      console.log(table);
      await queryRunner.query(
        `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    }

    // 4️⃣ Recreate foreign keys with original update/delete rules
    for (const fk of foreignKeys) {
      console.log(fk);
      await queryRunner.query(
        `ALTER TABLE \`${fk.TABLE_NAME}\`
                 ADD CONSTRAINT \`${fk.CONSTRAINT_NAME}\`
                 FOREIGN KEY (\`${fk.COLUMN_NAME}\`)
                 REFERENCES \`${fk.REFERENCED_TABLE_NAME}\`(\`${fk.REFERENCED_COLUMN_NAME}\`)
                 ON UPDATE ${fk.UPDATE_RULE}
                 ON DELETE ${fk.DELETE_RULE}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Optional: You can implement rollback if necessary, similar approach
    // Drop FKs, optionally revert character sets (if needed), recreate FKs
  }
}
