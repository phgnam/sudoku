import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus, MatchResult, Puzzle } from '../../database/entities';
import { LiveMatch } from './match-manager.service';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(Puzzle)
    private puzzleRepository: Repository<Puzzle>,
  ) {}

  /**
   * Get random puzzle for match
   */
  async getRandomPuzzle(difficulty: string): Promise<Puzzle> {
    const puzzles = await this.puzzleRepository.find({
      where: { difficulty: difficulty as any },
    });

    if (puzzles.length === 0) {
      throw new NotFoundException(`No puzzles found for difficulty: ${difficulty}`);
    }

    return puzzles[Math.floor(Math.random() * puzzles.length)];
  }

  /**
   * Persist match to database on completion
   */
  async persistMatch(liveMatch: LiveMatch): Promise<Match> {
    const matchData: Partial<Match> = {
      id: liveMatch.id,
      hostId: liveMatch.hostId,
      guestId: liveMatch.guestId ?? undefined,
      difficulty: liveMatch.difficulty,
      puzzleId: liveMatch.puzzleId ?? undefined,
      hostState: liveMatch.hostState ?? undefined,
      guestState: liveMatch.guestState ?? undefined,
      hostFilledCells: Array.from(liveMatch.hostFilledCells),
      guestFilledCells: Array.from(liveMatch.guestFilledCells),
      status: this.mapLiveStatus(liveMatch.status),
      result: this.determineResult(liveMatch),
      winnerId: liveMatch.winnerId ?? undefined,
      startedAt: liveMatch.startTime ? new Date(liveMatch.startTime) : undefined,
      endedAt: new Date(),
    };

    const match = this.matchRepository.create(matchData);
    const saved = await this.matchRepository.save(match);
    this.logger.log(`Match ${match.id} persisted to database`);
    return saved;
  }

  /**
   * Get match history for a user
   */
  async getUserMatchHistory(userId: string, limit: number = 10): Promise<Match[]> {
    return this.matchRepository
      .createQueryBuilder('match')
      .where('match.hostId = :userId OR match.guestId = :userId', { userId })
      .andWhere('match.status = :status', { status: MatchStatus.FINISHED })
      .orderBy('match.endedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Get match by ID
   */
  async getMatch(matchId: string): Promise<Match | null> {
    return this.matchRepository.findOne({ where: { id: matchId } });
  }

  private mapLiveStatus(status: LiveMatch['status']): MatchStatus {
    switch (status) {
      case 'waiting': return MatchStatus.WAITING;
      case 'ready': return MatchStatus.READY;
      case 'playing': return MatchStatus.PLAYING;
      case 'finished': return MatchStatus.FINISHED;
      case 'cancelled': return MatchStatus.CANCELLED;
      default: return MatchStatus.WAITING;
    }
  }

  private determineResult(liveMatch: LiveMatch): MatchResult | undefined {
    if (liveMatch.status !== 'finished') return undefined;
    
    if (!liveMatch.winnerId) {
      return MatchResult.DRAW;
    }
    
    return liveMatch.winnerId === liveMatch.hostId 
      ? MatchResult.HOST_WIN 
      : MatchResult.GUEST_WIN;
  }
}

