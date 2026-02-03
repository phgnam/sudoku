import type { Meta, StoryObj } from "@storybook/react";
import { SubModeSelector } from "./SubModeSelector";
import { fn } from "@storybook/test";

/**
 * SubModeSelector component allows users to choose between different Tripod game modes:
 * - Borders Only: Draw regions without numbers
 * - Sudoku Only: Solve with pre-drawn regions
 * - Full Tripod: Complete experience with both borders and numbers
 */
const meta = {
  title: "Tripod/SubModeSelector",
  component: SubModeSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    currentMode: {
      control: "radio",
      options: ["borders_only", "sudoku_only", "full"],
      description: "Currently selected mode",
    },
    disabled: {
      control: "boolean",
      description: "Whether the selector is disabled",
    },
  },
  args: {
    onModeSelect: fn(),
    disabled: false,
  },
} satisfies Meta<typeof SubModeSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Borders Only mode selected */
export const BordersOnly: Story = {
  args: {
    currentMode: "borders_only",
  },
};

/** Sudoku Only mode selected */
export const SudokuOnly: Story = {
  args: {
    currentMode: "sudoku_only",
  },
};

/** Full Tripod mode selected (default) */
export const Full: Story = {
  args: {
    currentMode: "full",
  },
};

/** Disabled state - mode cannot be changed during game */
export const Disabled: Story = {
  args: {
    currentMode: "full",
    disabled: true,
  },
};

/** Borders Only disabled - locked during gameplay */
export const BordersOnlyDisabled: Story = {
  args: {
    currentMode: "borders_only",
    disabled: true,
  },
};

