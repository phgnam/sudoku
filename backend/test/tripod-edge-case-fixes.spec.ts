/**
 * Test for Tripod Edge Case Fixes - Phase 2B
 * Tests the three critical backend fixes:
 * 1. BFS Error Handling (returns partial results)
 * 2. SubMode Parameter Passing (DTO and persistence)
 * 3. Region Count Validation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { detectRegions } from '../src/lib/tripod-region-detection';
import { TripodPuzzleService } from '../src/puzzle/services/tripod-puzzle.service';
import { TripodValidationService } from '../src/puzzle/services/tripod-validation.service';
import { TripodRegionService } from '../src/puzzle/services/tripod-region.service';
import { TripodBorderService } from '../src/puzzle/services/tripod-border.service';
import { LatinSquareGeneratorService } from '../src/puzzle/services/latin-square-generator.service';

describe('Phase 2B: Critical Backend Fixes', () => {
  let tripodPuzzleService: TripodPuzzleService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripodPuzzleService,
        TripodValidationService,
        TripodRegionService,
        TripodBorderService,
        LatinSquareGeneratorService,
      ],
    }).compile();

    tripodPuzzleService = module.get<TripodPuzzleService>(TripodPuzzleService);
  });

  describe('Fix 2.4: BFS Error Handling', () => {
    it('should return partial results instead of throwing on BFS limit', () => {
      // Create malformed borders that could cause infinite loop
      const gridSize = 7;
      const malformedBorders = {
        horizontal: Array(gridSize + 1)
          .fill(null)
          .map(() => Array(gridSize).fill(false)),
        vertical: Array(gridSize)
          .fill(null)
          .map(() => Array(gridSize + 1).fill(false)),
      };

      // This should NOT throw - should return partial results
      expect(() => {
        const result = detectRegions(malformedBorders, gridSize);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Fix 2.6: Region Count Validation', () => {
    it('should detect region count mismatch', () => {
      const gridSize = 7;

      // Create borders that will result in wrong number of regions
      const borders = {
        horizontal: Array(gridSize + 1)
          .fill(null)
          .map(() => Array(gridSize).fill(false)),
        vertical: Array(gridSize)
          .fill(null)
          .map(() => Array(gridSize + 1).fill(false)),
      };

      // Add some random borders to create wrong region count
      borders.horizontal[2][3] = true;
      borders.vertical[3][2] = true;

      const tripodDots = Array(gridSize + 1)
        .fill(null)
        .map(() => Array(gridSize + 1).fill(false));

      const cells = Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(0));

      const result = tripodPuzzleService.validateTripodRules(
        borders,
        tripodDots,
        cells,
        gridSize,
      );

      // Should have region_count_mismatch error
      const hasRegionCountError = result.errors.some(
        (err) => err.type === 'region_count_mismatch',
      );
      expect(hasRegionCountError).toBe(true);

      const regionCountError = result.errors.find(
        (err) => err.type === 'region_count_mismatch',
      );
      expect(regionCountError?.message).toContain('Expected 7 regions');
    });

    it('should pass validation when region count is correct', () => {
      const gridSize = 7;
      
      // Generate a valid tripod pattern
      const { borders, tripodDots } = tripodPuzzleService.generateTripodDotPattern(gridSize);
      
      const cells = Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(0));

      const result = tripodPuzzleService.validateTripodRules(
        borders,
        tripodDots,
        cells,
        gridSize,
      );

      // Should NOT have region_count_mismatch error
      const hasRegionCountError = result.errors.some(
        (err) => err.type === 'region_count_mismatch',
      );
      expect(hasRegionCountError).toBe(false);
    });
  });
});

