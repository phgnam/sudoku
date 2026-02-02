import type { Meta, StoryObj } from "@storybook/react";
import { SudokuGrid } from "./SudokuGrid";
import { useGameStore } from "@/store/game";
import { useEffect } from "react";
import { fn } from "@storybook/test";

const meta = {
  title: "Game/SudokuGrid",
  component: SudokuGrid,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    selectedCell: { control: "object" },
    competitive: { control: "boolean" },
  },
  args: {
    onCellSelect: fn(),
    selectedCell: null,
    highlightedCells: [],
    errorCells: [],
  },
} satisfies Meta<typeof SudokuGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create empty grid
const createEmptyGrid = () =>
  Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));
const createEmptyNotes = () =>
  Array(9)
    .fill(null)
    .map(() =>
      Array(9)
        .fill(null)
        .map(() => []),
    );

// Sample puzzle data
const sampleInitial = [
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

const sampleCurrent = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 5, 3, 0, 0, 1], // Added '5' in center
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

// Helper decorator
const StoreDecorator = (state: any) => (Story: any) => {
  useEffect(() => {
    useGameStore.setState({
      currentState: createEmptyGrid(),
      initialState: createEmptyGrid(),
      notes: createEmptyNotes(),
      wrongCells: [],
      ...state,
    });
  }, []);
  return <Story />;
};

export const Empty: Story = {
  decorators: [StoreDecorator({})],
};

export const InProgress: Story = {
  decorators: [
    StoreDecorator({
      initialState: sampleInitial,
      currentState: sampleCurrent,
    }),
  ],
  args: {
    selectedCell: { row: 4, col: 4 },
  },
};

export const WithNotes: Story = {
  decorators: [
    StoreDecorator({
      initialState: sampleInitial,
      currentState: sampleCurrent,
      notes: (() => {
        const n = createEmptyNotes();
        n[0][2] = [1, 2, 4]; // Some notes in top-left empty cell
        n[0][3] = [2, 6];
        return n;
      })(),
    }),
  ],
  args: {
    selectedCell: { row: 0, col: 2 },
  },
};

export const WithErrors: Story = {
  decorators: [
    StoreDecorator({
      initialState: sampleInitial,
      currentState: sampleCurrent,
      wrongCells: [
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ],
    }),
  ],
  args: {
    errorCells: [
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ],
    highlightedCells: [
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ],
  },
};

export const CompetitiveOpponent: Story = {
  decorators: [
    StoreDecorator({
      initialState: sampleInitial,
      currentState: sampleCurrent,
    }),
  ],
  args: {
    competitive: true,
    opponentCells: new Set(["0,2", "0,3"]),
  },
};
