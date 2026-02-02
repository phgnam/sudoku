import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "./Modal";
import { fn } from "@storybook/test";
import { useState } from "react";

const meta = {
  title: "UI/Modal",
  component: Modal,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    showCloseButton: { control: "boolean" },
    isOpen: { control: "boolean" },
  },
  args: {
    onClose: fn(),
    isOpen: true,
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

const ModalWithContent = (args: any) => {
  return (
    <Modal {...args}>
      <Modal.Header>Modal Title</Modal.Header>
      <Modal.Body>
        <p className="text-gray-600 dark:text-gray-300">
          This is a modal body with some content. It demonstrates how the modal
          looks specifically with text content.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
          Cancel
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Confirm
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export const Default: Story = {
  render: (args) => <ModalWithContent {...args} />,
  args: {
    size: "md",
    showCloseButton: true,
  },
};

export const Small: Story = {
  render: (args) => <ModalWithContent {...args} />,
  args: {
    size: "sm",
    showCloseButton: true,
  },
};

export const Large: Story = {
  render: (args) => <ModalWithContent {...args} />,
  args: {
    size: "lg",
    showCloseButton: true,
  },
};
