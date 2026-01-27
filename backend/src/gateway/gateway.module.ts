import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameModule } from '../game/game.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GameModule, AuthModule],
  providers: [GameGateway],
})
export class GatewayModule {}
