import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, Game, Puzzle, GameHistory, Match } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get('DATABASE_PATH', 'sudoku.db'),
        entities: [User, Game, Puzzle, GameHistory, Match],
        synchronize: configService.get('NODE_ENV') !== 'production', // Auto-sync in dev
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    TypeOrmModule.forFeature([User, Game, Puzzle, GameHistory, Match]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
