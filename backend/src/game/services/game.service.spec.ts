import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { GameService } from './game.service';
import {
  Game,
  User,
  Puzzle,
  GameHistory,
  TripodPuzzle,
  GameMode,
  GameStatus,
} from '../../database/entities';
import { SudokuValidatorService } from './sudoku-validator.service';
import { HintService } from './hint.service';
import { TripodPuzzleService } from '../../puzzle/services/tripod-puzzle.service';

describe('GameService - Critical Backend Fixes', () => {
  let service: GameService;
  let mockGameRepository: any;
  let mockManager: any;

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockGameRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      manager: {
        transaction: jest.fn((callback) => callback(mockManager)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: getRepositoryToken(Game), useValue: mockGameRepository },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Puzzle), useValue: {} },
        { provide: getRepositoryToken(GameHistory), useValue: {} },
        { provide: getRepositoryToken(TripodPuzzle), useValue: {} },
        {
          provide: SudokuValidatorService,
          useValue: { validateSudoku: jest.fn() },
        },
        { provide: HintService, useValue: { getHint: jest.fn() } },
        {
          provide: TripodPuzzleService,
          useValue: { validateTripodRules: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  describe('Fix #2.1: Optimistic Locking for toggleTripodBorder', () => {
    it('should throw ConflictException on concurrent toggle (version mismatch)', async () => {
      const gameId = 'test-game-id';
      const mockGame = {
        id: gameId,
        gameMode: GameMode.TRIPOD,
        status: GameStatus.ACTIVE,
        version: 1,
        tripodData: {
          horizontalBorders: [[true, false, true]],
          verticalBorders: [[false, true, false, true]],
          tripodDots: [[]],
        },
      };

      mockManager.findOne.mockResolvedValue(mockGame);
      mockManager.update.mockResolvedValue({ affected: 0 }); // Version mismatch

      await expect(
        service.toggleTripodBorder(gameId, 'horizontal', 0, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully toggle border with valid version', async () => {
      const gameId = 'test-game-id';
      const mockGame = {
        id: gameId,
        gameMode: GameMode.TRIPOD,
        status: GameStatus.ACTIVE,
        version: 1,
        gridSize: 7,
        tripodData: {
          horizontalBorders: [[true, false, true]],
          verticalBorders: [[false, true, false, true]],
          tripodDots: [[]],
        },
      };

      mockManager.findOne.mockResolvedValue(mockGame);
      mockManager.update.mockResolvedValue({ affected: 1 }); // Success

      const result = await service.toggleTripodBorder(gameId, 'horizontal', 0, 1);

      expect(result.version).toBe(2);
      expect(mockManager.update).toHaveBeenCalledWith(
        Game,
        { id: gameId, version: 1 },
        expect.objectContaining({ version: 2 }),
      );
    });
  });

  describe('Fix #2.2: JSON Validation', () => {
    it('should throw BadRequestException for invalid horizontalBorders length', async () => {
      const gameId = 'test-game-id';
      const mockGame = {
        id: gameId,
        gameMode: GameMode.TRIPOD,
        status: GameStatus.ACTIVE,
        gridSize: 7,
        tripodData: { tripodDots: [[]] },
      };

      const invalidBorders = {
        horizontal: [[true]], // Wrong length (should be 8 rows)
        vertical: Array(7)
          .fill(null)
          .map(() => Array(8).fill(false)),
      };

      mockGameRepository.findOne.mockResolvedValue(mockGame);

      await expect(
        service.updateTripodBorders(gameId, invalidBorders),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-array tripodData', async () => {
      const gameId = 'test-game-id';
      const mockGame = {
        id: gameId,
        gameMode: GameMode.TRIPOD,
        status: GameStatus.ACTIVE,
        gridSize: 7,
      };

      const invalidBorders = {
        horizontal: 'not-an-array' as any,
        vertical: [],
      };

      mockGameRepository.findOne.mockResolvedValue(mockGame);

      await expect(
        service.updateTripodBorders(gameId, invalidBorders),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Fix #2.3: Null Pointer Guards', () => {
    it('should handle null tripodData.horizontalBorders gracefully', async () => {
      const gameId = 'test-game-id';
      const mockGame = {
        id: gameId,
        gameMode: GameMode.TRIPOD,
        status: GameStatus.ACTIVE,
        version: 1,
        tripodData: {
          horizontalBorders: null, // Null border array
          verticalBorders: [[false]],
          tripodDots: [[]],
        },
      };

      mockManager.findOne.mockResolvedValue(mockGame);

      await expect(
        service.toggleTripodBorder(gameId, 'horizontal', 0, 0),
      ).rejects.toThrow(BadRequestException);

      expect(mockManager.findOne).toHaveBeenCalledWith(
        Game,
        expect.objectContaining({
          where: { id: gameId },
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });

    it('should handle undefined tripodData.horizontalBorders row', async () => {
      const gameId = 'test-game-id';
      const mockGame = {
        id: gameId,
        gameMode: GameMode.TRIPOD,
        status: GameStatus.ACTIVE,
        version: 1,
        tripodData: {
          horizontalBorders: [[true]], // Row 0 exists
          // Row 1 doesn't exist
          verticalBorders: [[false]],
          tripodDots: [[]],
        },
      };

      mockManager.findOne.mockResolvedValue(mockGame);

      // Try to access row 1 which doesn't exist
      await expect(
        service.toggleTripodBorder(gameId, 'horizontal', 1, 0),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate bounds before accessing arrays', async () => {
      const gameId = 'test-game-id';
      const mockGame = {
        id: gameId,
        gameMode: GameMode.TRIPOD,
        status: GameStatus.ACTIVE,
        version: 1,
        tripodData: {
          horizontalBorders: [[true, false]], // 2 columns
          verticalBorders: [[false, true, false]],
          tripodDots: [[]],
        },
      };

      mockManager.findOne.mockResolvedValue(mockGame);

      // Try to access column index out of bounds
      await expect(
        service.toggleTripodBorder(gameId, 'horizontal', 0, 5),
      ).rejects.toThrow(BadRequestException);
    });
  });
});


