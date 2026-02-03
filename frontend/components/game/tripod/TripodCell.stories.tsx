import type { Meta, StoryObj } from "@storybook/react";
import { TripodCell } from "./TripodCell";
import { fn } from "@storybook/test";

const meta = {
  title: "Tripod/TripodCell",
  component: TripodCell,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "number", min: 0, max: 9 } },
    isGiven: { control: "boolean" },
    isSelected: { control: "boolean" },
    hasError: { control: "boolean" },
    regionColor: { control: "color" },
    inputMode: { control: "radio", options: ["number", "border"] },
  },
  args: {
    row: 0,
    col: 0,
    value: 0,
    isGiven: false,
    isSelected: false,
    isHighlighted: false,
    hasError: false,
    onClick: fn(),
    inputMode: "number",
  },
} satisfies Meta<typeof TripodCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const FilledValue: Story = {
  args: {
    value: 5,
  },
};

export const GivenValue: Story = {
  args: {
    value: 3,
    isGiven: true,
  },
};

export const Selected: Story = {
  args: {
    value: 0,
    isSelected: true,
  },
};

export const WithError: Story = {
  args: {
    value: 5,
    hasError: true,
  },
};

export const InRegion: Story = {
  args: {
    value: 0,
    regionColor: "#e0f2fe", // Sky 100
  },
};

/** Border mode - cell shows border preview */
export const BorderModePreview: Story = {
  args: {
    value: 0,
    inputMode: "border",
    isSelected: true,
  },
};

/** Selected in border mode */
export const SelectedInBorderMode: Story = {
  args: {
    value: 5,
    inputMode: "border",
    isSelected: true,
  },
};

/** Highlighted cell (same value as selected) */
export const Highlighted: Story = {
  args: {
    value: 7,
    isHighlighted: true,
  },
};

/** Selected with value and region color */
export const SelectedInRegion: Story = {
  args: {
    value: 5,
    isSelected: true,
    regionColor: "#d1fae5", // Emerald 100
  },
};

/** Error in given cell (invalid state) */
export const ErrorInGiven: Story = {
  args: {
    value: 9,
    isGiven: true,
    hasError: true,
  },
};

/** Large value in small cell */
export const SmallCell: Story = {
  args: {
    value: 9,
  },
  parameters: {
    docs: {
      description: {
        story: "Cell with minimum size for touch devices",
      },
    },
  },
};

