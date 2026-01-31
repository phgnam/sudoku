import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { PuzzleModule } from './puzzle/puzzle.module';
import { AuthModule } from './auth/auth.module';
import { GameModule } from './game/game.module';
import { GatewayModule } from './gateway/gateway.module';
import { I18nConfigModule } from './i18n/i18n.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { MatchModule } from './match/match.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    I18nConfigModule,
    DatabaseModule,
    PuzzleModule,
    AuthModule,
    GameModule,
    GatewayModule,
    LeaderboardModule,
    MatchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
