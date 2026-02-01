import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Difficulty } from './puzzle.entity';

@Entity('game_history')
export class GameHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  gameId: string; // Reference to original game

  @Column({
    type: 'text',
    enum: Difficulty,
  })
  difficulty: Difficulty;

  @Column()
  timeElapsed: number; // Final time in seconds

  @Column()
  hintsUsed: number;

  @Column()
  mistakes: number;

  @CreateDateColumn()
  completedAt: Date;

  @ManyToOne(() => User, (user) => user.gameHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
