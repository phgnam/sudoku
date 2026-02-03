import type { Meta, StoryObj } from "@storybook/react";
import { TripodGrid } from "./TripodGrid";
import { fn } from "@storybook/test";
import type { Region } from "@/types/tripod";

const meta = {
  title: "Tripod/TripodGrid",
  component: TripodGrid,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    inputMode: { control: "radio", options: ["number", "border"] },
    subMode: { control: "radio", options: ["borders_only", "sudoku_only", "full"] },
    cellSize: { control: { type: "number", min: 30, max: 80 } },
  },
  args: {
    onCellSelect: fn(),
    onBorderToggle: fn(),
    getBorderToggleability: () => "can_toggle_on", // Dummy implementation
  },
} satisfies Meta<typeof TripodGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helpers for mock data
const GRID_SIZE = 7;
const createGrid = <T,>(val: T): T[][] =>
  Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(val));
const createBorders = () =>
  Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(false));
const createDots = () => {
  const dots = Array(GRID_SIZE + 1)
    .fill(null)
    .map(() => Array(GRID_SIZE + 1).fill(false));
  // Add some sample dots
  dots[2][2] = true;
  dots[2][5] = true;
  dots[5][3] = true;
  return dots;
};

const mockCells = createGrid(0);
mockCells[0][0] = 5;
mockCells[3][3] = 7;

const mockGiven = createGrid(false);
mockGiven[0][0] = true;

const mockHorizontalBorders = createBorders();
mockHorizontalBorders[1][1] = true;
mockHorizontalBorders[1][2] = true;

const mockVerticalBorders = createBorders();
mockVerticalBorders[1][1] = true;
mockVerticalBorders[2][1] = true;

const mockRegions: Region[] = [
  {
    id: 1,
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ],
    size: 4,
    color: "#dbeafe", // Blue 100
    isValid: true,
  },
];

export const Default: Story = {
  args: {
    gridSize: GRID_SIZE,
    cells: mockCells,
    givenCells: mockGiven,
    tripodDots: createDots(),
    horizontalBorders: mockHorizontalBorders,
    verticalBorders: mockVerticalBorders,
    regions: [],
    inputMode: "number",
    selectedCell: null,
    errors: [],
  },
};

export const WithRegions: Story = {
  args: {
    ...Default.args,
    regions: mockRegions,
    horizontalBorders: (() => {
      const b = createBorders();
      // Borders around the region roughly
      b[0][0] = true;
      b[0][1] = true; // Top
      b[2][0] = true;
      b[2][1] = true; // Bottom
      return b;
    })(),
    verticalBorders: (() => {
      const b = createBorders();
      b[0][0] = true;
      b[1][0] = true; // Left
      b[0][2] = true;
      b[1][2] = true; // Right
      return b;
    })(),
  },
};

export const BorderMode: Story = {
  args: {
    ...Default.args,
    inputMode: "border",
  },
};

/** SubMode: borders_only - hide numbers, focus on region drawing */
export const SubModeBordersOnly: Story = {
  args: {
    ...Default.args,
    subMode: "borders_only",
    inputMode: "border",
  },
};

/** SubMode: sudoku_only - pre-drawn regions, numbers only */
export const SubModeSudokuOnly: Story = {
  args: {
    ...WithRegions.args,
    subMode: "sudoku_only",
    inputMode: "number",
  },
};

/** SubMode: full - complete Tripod experience (default) */
export const SubModeFull: Story = {
  args: {
    ...WithRegions.args,
    subMode: "full",
    inputMode: "number",
  },
};

