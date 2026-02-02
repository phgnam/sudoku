# Storybook Usage Guide

This project includes Storybook 10 for component development and documentation.

## Getting Started

To run Storybook locally:

```bash
pnpm storybook
```

This will start the dev server at `http://localhost:6006`.

## Building Static Storybook

To build a static version for deployment:

```bash
pnpm build-storybook
```

The output will be in the `storybook-static` directory.

## Directory Structure

- `.storybook/`: Configuration files (`main.ts`, `preview.tsx`)
- `components/`: Components and their stories are co-located
  - `MyComponent.tsx`
  - `MyComponent.stories.tsx`

## Writing Stories

We use the Component Story Format (CSF) 3.0.

Example `MyComponent.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./MyComponent";

const meta = {
  title: "Category/MyComponent",
  component: MyComponent,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // default props
  },
};

export const Variant: Story = {
  args: {
    // variant specific props
  },
};
```

## Features

### Tailwind CSS

Storybook is configured with full Tailwind CSS v4 support using the same configuration as the Next.js app.

### Themes

You can toggle between Dark/Light mode using the toolbar. Theme color switching (Blue/Green/Orange) is currently configured via `globals.css` but not exposed in the Storybook toolbar.

### Viewports

Use the viewport toolbar to test components on different screen sizes (Mobile, Tablet, Desktop).

### Accessibility

The a11y addon is installed. Check the Accessibility panel to catch common accessibility issues.
