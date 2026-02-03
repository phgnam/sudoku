import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Game,
  User,
  Puzzle,
  GameHistory,
  TripodPuzzle,
} from '../database/entities';
import { GameService } from './services/game.service';
import { SudokuValidatorService } from './services/sudoku-validator.service';
import { HintService } from './services/hint.service';
import { MutationService } from './services/mutation.service';
import { GameController } from './game.controller';
import { PuzzleModule } from '../puzzle/puzzle.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, User, Puzzle, GameHistory, TripodPuzzle]),
    PuzzleModule,
  ],
  controllers: [GameController],
  providers: [
    GameService,
    SudokuValidatorService,
    HintService,
    MutationService,
  ],
  exports: [GameService, MutationService],
})
export class GameModule {}
