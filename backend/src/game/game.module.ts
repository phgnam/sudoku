import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game, User, Puzzle, GameHistory } from '../database/entities';
import { GameService } from './services/game.service';
import { SudokuValidatorService } from './services/sudoku-validator.service';
import { HintService } from './services/hint.service';
import { MutationService } from './services/mutation.service';
import { GameController } from './game.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Game, User, Puzzle, GameHistory])],
  controllers: [GameController],
  providers: [GameService, SudokuValidatorService, HintService, MutationService],
  exports: [GameService, MutationService],
})
export class GameModule {}
