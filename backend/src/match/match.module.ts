import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match, Puzzle, User } from '../database/entities';
import {
  MatchManagerService,
  MatchService,
  EloService,
  MatchmakingService,
} from './services';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Puzzle, User])],
  providers: [
    MatchManagerService,
    MatchService,
    EloService,
    MatchmakingService,
  ],
  exports: [MatchManagerService, MatchService, EloService, MatchmakingService],
})
export class MatchModule {}
