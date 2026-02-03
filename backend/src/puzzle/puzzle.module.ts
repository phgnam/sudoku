import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Puzzle, TripodPuzzle } from '../database/entities';
import { SudokuGeneratorService } from './services/sudoku-generator.service';
import { TripodPuzzleService } from './services/tripod-puzzle.service';
import { TripodValidationService } from './services/tripod-validation.service';
import { TripodRegionService } from './services/tripod-region.service';
import { TripodBorderService } from './services/tripod-border.service';
import { LatinSquareGeneratorService } from './services/latin-square-generator.service';
import { PuzzleSeedService } from './puzzle-seed.service';
import { TripodPuzzleSeedService } from './tripod-puzzle-seed.service';
import { TripodPuzzleController } from './tripod-puzzle.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Puzzle, TripodPuzzle])],
  controllers: [TripodPuzzleController],
  providers: [
    SudokuGeneratorService,
    TripodPuzzleService,
    TripodValidationService,
    TripodRegionService,
    TripodBorderService,
    LatinSquareGeneratorService,
    PuzzleSeedService,
    TripodPuzzleSeedService,
  ],
  exports: [SudokuGeneratorService, TripodPuzzleService],
})
export class PuzzleModule {}
