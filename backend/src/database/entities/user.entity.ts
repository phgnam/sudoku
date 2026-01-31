import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Game } from './game.entity';
import { GameHistory } from './game-history.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  username: string;

  @Column({ type: 'simple-json', nullable: true })
  stats: {
    totalGames: number;
    winRate: number;
    avgTimeEasy: number;
    avgTimeNormal: number;
    avgTimeHard: number;
    totalTimePlayed: number;
    currentStreak: number;
  };

  @Column({ default: 0 })
  easyCompleted: number;

  @Column({ default: 0 })
  normalCompleted: number;

  @Column({ default: 0 })
  hardCompleted: number;

  // Competitive mode stats
  @Column({ default: 1000 })
  rating: number; // ELO rating

  @Column({ default: 0 })
  competitiveGames: number; // Total matches played (for K-factor)

  @Column({ default: 0 })
  competitiveWins: number;

  @Column({ default: 0 })
  competitiveDraws: number;

  @Column({ nullable: true })
  sessionId: string; // For anonymous users

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Game, (game) => game.user)
  games: Game[];

  @OneToMany(() => GameHistory, (history) => history.user)
  gameHistory: GameHistory[];
}
