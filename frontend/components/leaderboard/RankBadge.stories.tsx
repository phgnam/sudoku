import type { Meta, StoryObj } from "@storybook/react";
import { RankBadge } from "./RankBadge";

const meta = {
  title: "Leaderboard/RankBadge",
  component: RankBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    rank: { control: { type: "number", min: 1 } },
    size: { control: "radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof RankBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPlace: Story = {
  args: {
    rank: 1,
    size: "md",
  },
};

export const SecondPlace: Story = {
  args: {
    rank: 2,
    size: "md",
  },
};

export const ThirdPlace: Story = {
  args: {
    rank: 3,
    size: "md",
  },
};

export const GenericRank: Story = {
  args: {
    rank: 4,
    size: "md",
  },
};

export const SmallSize: Story = {
  args: {
    rank: 10,
    size: "sm",
  },
};
