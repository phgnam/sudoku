import { Injectable } from '@nestjs/common';

export interface EloResult {
  newRating: number;
  change: number;
}

@Injectable()
export class EloService {
  private readonly K_NEW = 32; // K-factor for players with < 30 games
  private readonly K_ESTABLISHED = 16; // K-factor for established players
  private readonly GAMES_THRESHOLD = 30; // Games before becoming "established"

  /**
   * Calculate expected score for a player against an opponent
   * @param playerRating - Player's current rating
   * @param opponentRating - Opponent's current rating
   * @returns Expected score (0-1)
   */
  calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  /**
   * Get K-factor based on games played
   * New players (< 30 games) have higher K-factor for faster calibration
   */
  getKFactor(gamesPlayed: number): number {
    return gamesPlayed < this.GAMES_THRESHOLD ? this.K_NEW : this.K_ESTABLISHED;
  }

  /**
   * Calculate rating change after a match
   * @param playerRating - Player's current rating
   * @param opponentRating - Opponent's current rating
   * @param result - Match result from player's perspective
   * @param gamesPlayed - Player's total competitive games
   * @returns New rating and change amount
   */
  calculateRatingChange(
    playerRating: number,
    opponentRating: number,
    result: 'win' | 'lose' | 'draw',
    gamesPlayed: number,
  ): EloResult {
    const expected = this.calculateExpectedScore(playerRating, opponentRating);
    const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const K = this.getKFactor(gamesPlayed);
    const rawChange = Math.round(K * (actual - expected));
    const newRating = Math.max(100, playerRating + rawChange); // Minimum rating of 100
    // Compute change from clamped rating so it reflects the actual applied delta
    const change = newRating - playerRating;

    return {
      newRating,
      change,
    };
  }

  /**
   * Calculate rating changes for both players in a match
   */
  calculateMatchRatings(
    hostRating: number,
    hostGames: number,
    guestRating: number,
    guestGames: number,
    result: 'host_win' | 'guest_win' | 'draw',
  ): { host: EloResult; guest: EloResult } {
    const hostResult =
      result === 'host_win' ? 'win' : result === 'guest_win' ? 'lose' : 'draw';
    const guestResult =
      result === 'guest_win' ? 'win' : result === 'host_win' ? 'lose' : 'draw';

    return {
      host: this.calculateRatingChange(
        hostRating,
        guestRating,
        hostResult,
        hostGames,
      ),
      guest: this.calculateRatingChange(
        guestRating,
        hostRating,
        guestResult,
        guestGames,
      ),
    };
  }
}

