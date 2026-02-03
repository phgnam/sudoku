import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum TripodDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface TripodBordersJson {
  horizontal: boolean[][];
  vertical: boolean[][];
}

@Entity('tripod_puzzles')
export class TripodPuzzle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 7 })
  gridSize: number;

  @Column()
  name: string;

  @Column({
    type: 'text',
    enum: TripodDifficulty,
  })
  difficulty: TripodDifficulty;

  @Column({ type: 'simple-json' })
  cells: number[][]; // Initial given numbers (0 = empty)

  @Column({ type: 'simple-json' })
  solution: number[][]; // Complete solution

  @Column({ type: 'simple-json' })
  tripodDots: boolean[][]; // Dot positions at vertices (gridSize+1 × gridSize+1)

  @Column({ type: 'simple-json', nullable: true })
  regions: TripodBordersJson | null; // Pre-defined borders for Mode B (sudoku_only)

  @Column({ default: 5 })
  rating: number; // Difficulty rating 1-10

  @CreateDateColumn()
  createdAt: Date;

  // Relationship to games will be added in Phase 2
}
