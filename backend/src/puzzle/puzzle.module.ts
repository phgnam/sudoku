import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Puzzle } from '../database/entities';
import { SudokuGeneratorService } from './services/sudoku-generator.service';
import { TripodPuzzleService } from './services/tripod-puzzle.service';
import { PuzzleSeedService } from './puzzle-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Puzzle])],
  providers: [SudokuGeneratorService, TripodPuzzleService, PuzzleSeedService],
  exports: [SudokuGeneratorService, TripodPuzzleService],
})
export class PuzzleModule {}
