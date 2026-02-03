import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

import { NextIntlClientProvider } from "next-intl";
import enMessages from "../messages/en.json";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile",
          styles: { width: "375px", height: "667px" },
        },
        tablet: {
          name: "Tablet",
          styles: { width: "768px", height: "1024px" },
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1440px", height: "900px" },
        },
      },
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#0f172a" },
      ],
    },
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="font-body text-slate-900 dark:text-slate-100 dark:bg-slate-950 min-h-screen p-4">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};

export default preview;
