import type { Meta, StoryObj } from "@storybook/react";
import { InputModeToggle } from "./InputModeToggle";
import { fn } from "@storybook/test";

/**
 * InputModeToggle component allows users to switch between Number and Border input modes.
 * Supports keyboard shortcuts: Space (toggle), N (number mode), B (border mode).
 */
const meta = {
  title: "Tripod/InputModeToggle",
  component: InputModeToggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: "radio",
      options: ["number", "border"],
      description: "Current input mode",
    },
    showShortcuts: {
      control: "boolean",
      description: "Whether to show keyboard shortcuts (hidden on mobile)",
    },
  },
  args: {
    onModeChange: fn(),
    showShortcuts: true,
  },
} satisfies Meta<typeof InputModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Number mode selected */
export const NumberMode: Story = {
  args: {
    mode: "number",
  },
};

/** Border mode selected */
export const BorderMode: Story = {
  args: {
    mode: "border",
  },
};

/** Without keyboard shortcuts (mobile view) */
export const WithoutShortcuts: Story = {
  args: {
    mode: "number",
    showShortcuts: false,
  },
};

/** Border mode without shortcuts */
export const BorderModeNoShortcuts: Story = {
  args: {
    mode: "border",
    showShortcuts: false,
  },
};

