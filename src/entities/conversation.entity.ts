import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { User } from './user.entity';
import { ConversationParticipant } from './conversation-participant.entity';

export type ConversationType = 'private' | 'group';

@Entity('conversations')
@Index(['participantIdsHash'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['private', 'group'], default: 'private' })
  type: ConversationType;

  @Column({ type: 'varchar', length: 255 })
  participantIdsHash: string; // Deterministic hash of sorted participant IDs

  @OneToMany(() => ConversationParticipant, participant => participant.conversation, { cascade: true })
  participants: ConversationParticipant[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}