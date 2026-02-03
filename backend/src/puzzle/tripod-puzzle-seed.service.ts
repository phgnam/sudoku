import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripodPuzzle, TripodDifficulty } from '../database/entities';
import { TripodPuzzleService } from './services/tripod-puzzle.service';

@Injectable()
export class TripodPuzzleSeedService implements OnModuleInit {
  private readonly logger = new Logger(TripodPuzzleSeedService.name);

  constructor(
    @InjectRepository(TripodPuzzle)
    private tripodPuzzleRepo: Repository<TripodPuzzle>,
    private tripodPuzzleService: TripodPuzzleService,
  ) {}

  async onModuleInit() {
    const count = await this.tripodPuzzleRepo.count();
    if (count === 0) {
      this.logger.log('No tripod puzzles found. Seeding initial puzzles...');
      await this.seedPuzzles();
    } else {
      this.logger.log(`Found ${count} existing tripod puzzles`);
    }
  }

  async seedPuzzles() {
    const puzzlesToCreate = [
      // Easy puzzles
      { name: 'Diamond Pattern', difficulty: TripodDifficulty.EASY },
      { name: 'Simple Cross', difficulty: TripodDifficulty.EASY },
      { name: 'Beginner Start', difficulty: TripodDifficulty.EASY },
      { name: 'First Steps', difficulty: TripodDifficulty.EASY },
      { name: 'Easy Flow', difficulty: TripodDifficulty.EASY },
      // Medium puzzles
      { name: 'Spiral Pattern', difficulty: TripodDifficulty.MEDIUM },
      { name: 'Twisted Path', difficulty: TripodDifficulty.MEDIUM },
      { name: 'Balanced Grid', difficulty: TripodDifficulty.MEDIUM },
      { name: 'Center Focus', difficulty: TripodDifficulty.MEDIUM },
      { name: 'Moderate Challenge', difficulty: TripodDifficulty.MEDIUM },
      // Hard puzzles
      { name: 'Scattered Pattern', difficulty: TripodDifficulty.HARD },
      { name: 'Complex Web', difficulty: TripodDifficulty.HARD },
      { name: 'Expert Grid', difficulty: TripodDifficulty.HARD },
      { name: 'Master Level', difficulty: TripodDifficulty.HARD },
      { name: 'Ultimate Challenge', difficulty: TripodDifficulty.HARD },
    ];

    let successCount = 0;
    let failCount = 0;

    for (const { name, difficulty } of puzzlesToCreate) {
      try {
        const generated = this.tripodPuzzleService.generateNamedPuzzle(
          name,
          difficulty as 'easy' | 'medium' | 'hard',
        );

        const puzzle = this.tripodPuzzleRepo.create({
          name: generated.name,
          difficulty: difficulty,
          gridSize: 7,
          cells: generated.cells,
          solution: generated.solution,
          tripodDots: generated.tripodDots,
          regions: generated.borders,
          rating: generated.rating,
        });

        await this.tripodPuzzleRepo.save(puzzle);
        successCount++;
        this.logger.log(`Created puzzle: ${name} (${difficulty})`);
      } catch (error) {
        failCount++;
        this.logger.warn(
          `Failed to generate puzzle: ${name} - ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    this.logger.log(
      `Seeding complete: ${successCount} puzzles created, ${failCount} failed`,
    );
  }
}
