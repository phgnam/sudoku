import { Injectable } from '@nestjs/common';
import { detectRegions as detectRegionsUtil } from '../../lib/tripod-region-detection';
import type { TripodBorders, Region } from '../../lib/tripod-region-detection';

/**
 * Service responsible for region detection and manipulation
 * - Detect connected regions using BFS
 * - Validate region sizes
 * - Merge and split regions (for puzzle generation)
 */
@Injectable()
export class TripodRegionService {
  /**
   * Detect connected regions using BFS algorithm
   * Uses extracted utility from Phase 03
   */
  detectRegions(borders: TripodBorders, gridSize: number): Region[] {
    return detectRegionsUtil(borders, gridSize);
  }

  /**
   * Validate all regions have exactly gridSize cells
   */
  validateRegionSizes(regions: Region[], gridSize: number): boolean {
    return regions.every((region) => region.size === gridSize);
  }

  /**
   * Get statistics about regions
   */
  getRegionStats(regions: Region[], gridSize: number): {
    count: number;
    minSize: number;
    maxSize: number;
    avgSize: number;
    validSizes: boolean;
  } {
    if (regions.length === 0) {
      return {
        count: 0,
        minSize: 0,
        maxSize: 0,
        avgSize: 0,
        validSizes: false,
      };
    }

    const sizes = regions.map((r) => r.size);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const validSizes = sizes.every((size) => size === gridSize);

    return {
      count: regions.length,
      minSize,
      maxSize,
      avgSize,
      validSizes,
    };
  }

  /**
   * Check if a cell is in a specific region
   */
  isCellInRegion(
    region: Region,
    row: number,
    col: number,
  ): boolean {
    return region.cells.some((cell) => cell.row === row && cell.col === col);
  }

  /**
   * Find which region contains a given cell
   */
  findRegionForCell(
    regions: Region[],
    row: number,
    col: number,
  ): Region | null {
    return regions.find((region) => this.isCellInRegion(region, row, col)) || null;
  }

  /**
   * Convert regions array to 2D grid of region IDs
   * Each cell contains the ID of its region
   */
  regionsToGrid(regions: Region[], gridSize: number): number[][] {
    const grid: number[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => -1),
    );

    regions.forEach((region) => {
      region.cells.forEach(({ row, col }) => {
        grid[row][col] = region.id;
      });
    });

    return grid;
  }

  /**
   * Check if adding a border would split a region
   */
  wouldBorderSplitRegion(
    borders: TripodBorders,
    gridSize: number,
    type: 'h' | 'v',
    row: number,
    col: number,
  ): boolean {
    // Create temporary borders with the new border added
    const tempBorders: TripodBorders = {
      horizontal: borders.horizontal.map((r) => [...r]),
      vertical: borders.vertical.map((r) => [...r]),
    };

    if (type === 'h') {
      tempBorders.horizontal[row][col] = true;
    } else {
      tempBorders.vertical[row][col] = true;
    }

    // Detect regions before and after
    const regionsBefore = this.detectRegions(borders, gridSize);
    const regionsAfter = this.detectRegions(tempBorders, gridSize);

    // If region count increased, a split occurred
    return regionsAfter.length > regionsBefore.length;
  }

  /**
   * Get cells adjacent to a specific cell
   */
  getAdjacentCells(
    row: number,
    col: number,
    gridSize: number,
  ): Array<{ row: number; col: number }> {
    const adjacent: Array<{ row: number; col: number }> = [];

    // Up
    if (row > 0) adjacent.push({ row: row - 1, col });
    // Down
    if (row < gridSize - 1) adjacent.push({ row: row + 1, col });
    // Left
    if (col > 0) adjacent.push({ row, col: col - 1 });
    // Right
    if (col < gridSize - 1) adjacent.push({ row, col: col + 1 });

    return adjacent;
  }
}

