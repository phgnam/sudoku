import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameGateway } from './game.gateway';
import {
  GameHandlers,
  MatchHandlers,
  MatchmakingHandlers,
  SpectatorHandlers,
  TripodHandlers,
} from './handlers';
import { GameModule } from '../game/game.module';
import { AuthModule } from '../auth/auth.module';
import { MatchModule } from '../match/match.module';
import { User } from '../database/entities';

@Module({
  imports: [
    GameModule,
    AuthModule,
    MatchModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    GameGateway,
    GameHandlers,
    MatchHandlers,
    MatchmakingHandlers,
    SpectatorHandlers,
    TripodHandlers,
  ],
})
export class GatewayModule {}
