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

export enum GameMode {
  CLASSIC = 'classic',
  MUTATING = 'mutating',
  TRIPOD = 'tripod',
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

export interface TripodData {
  tripodDots: boolean[][]; // (gridSize+1)×(gridSize+1) vertex grid
  horizontalBorders: boolean[][]; // (gridSize+1) × gridSize
  verticalBorders: boolean[][]; // gridSize × (gridSize+1)
  solutionBorders?: {
    horizontal: boolean[][];
    vertical: boolean[][];
  };
  subMode?: 'full' | 'borders_only' | 'sudoku_only'; // Game sub-mode
  initialCells?: number[][]; // Original puzzle givens (cells at game start)
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

  @Column({ type: 'text', default: 'classic' })
  gameMode: string; // Use string for SQLite compatibility

  @Column({ default: 0 })
  mutationCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastMutationAt: Date | null;

  @Column({ default: 9 })
  gridSize: number; // 7 for tripod, 9 for classic

  @Column({ type: 'simple-json', nullable: true })
  tripodData: TripodData | null;
}
