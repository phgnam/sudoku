import { Module, Global } from '@nestjs/common';
import { CacheService } from './services/cache.service';

/**
 * Common module providing shared services and utilities
 * Marked as @Global so services are available throughout the app
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CommonModule {}

