import type { Meta, StoryObj } from "@storybook/react";
import { ValidationFeedback } from "./ValidationFeedback";
import { fn } from "@storybook/test";
import type { TripodError } from "@/types/tripod";

/**
 * ValidationFeedback component displays validation errors and completion status.
 * Features error pagination when more than 20 errors are present.
 */
const meta = {
  title: "Tripod/ValidationFeedback",
  component: ValidationFeedback,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    isComplete: { control: "boolean" },
  },
  args: {
    onValidate: fn(),
  },
} satisfies Meta<typeof ValidationFeedback>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Helper to create mock errors */
const createMockError = (
  type: TripodError["type"],
  row: number,
  col: number,
  message: string
): TripodError => ({
  type,
  location: { row, col },
  message,
});

/** Default state - no errors yet */
export const Default: Story = {
  args: {
    errors: [],
    isComplete: false,
  },
};

/** Few errors - shows grouped error display */
export const FewErrors: Story = {
  args: {
    errors: [
      createMockError("region_size", 0, 0, "Region has incorrect size"),
      createMockError("not_connected", 1, 1, "Region is not connected"),
      createMockError("tripod_mismatch", 2, 2, "Tripod dot mismatch"),
      createMockError("four_way", 3, 3, "Four-way intersection"),
      createMockError("sudoku_duplicate", 4, 4, "Duplicate number in region"),
    ],
    isComplete: false,
  },
};

/** Many errors - tests pagination (25 errors, shows "Show N more" button) */
export const ManyErrors: Story = {
  args: {
    errors: Array.from({ length: 25 }, (_, i) => {
      const types: TripodError["type"][] = [
        "region_size",
        "not_connected",
        "tripod_mismatch",
        "four_way",
        "sudoku_duplicate",
      ];
      return createMockError(
        types[i % types.length],
        Math.floor(i / 7),
        i % 7,
        `Error ${i + 1}`
      );
    }),
    isComplete: false,
  },
};

/** Maximum errors - stress test with 162 errors (shows "Show 142 more errors" button) */
export const MaximumErrors: Story = {
  args: {
    errors: Array.from({ length: 162 }, (_, i) => {
      const types: TripodError["type"][] = [
        "region_size",
        "not_connected",
        "tripod_mismatch",
        "four_way",
        "sudoku_duplicate",
      ];
      return createMockError(
        types[i % types.length],
        Math.floor(i / 7),
        i % 7,
        `Error ${i + 1}`
      );
    }),
    isComplete: false,
  },
};

/** Completed state - puzzle solved! */
export const CompletedState: Story = {
  args: {
    errors: [],
    isComplete: true,
  },
};

/** Only region errors */
export const RegionErrorsOnly: Story = {
  args: {
    errors: [
      createMockError("region_size", 0, 0, "Region has incorrect size"),
      createMockError("region_size", 1, 1, "Region has incorrect size"),
      createMockError("not_connected", 2, 2, "Region is not connected"),
      createMockError("not_connected", 3, 3, "Region is not connected"),
    ],
    isComplete: false,
  },
};

/** Only tripod errors */
export const TripodErrorsOnly: Story = {
  args: {
    errors: [
      createMockError("tripod_mismatch", 0, 0, "Tripod dot mismatch"),
      createMockError("tripod_mismatch", 1, 1, "Tripod dot mismatch"),
      createMockError("four_way", 2, 2, "Four-way intersection"),
      createMockError("four_way", 3, 3, "Four-way intersection"),
    ],
    isComplete: false,
  },
};

/** Only sudoku errors */
export const SudokuErrorsOnly: Story = {
  args: {
    errors: [
      createMockError("sudoku_duplicate", 0, 0, "Duplicate number in region"),
      createMockError("sudoku_duplicate", 1, 1, "Duplicate number in region"),
      createMockError("sudoku_duplicate", 2, 2, "Duplicate number in region"),
      createMockError("sudoku_duplicate", 3, 3, "Duplicate number in region"),
    ],
    isComplete: false,
  },
};

/** Mixed error types - shows all three categories */
export const MixedErrorTypes: Story = {
  args: {
    errors: [
      createMockError("region_size", 0, 0, "Region has incorrect size"),
      createMockError("tripod_mismatch", 1, 1, "Tripod dot mismatch"),
      createMockError("sudoku_duplicate", 2, 2, "Duplicate number in region"),
      createMockError("not_connected", 3, 3, "Region is not connected"),
      createMockError("four_way", 4, 4, "Four-way intersection"),
    ],
    isComplete: false,
  },
};

