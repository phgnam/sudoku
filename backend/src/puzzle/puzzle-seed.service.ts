import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Puzzle, Difficulty } from '../database/entities';
import { SudokuGeneratorService } from './services/sudoku-generator.service';

@Injectable()
export class PuzzleSeedService implements OnModuleInit {
  private readonly logger = new Logger(PuzzleSeedService.name);

  constructor(
    @InjectRepository(Puzzle)
    private puzzleRepository: Repository<Puzzle>,
    private sudokuGenerator: SudokuGeneratorService,
  ) {}

  async onModuleInit() {
    await this.seedPuzzles();
  }

  private async seedPuzzles() {
    // Check if puzzles already exist
    const count = await this.puzzleRepository.count();
    if (count > 0) {
      this.logger.log(
        `Database already contains ${count} puzzles. Skipping seed.`,
      );
      return;
    }

    this.logger.log('Seeding puzzles...');

    const puzzlesToCreate: Partial<Puzzle>[] = [];

    // Generate 400 Easy puzzles
    for (let i = 0; i < 400; i++) {
      const { puzzle, solution, rating } =
        this.sudokuGenerator.generatePuzzle('easy');
      puzzlesToCreate.push({
        difficulty: Difficulty.EASY,
        puzzle,
        solution,
        rating,
      });
    }

    // Generate 400 Normal puzzles
    for (let i = 0; i < 400; i++) {
      const { puzzle, solution, rating } =
        this.sudokuGenerator.generatePuzzle('normal');
      puzzlesToCreate.push({
        difficulty: Difficulty.NORMAL,
        puzzle,
        solution,
        rating,
      });
    }

    // Generate 400 Hard puzzles
    for (let i = 0; i < 400; i++) {
      const { puzzle, solution, rating } =
        this.sudokuGenerator.generatePuzzle('hard');
      puzzlesToCreate.push({
        difficulty: Difficulty.HARD,
        puzzle,
        solution,
        rating,
      });
    }

    // Batch insert for performance
    const batchSize = 100;
    for (let i = 0; i < puzzlesToCreate.length; i += batchSize) {
      const batch = puzzlesToCreate.slice(i, i + batchSize);
      await this.puzzleRepository.save(batch);
      this.logger.log(
        `Inserted ${Math.min(i + batchSize, puzzlesToCreate.length)}/${puzzlesToCreate.length} puzzles`,
      );
    }

    this.logger.log(
      `Successfully seeded ${puzzlesToCreate.length} puzzles (400 Easy, 400 Normal, 400 Hard)`,
    );
  }
}
