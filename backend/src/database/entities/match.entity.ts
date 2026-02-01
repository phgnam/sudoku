import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Puzzle, Difficulty } from './puzzle.entity';

export enum MatchStatus {
  WAITING = 'waiting', // Room created, waiting for player 2
  READY = 'ready', // Both players joined, waiting for ready
  PLAYING = 'playing', // Game in progress
  FINISHED = 'finished', // Game ended (win/draw/forfeit)
  CANCELLED = 'cancelled', // Room cancelled before start
}

export enum MatchResult {
  HOST_WIN = 'host_win',
  GUEST_WIN = 'guest_win',
  DRAW = 'draw',
}

@Entity('matches')
export class Match {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id: string; // Custom 6-char alphanumeric ID (e.g., "ABC123")

  @Column({ nullable: true })
  hostId: string;

  @Column({ nullable: true })
  guestId: string;

  @Column({ type: 'text' })
  difficulty: Difficulty;

  @Column({ nullable: true })
  puzzleId: string;

  @Column({ type: 'simple-json', nullable: true })
  hostState: number[][];

  @Column({ type: 'simple-json', nullable: true })
  guestState: number[][];

  @Column({ type: 'simple-json', default: '[]' })
  hostFilledCells: string[]; // ["row,col", ...]

  @Column({ type: 'simple-json', default: '[]' })
  guestFilledCells: string[];

  @Column({ type: 'text', default: MatchStatus.WAITING })
  status: MatchStatus;

  @Column({ type: 'text', nullable: true })
  result: MatchResult;

  @Column({ nullable: true })
  winnerId: string;

  @Column({ nullable: true })
  hostCompletionTime: number; // ms from start

  @Column({ nullable: true })
  guestCompletionTime: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'guestId' })
  guest: User;

  @ManyToOne(() => Puzzle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'puzzleId' })
  puzzle: Puzzle;
}
