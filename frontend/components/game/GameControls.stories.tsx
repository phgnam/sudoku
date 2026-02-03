import type { Meta, StoryObj } from "@storybook/react";
import { GameControls } from "./GameControls";
import { useGameStore } from "@/store/game";
import { useEffect } from "react";
import { fn } from "@storybook/test";

const meta = {
  title: "Game/GameControls",
  component: GameControls,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    canUndo: { control: "boolean" },
    canUseHint: { control: "boolean" },
    canErase: { control: "boolean" },
    notesMode: { control: "boolean" },
  },
  args: {
    onUndo: fn(),
    onHint: fn(),
    onErase: fn(),
    onNewGame: fn(),
    onToggleNotes: fn(),
    canUndo: true,
    canUseHint: true,
    canErase: true,
    notesMode: false,
  },
} satisfies Meta<typeof GameControls>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to set store state
const StoreDecorator = (state: any) => (Story: any) => {
  useEffect(() => {
    useGameStore.setState(state);
  }, []);
  return <Story />;
};

export const Default: Story = {
  decorators: [StoreDecorator({ hintsUsed: 0 })],
};

export const WithHintsUsed: Story = {
  decorators: [StoreDecorator({ hintsUsed: 2 })],
};

export const MaxHintsUsed: Story = {
  decorators: [StoreDecorator({ hintsUsed: 3 })],
  args: {
    canUseHint: false,
  },
};

export const NotesActive: Story = {
  args: {
    notesMode: true,
  },
  decorators: [StoreDecorator({ hintsUsed: 1 })],
};

export const DisabledAll: Story = {
  args: {
    canUndo: false,
    canUseHint: false,
    canErase: false,
  },
  decorators: [StoreDecorator({ hintsUsed: 0 })],
};
