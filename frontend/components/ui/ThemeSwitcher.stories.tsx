import type { Meta, StoryObj } from "@storybook/react";
import { ThemeSwitcher } from "./ThemeSwitcher";

const meta = {
  title: "UI/ThemeSwitcher",
  component: ThemeSwitcher,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
