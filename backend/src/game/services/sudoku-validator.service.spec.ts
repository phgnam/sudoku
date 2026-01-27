import { Test, TestingModule } from '@nestjs/testing';
import { SudokuValidatorService } from './sudoku-validator.service';

describe('SudokuValidatorService', () => {
  let service: SudokuValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SudokuValidatorService],
    }).compile();

    service = module.get<SudokuValidatorService>(SudokuValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isValidMove', () => {
    const validBoard = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ];

    it('should validate a correct move', () => {
      const result = service.isValidMove(validBoard, 0, 2, 4);
      expect(result).toBe(true);
    });

    it('should reject duplicate in row', () => {
      const result = service.isValidMove(validBoard, 0, 2, 5); // 5 already in row
      expect(result).toBe(false);
    });

    it('should reject duplicate in column', () => {
      const result = service.isValidMove(validBoard, 0, 2, 8); // 8 in column
      expect(result).toBe(false);
    });

    it('should reject duplicate in 3x3 box', () => {
      const result = service.isValidMove(validBoard, 0, 2, 3); // 3 in same box
      expect(result).toBe(false);
    });
  });

  describe('isComplete', () => {
    it('should detect incomplete board', () => {
      const incompleteBoard = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
      ];
      expect(service.isComplete(incompleteBoard)).toBe(false);
    });

    it('should detect complete board', () => {
      const completeBoard = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
      ];
      expect(service.isComplete(completeBoard)).toBe(true);
    });
  });

  describe('findConflicts', () => {
    it('should find conflict cells', () => {
      const boardWithConflict = [
        [5, 3, 5, 0, 7, 0, 0, 0, 0], // Two 5s in same row
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
      ];

      const conflicts = service.findConflicts(boardWithConflict);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts).toContainEqual({ row: 0, col: 0 });
      expect(conflicts).toContainEqual({ row: 0, col: 2 });
    });

    it('should return empty array for valid board', () => {
      const validBoard = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
      ];

      const conflicts = service.findConflicts(validBoard);
      expect(conflicts).toEqual([]);
    });
  });
});
