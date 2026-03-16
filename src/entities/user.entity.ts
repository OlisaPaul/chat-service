import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum UserRole {
  BISHOP = 'bishop',
  DEANERY = 'deanery',
  PARISH = 'parish',
  PARISHIONER = 'parishioner',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  externalId: string; // e.g. "appA:user:123"

  @Column()
  name: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: 'enum', enum: UserRole, nullable: true })
  role?: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}
