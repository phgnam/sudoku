import type { Meta, StoryObj } from "@storybook/react";
import { ToastContainer, toast } from "./Toast";

const meta = {
  title: "UI/Toast",
  component: ToastContainer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ToastContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const ToastDemo = () => {
  return (
    <div className="flex flex-col gap-4 p-4">
      <ToastContainer />
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => toast.success("Operation successful!", 3000)}
          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
        >
          Success Toast
        </button>
        <button
          onClick={() => toast.error("Something went wrong", 3000)}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
        >
          Error Toast
        </button>
        <button
          onClick={() => toast.warning("Warning: Check connections", 3000)}
          className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
        >
          Warning Toast
        </button>
        <button
          onClick={() => toast.info("New updates available", 3000)}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
        >
          Info Toast
        </button>
      </div>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <ToastDemo />,
};
