import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Puzzle } from '../database/entities';
import { SudokuGeneratorService } from './services/sudoku-generator.service';
import { PuzzleSeedService } from './puzzle-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Puzzle])],
  providers: [SudokuGeneratorService, PuzzleSeedService],
  exports: [SudokuGeneratorService],
})
export class PuzzleModule {}
