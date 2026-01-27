import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Game } from './game.entity';

export enum Difficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
}

@Entity('puzzles')
export class Puzzle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'text',
    enum: Difficulty,
  })
  difficulty: Difficulty;

  @Column({ type: 'simple-json' })
  puzzle: number[][]; // 9x9 array, 0 = empty cell

  @Column({ type: 'simple-json' })
  solution: number[][]; // 9x9 array, complete solution

  @Column({ default: 5 })
  rating: number; // Difficulty rating 1-10

  @OneToMany(() => Game, (game) => game.puzzle)
  games: Game[];
}
