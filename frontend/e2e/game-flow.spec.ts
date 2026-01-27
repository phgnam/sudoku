import { test, expect } from "@playwright/test";

test.describe("Game Flow - Anonymous User", () => {
  test("should complete full game flow as anonymous user", async ({ page }) => {
    // Navigate to home page
    await page.goto("/");

    // Should see difficulty selection
    await expect(page.getByRole("heading", { name: /sudoku/i })).toBeVisible();

    // Start Easy game
    await page.getByRole("button", { name: /easy/i }).click();

    // Should be on game page
    await expect(page).toHaveURL(/\/game/);

    // Wait for game board to load
    await expect(page.locator('[data-testid="sudoku-grid"]')).toBeVisible();

    // Select an empty cell
    const emptyCell = page.locator('[data-row="0"][data-col="2"]');
    await emptyCell.click();

    // Cell should be highlighted
    await expect(emptyCell).toHaveClass(/selected/);

    // Place a number
    await page.getByRole("button", { name: "4" }).click();

    // Number should appear in cell
    await expect(emptyCell).toContainText("4");

    // Test undo
    await page.getByRole("button", { name: /undo/i }).click();

    // Cell should be empty again
    await expect(emptyCell).not.toContainText("4");

    // Test hint
    const hintsUsed = await page
      .locator('[data-testid="hints-used"]')
      .textContent();
    await page.getByRole("button", { name: /hint/i }).click();

    // Hints counter should increment
    await expect(page.locator('[data-testid="hints-used"]')).not.toHaveText(
      hintsUsed!,
    );

    // Timer should be running
    await page.waitForTimeout(1000);
    const timer = await page.locator('[data-testid="timer"]').textContent();
    expect(timer).toBeTruthy();
  });

  test("should show game over modal after 3 mistakes", async ({ page }) => {
    await page.goto("/game");

    // Make 3 intentional mistakes
    for (let i = 0; i < 3; i++) {
      const cell = page.locator(`[data-row="${i}"][data-col="2"]`);
      await cell.click();
      await page.getByRole("button", { name: "9" }).click(); // Wrong value
    }

    // Game over modal should appear
    await expect(
      page.getByRole("heading", { name: /game over/i }),
    ).toBeVisible();
    await expect(page.getByText(/3 mistakes/i)).toBeVisible();
  });
});

test.describe("Theme System", () => {
  test("should switch themes and persist", async ({ page }) => {
    await page.goto("/");

    // Get initial theme
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");

    // Find theme switcher (assuming it's visible)
    const themeButton = page
      .locator(
        'button[title*="Ocean Blue"], button[title*="Forest Green"], button[title*="Sunset Orange"]',
      )
      .first();
    await themeButton.click();

    // Theme class should change
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);

    // Reload and verify persistence
    await page.reload();
    const persistedClass = await html.getAttribute("class");
    expect(persistedClass).toBe(newClass);
  });

  test("should toggle dark mode", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");

    // Find dark mode toggle
    const darkModeButton = page
      .locator('button[title*="Dark Mode"], button[title*="Light Mode"]')
      .first();
    await darkModeButton.click();

    // Should have dark class
    const classList = await html.getAttribute("class");
    expect(classList).toContain("dark");
  });
});

test.describe("Tutorial Mode", () => {
  test("should show tutorial for new users", async ({ context, page }) => {
    // Clear storage to simulate new user
    await context.clearCookies();
    await context.clearPermissions();

    await page.goto("/game");

    // Tutorial should appear
    await expect(
      page.getByRole("heading", { name: /welcome to sudoku/i }),
    ).toBeVisible();

    // Should show step 1
    await expect(page.getByText(/step 1 of/i)).toBeVisible();

    // Click next
    await page.getByRole("button", { name: /next/i }).click();

    // Should show step 2
    await expect(page.getByText(/step 2 of/i)).toBeVisible();

    // Skip tutorial
    await page.getByRole("button", { name: /skip/i }).click();

    // Tutorial should close
    await expect(
      page.getByRole("heading", { name: /welcome to sudoku/i }),
    ).not.toBeVisible();
  });
});

test.describe("Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test("should be playable on mobile", async ({ page }) => {
    await page.goto("/game");

    // Grid should be visible and sized appropriately
    const grid = page.locator('[data-testid="sudoku-grid"]');
    await expect(grid).toBeVisible();

    const gridBox = await grid.boundingBox();
    expect(gridBox!.width).toBeLessThan(375);
    expect(gridBox!.width).toBeGreaterThan(300);

    // Number pad should be visible
    await expect(page.getByRole("button", { name: "1" })).toBeVisible();

    // Touch targets should be large enough (44x44px minimum)
    const button = page.getByRole("button", { name: "1" });
    const buttonBox = await button.boundingBox();
    expect(buttonBox!.width).toBeGreaterThanOrEqual(40);
    expect(buttonBox!.height).toBeGreaterThanOrEqual(40);
  });
});
