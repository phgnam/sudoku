import type { Meta, StoryObj } from "@storybook/react";
import { Timer } from "./Timer";

const meta = {
  title: "Shared/Timer",
  component: Timer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: "select",
      options: ["classic", "tripod"],
    },
    elapsedTime: { control: "number" },
    isPaused: { control: "boolean" },
    gameId: { control: "text" },
  },
} satisfies Meta<typeof Timer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Classic mode relies on store, might be tricky without mock store,
// so we focus on Tripod mode which is controlled.
export const TripodMode: Story = {
  args: {
    mode: "tripod",
    elapsedTime: 125, // 02:05
    isPaused: false,
  },
};

export const TripodPaused: Story = {
  args: {
    mode: "tripod",
    elapsedTime: 300, // 05:00
    isPaused: true,
  },
};
