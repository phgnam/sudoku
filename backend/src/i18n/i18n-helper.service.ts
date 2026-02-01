import { Injectable } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';

/**
 * Helper service for handling translations throughout the application.
 * Provides convenient methods for translating messages with optional arguments.
 */
@Injectable()
export class I18nHelperService {
  constructor(private readonly i18n: I18nService) {}

  /**
   * Translate a key with optional arguments.
   * Uses the current request context language if available,
   * otherwise falls back to the default language.
   *
   * @param key - Translation key (e.g., 'common.validation.required')
   * @param args - Optional arguments for interpolation
   * @returns Translated string
   */
  translate(key: string, args?: Record<string, string | number>): string {
    const lang = I18nContext.current()?.lang;
    return this.i18n.translate(key, { lang, args });
  }

  /**
   * Translate a validation message.
   * Shorthand for common.validation.* keys.
   *
   * @param validationType - Validation type (e.g., 'required', 'email')
   * @param args - Optional arguments for interpolation
   * @returns Translated validation message
   */
  translateValidation(
    validationType: string,
    args?: Record<string, string | number>,
  ): string {
    return this.translate(`common.validation.${validationType}`, args);
  }

  /**
   * Translate an auth message.
   * Shorthand for common.auth.* keys.
   *
   * @param authType - Auth message type (e.g., 'invalidCredentials')
   * @param args - Optional arguments for interpolation
   * @returns Translated auth message
   */
  translateAuth(
    authType: string,
    args?: Record<string, string | number>,
  ): string {
    return this.translate(`common.auth.${authType}`, args);
  }

  /**
   * Translate a game message.
   * Shorthand for common.game.* keys.
   *
   * @param gameType - Game message type (e.g., 'notFound')
   * @param args - Optional arguments for interpolation
   * @returns Translated game message
   */
  translateGame(
    gameType: string,
    args?: Record<string, string | number>,
  ): string {
    return this.translate(`common.game.${gameType}`, args);
  }

  /**
   * Translate an error message.
   * Shorthand for common.errors.* keys.
   *
   * @param errorType - Error type (e.g., 'internalError')
   * @param args - Optional arguments for interpolation
   * @returns Translated error message
   */
  translateError(
    errorType: string,
    args?: Record<string, string | number>,
  ): string {
    return this.translate(`common.errors.${errorType}`, args);
  }

  /**
   * Get the current language from request context.
   *
   * @returns Current language code or undefined
   */
  getCurrentLanguage(): string | undefined {
    return I18nContext.current()?.lang;
  }

  /**
   * Translate with explicit language specification.
   *
   * @param key - Translation key
   * @param lang - Language code (e.g., 'en', 'vi')
   * @param args - Optional arguments for interpolation
   * @returns Translated string
   */
  translateWithLang(
    key: string,
    lang: string,
    args?: Record<string, string | number>,
  ): string {
    return this.i18n.translate(key, { lang, args });
  }
}
