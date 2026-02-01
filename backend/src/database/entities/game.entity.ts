import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Puzzle, Difficulty } from './puzzle.entity';

export enum GameStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABANDONED = 'abandoned',
}

export interface Move {
  row: number;
  col: number;
  previousValue: number;
  newValue: number;
  timestamp: number;
}

export interface HintedCell {
  row: number;
  col: number;
}

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  puzzleId: string;

  @Column({
    type: 'text',
    enum: Difficulty,
  })
  difficulty: Difficulty;

  @Column({ type: 'simple-json' })
  currentState: number[][]; // 9x9 current game state

  @Column({ type: 'simple-json', default: '[]' })
  moveHistory: Move[]; // Array of moves for undo/redo

  @Column({ type: 'simple-json', default: '[]' })
  hintedCells: HintedCell[]; // Cells filled by hints (cannot be undone)

  @Column({ default: 0 })
  hintsUsed: number;

  @Column({ default: 0 })
  mistakes: number;

  @Column({ default: 0 })
  timeElapsed: number; // in seconds

  @Column({
    type: 'text',
    enum: GameStatus,
    default: GameStatus.ACTIVE,
  })
  status: GameStatus;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @ManyToOne(() => User, (user) => user.games, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Puzzle, (puzzle) => puzzle.games, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'puzzleId' })
  puzzle: Puzzle;

  @VersionColumn()
  version: number;
}
