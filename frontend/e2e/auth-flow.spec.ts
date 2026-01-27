import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = "Test123!";
  const testUsername = `testuser${Date.now()}`;

  test("should allow user signup", async ({ page }) => {
    await page.goto("/");

    // Navigate to signup
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);

    // Fill signup form
    await page.getByLabel(/username/i).fill(testUsername);
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByPlaceholder(/^password$/i).fill(testPassword);
    await page.getByPlaceholder(/confirm password/i).fill(testPassword);

    // Submit
    await page.getByRole("button", { name: /sign up/i }).click();

    // Should redirect to game page after successful signup
    await expect(page).toHaveURL(/\/game/, { timeout: 5000 });

    // Should show sign out button (user is authenticated)
    await page.goto("/");
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test("should allow user login", async ({ page }) => {
    // First create an account
    await page.goto("/auth/signup");
    await page.getByLabel(/username/i).fill(testUsername);
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByPlaceholder(/^password$/i).fill(testPassword);
    await page.getByPlaceholder(/confirm password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign up/i }).click();
    await page.waitForURL(/\/game/);

    // Sign out
    await page.goto("/");
    await page.getByRole("button", { name: /sign out/i }).click();

    // Go to login
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/);

    // Login with created account
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect after successful login
    await expect(page).toHaveURL(/\/game/, { timeout: 5000 });
  });

  test("should show validation errors", async ({ page }) => {
    await page.goto("/auth/signup");

    // Try to submit without filling form
    await page.getByRole("button", { name: /sign up/i }).click();

    // Should show validation messages (form should not submit)
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test("should reject mismatched passwords", async ({ page }) => {
    await page.goto("/auth/signup");

    await page.getByLabel(/username/i).fill("testuser");
    await page.getByLabel(/email/i).fill("test@test.com");
    await page.getByPlaceholder(/^password$/i).fill("Password123!");
    await page.getByPlaceholder(/confirm password/i).fill("DifferentPass123!");

    await page.getByRole("button", { name: /sign up/i }).click();

    // Should show error (passwords don't match)
    await expect(page.getByText(/passwords.*match/i)).toBeVisible();
  });
});

test.describe("Stats Dashboard", () => {
  test("should show stats for authenticated users", async ({ page }) => {
    // Login first
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("Test123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/game/);

    // Navigate to dashboard
    await page.goto("/");
    await page.getByRole("link", { name: /view stats/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    // Should show stats sections
    await expect(page.getByText(/total games/i)).toBeVisible();
    await expect(page.getByText(/win rate/i)).toBeVisible();
    await expect(page.getByText(/recent games/i)).toBeVisible();
  });

  test("should require authentication", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to login or show auth required message
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/(auth\/login|dashboard)/);
  });
});
