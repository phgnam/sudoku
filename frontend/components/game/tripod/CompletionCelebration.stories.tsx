import type { Meta, StoryObj } from "@storybook/react";
import { CompletionCelebration } from "./CompletionCelebration";
import { fn } from "@storybook/test";

/**
 * CompletionCelebration component displays an animated celebration modal
 * when the puzzle is completed, showing the time taken and a "Play Again" button.
 * Features confetti animation and shimmer effects.
 */
const meta = {
  title: "Tripod/CompletionCelebration",
  component: CompletionCelebration,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    timeTaken: {
      control: { type: "number", min: 0, max: 3600 },
      description: "Time taken to complete the puzzle (in seconds)",
    },
    isVisible: {
      control: "boolean",
      description: "Whether the celebration modal is visible",
    },
  },
  args: {
    onPlayAgain: fn(),
  },
} satisfies Meta<typeof CompletionCelebration>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default celebration - visible with typical completion time */
export const Default: Story = {
  args: {
    timeTaken: 325, // 5:25
    isVisible: true,
  },
};

/** Quick solve - completed in under 2 minutes */
export const QuickSolve: Story = {
  args: {
    timeTaken: 95, // 1:35
    isVisible: true,
  },
};

/** Long solve - took over 10 minutes */
export const LongSolve: Story = {
  args: {
    timeTaken: 742, // 12:22
    isVisible: true,
  },
};

/** Hidden state - not visible */
export const Hidden: Story = {
  args: {
    timeTaken: 325,
    isVisible: false,
  },
};

/** Just under a minute */
export const UnderOneMinute: Story = {
  args: {
    timeTaken: 57, // 0:57
    isVisible: true,
  },
};

/** Exactly one hour */
export const OneHour: Story = {
  args: {
    timeTaken: 3600, // 60:00
    isVisible: true,
  },
};

