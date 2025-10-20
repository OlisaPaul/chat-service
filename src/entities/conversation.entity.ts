import { Entity, PrimaryGeneratedColumn, ManyToMany, JoinTable, CreateDateColumn, Column, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('conversations')
@Index(['participantIdsHash'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  participantIdsHash: string; // Deterministic hash of sorted participant IDs

  @ManyToMany(() => User, { cascade: true })
  @JoinTable({ name: 'conversation_participants' })
  participants: User[];

  @CreateDateColumn()
  createdAt: Date;
}