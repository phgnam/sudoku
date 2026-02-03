import type { Meta, StoryObj } from "@storybook/react";
import { NumberPad } from "./NumberPad";
import { fn } from "@storybook/test";

const meta = {
  title: "Shared/NumberPad",
  component: NumberPad,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    maxNumber: { control: { type: "number", min: 1, max: 9 } },
    disabled: { control: "boolean" },
    showCounts: { control: "boolean" },
    isMobile: { control: "boolean" },
  },
  args: {
    onNumberSelect: fn(),
    onErase: fn(),
  },
} satisfies Meta<typeof NumberPad>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClassicMode: Story = {
  args: {
    maxNumber: 9,
    showCounts: true,
    numberCounts: { 1: 2, 2: 9, 3: 5 },
    disabledNumbers: [2],
  },
};

export const TripodMode: Story = {
  args: {
    maxNumber: 7,
    showCounts: false,
    isMobile: false,
  },
};

export const MobileView: Story = {
  args: {
    maxNumber: 9,
    showCounts: false,
    isMobile: true,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile",
    },
  },
};

export const Disabled: Story = {
  args: {
    maxNumber: 9,
    disabled: true,
  },
};
