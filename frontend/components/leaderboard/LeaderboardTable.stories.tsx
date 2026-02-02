import type { Meta, StoryObj } from "@storybook/react";
import { LeaderboardTable } from "./LeaderboardTable";
import type { LeaderboardEntry } from "@/types/leaderboard";

const meta = {
  title: "Leaderboard/LeaderboardTable",
  component: LeaderboardTable,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    isDark: { control: "boolean" },
  },
} satisfies Meta<typeof LeaderboardTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockEntries: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: "u1",
    username: "SpeedDemon",
    bestTime: 45,
    gamesWon: 120,
  },
  {
    rank: 2,
    userId: "u2",
    username: "PuzzleMaster",
    bestTime: 52,
    gamesWon: 98,
  },
  { rank: 3, userId: "u3", username: "SudokuKing", bestTime: 58, gamesWon: 85 },
  { rank: 4, userId: "u4", username: "LogicLover", bestTime: 65, gamesWon: 72 },
  {
    rank: 5,
    userId: "u5",
    username: "GridGrinder",
    bestTime: 79,
    gamesWon: 50,
  },
  {
    rank: 6,
    userId: "u6",
    username: "NumberNinja",
    bestTime: 92,
    gamesWon: 12,
  },
  {
    rank: 7,
    userId: "u7",
    username: "BrainTeaser",
    bestTime: 120,
    gamesWon: 5,
  },
];

export const Default: Story = {
  args: {
    entries: mockEntries,
    isDark: false,
  },
};

export const DarkMode: Story = {
  args: {
    entries: mockEntries,
    isDark: true,
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-slate-900 p-4 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = {
  args: {
    entries: [],
    isDark: false,
  },
};
