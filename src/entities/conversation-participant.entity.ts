import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

export type ParticipantRole = 'member' | 'admin';

@Entity('conversation_participants')
export class ConversationParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ['member', 'admin'], default: 'member' })
  role: ParticipantRole;

  @CreateDateColumn()
  joinedAt: Date;
}