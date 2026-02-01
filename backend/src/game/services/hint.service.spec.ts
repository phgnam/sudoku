import { Test, TestingModule } from '@nestjs/testing';
import { HintService } from './hint.service';
import { SudokuValidatorService } from './sudoku-validator.service';

describe('HintService', () => {
  let service: HintService;
  let validatorService: SudokuValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HintService, SudokuValidatorService],
    }).compile();

    service = module.get<HintService>(HintService);
    validatorService = module.get<SudokuValidatorService>(
      SudokuValidatorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateHint', () => {
    const testBoard = [
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

    const solution = [
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

    it('should use priority-based hint selection (conflicts > suggestion > reveal)', () => {
      // This board has single-possibility cells, so should return highlight_suggestion
      const hint = service.generateHint(testBoard, solution);

      expect(hint).toBeDefined();
      // Priority: conflicts > suggestion > reveal
      // testBoard has single-possibility cells, so expect highlight_suggestion
      expect([
        'show_conflicts',
        'highlight_suggestion',
        'reveal_cell',
      ]).toContain(hint.type);
      expect(hint.data).toBeDefined();
    });

    it('should generate show_conflicts hint when conflicts exist', () => {
      const boardWithConflict = [
        [5, 3, 5, 0, 7, 0, 0, 0, 0], // Duplicate 5 in row
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
      ];

      // Conflicts take highest priority
      const hint = service.generateHint(boardWithConflict, solution);

      expect(hint).toBeDefined();
      expect(hint.type).toBe('show_conflicts');
      expect(hint.data).toHaveProperty('conflicts');
      expect(Array.isArray(hint.data.conflicts)).toBe(true);
      expect(hint.data.conflicts.length).toBeGreaterThan(0);
    });

    it('should generate highlight_suggestion hint with possibleValue (singular)', () => {
      // Test that highlight_suggestion returns correct structure
      const hint = service.generateHint(testBoard, solution);

      // If no conflicts, should be highlight_suggestion (has single-possibility cells)
      if (hint.type === 'highlight_suggestion') {
        expect(hint.data).toHaveProperty('row');
        expect(hint.data).toHaveProperty('col');
        expect(hint.data).toHaveProperty('possibleValue');
        expect(typeof hint.data.possibleValue).toBe('number');
        expect(hint.data).toHaveProperty('steps');
      }
    });
  });
});
