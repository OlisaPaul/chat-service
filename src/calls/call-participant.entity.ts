import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { CallSession } from './call-session.entity';

export enum CallParticipantRole {
  CALLER = 'caller',
  CALLEE = 'callee',
}

export enum CallParticipantStatus {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  LEFT = 'left',
  MISSED = 'missed',
}

@Entity('call_participants')
export class CallParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CallSession, (call) => call.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'call_session_id' })
  call: CallSession;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: CallParticipantRole })
  role: CallParticipantRole;

  @Column({
    type: 'enum',
    enum: CallParticipantStatus,
    default: CallParticipantStatus.INVITED,
  })
  status: CallParticipantStatus;

  @CreateDateColumn()
  createdAt: Date;
}
