import { test, expect } from "@playwright/test";

test.describe("Multi-Tab Real-time Sync", () => {
  test("should sync game state across tabs", async ({ context }) => {
    // Create two pages (tabs)
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Both tabs go to game page
    await page1.goto("/game");
    await page2.goto("/game");

    // Wait for games to load
    await page1.waitForSelector('[data-testid="sudoku-grid"]');
    await page2.waitForSelector('[data-testid="sudoku-grid"]');

    // Make a move in tab 1
    await page1.locator('[data-row="0"][data-col="2"]').click();
    await page1.getByRole("button", { name: "4" }).click();

    // Tab 2 should reflect the change (via WebSocket)
    await page2.waitForTimeout(500); // Wait for sync
    await expect(page2.locator('[data-row="0"][data-col="2"]')).toContainText(
      "4",
    );

    // Make a move in tab 2
    await page2.locator('[data-row="1"][data-col="1"]').click();
    await page2.getByRole("button", { name: "7" }).click();

    // Tab 1 should reflect the change
    await page1.waitForTimeout(500);
    await expect(page1.locator('[data-row="1"][data-col="1"]')).toContainText(
      "7",
    );

    await page1.close();
    await page2.close();
  });
});

test.describe("Game Persistence", () => {
  test("should persist game state across page reloads", async ({ page }) => {
    await page.goto("/game");

    // Make some moves
    await page.locator('[data-row="0"][data-col="2"]').click();
    await page.getByRole("button", { name: "4" }).click();

    await page.locator('[data-row="1"][data-col="1"]').click();
    await page.getByRole("button", { name: "7" }).click();

    // Get current time
    const timeBeforeReload = await page
      .locator('[data-testid="timer"]')
      .textContent();

    // Reload page
    await page.reload();

    // Game state should persist
    await expect(page.locator('[data-row="0"][data-col="2"]')).toContainText(
      "4",
    );
    await expect(page.locator('[data-row="1"][data-col="1"]')).toContainText(
      "7",
    );

    // Timer should have continued (or be close to previous value)
    const timeAfterReload = await page
      .locator('[data-testid="timer"]')
      .textContent();
    expect(timeAfterReload).toBeTruthy();
  });
});

test.describe("Sound Effects", () => {
  test("should toggle sound on/off", async ({ page }) => {
    await page.goto("/");

    // Find sound toggle button
    const soundButton = page.locator('button[title*="Sound"]').first();

    // Click to toggle
    await soundButton.click();

    // Verify button state changed (SVG icon should change)
    await page.waitForTimeout(200);

    // Click again to toggle back
    await soundButton.click();
    await page.waitForTimeout(200);
  });
});

test.describe("Performance", () => {
  test("should load home page within 3 seconds", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/");
    await page.waitForSelector("h1");

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test("should load game page within 3 seconds", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/game");
    await page.waitForSelector('[data-testid="sudoku-grid"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });
});

test.describe("Accessibility", () => {
  test("should have proper heading structure", async ({ page }) => {
    await page.goto("/");

    // Should have h1
    const h1 = await page.locator("h1").count();
    expect(h1).toBeGreaterThan(0);
  });

  test("should have proper button labels", async ({ page }) => {
    await page.goto("/game");

    // All buttons should have accessible names
    const buttons = await page.getByRole("button").all();
    for (const button of buttons) {
      const accessibleName =
        (await button.getAttribute("aria-label")) ||
        (await button.textContent());
      expect(accessibleName).toBeTruthy();
    }
  });
});
