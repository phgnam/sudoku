import { Module, Global } from '@nestjs/common';
import {
  I18nModule,
  AcceptLanguageResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { I18nHelperService } from './i18n-helper.service';

@Global()
@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/'),
        watch: true,
      },
      resolvers: [
        new HeaderResolver(['x-custom-lang']),
        AcceptLanguageResolver,
      ],
      typesOutputPath: path.join(
        __dirname,
        '../../src/i18n/generated/i18n.generated.ts',
      ),
    }),
  ],
  providers: [I18nHelperService],
  exports: [I18nModule, I18nHelperService],
})
export class I18nConfigModule {}
