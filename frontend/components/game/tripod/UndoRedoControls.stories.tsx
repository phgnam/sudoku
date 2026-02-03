import type { Meta, StoryObj } from "@storybook/react";
import { UndoRedoControls } from "./UndoRedoControls";
import { fn } from "@storybook/test";

/**
 * UndoRedoControls component provides undo/redo functionality for border actions.
 * Supports keyboard shortcuts: Ctrl+Z (undo) and Ctrl+Shift+Z/Ctrl+Y (redo).
 * History is limited to 100 moves.
 */
const meta = {
  title: "Tripod/UndoRedoControls",
  component: UndoRedoControls,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    canUndo: {
      control: "boolean",
      description: "Whether undo is available (history exists)",
    },
    canRedo: {
      control: "boolean",
      description: "Whether redo is available (future exists)",
    },
  },
  args: {
    onUndo: fn(),
    onRedo: fn(),
  },
} satisfies Meta<typeof UndoRedoControls>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No history - both buttons disabled (initial state) */
export const NoHistory: Story = {
  args: {
    canUndo: false,
    canRedo: false,
  },
};

/** With undo available - user made some actions */
export const WithUndoAvailable: Story = {
  args: {
    canUndo: true,
    canRedo: false,
  },
};

/** With redo available - user undid some actions */
export const WithRedoAvailable: Story = {
  args: {
    canUndo: false,
    canRedo: true,
  },
};

/** Both available - user in middle of history */
export const BothAvailable: Story = {
  args: {
    canUndo: true,
    canRedo: true,
  },
};

/** History limit - simulates 100 moves (max history) */
export const AtHistoryLimit: Story = {
  args: {
    canUndo: true,
    canRedo: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "When history reaches 100 moves, oldest entries are removed. Undo remains available.",
      },
    },
  },
};

/** After multiple undos - ready to redo */
export const AfterMultipleUndos: Story = {
  args: {
    canUndo: true,
    canRedo: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "After undoing several actions, both undo and redo are available.",
      },
    },
  },
};

/** Fresh start after clear - no history */
export const AfterHistoryClear: Story = {
  args: {
    canUndo: false,
    canRedo: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "When making a new action after undo, redo history is cleared.",
      },
    },
  },
};

