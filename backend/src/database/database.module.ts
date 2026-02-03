import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  User,
  Game,
  Puzzle,
  GameHistory,
  Match,
  TripodPuzzle,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get('DATABASE_PATH', 'sudoku.db'),
        entities: [User, Game, Puzzle, GameHistory, Match, TripodPuzzle],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Game,
      Puzzle,
      GameHistory,
      Match,
      TripodPuzzle,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
