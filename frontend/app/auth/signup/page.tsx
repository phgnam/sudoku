"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { api, fetchApi } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const t = useTranslations();
  const { setAuth } = useAuthStore();
  const { colorMode } = useUIStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && colorMode === "dark";

  const colors = {
    bg: isDark
      ? "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)"
      : "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)",
    cardBg: isDark ? "#1e293b" : "white",
    cardBorder: isDark ? "#4f46e5" : "#c7d2fe",
    title: isDark ? "#e0e7ff" : "#1e1b4b",
    subtitle: isDark ? "#a5b4fc" : "#6366f1",
    text: isDark ? "#94a3b8" : "#64748b",
    inputBg: isDark ? "#0f172a" : "white",
    inputBorder: isDark ? "#4f46e5" : "#c7d2fe",
    inputText: isDark ? "#e0e7ff" : "#1e1b4b",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    border: `2px solid ${colors.inputBorder}`,
    backgroundColor: colors.inputBg,
    color: colors.inputText,
    fontSize: "16px",
    outline: "none",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t('auth.signup.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.signup.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchApi<{ accessToken: string; user: any }>(
        api.auth.register(),
        { method: "POST", body: JSON.stringify({ email, password, username }) },
      );
      setAuth(response.user, response.accessToken);
      router.push("/game");
    } catch (err: any) {
      setError(err.message || t('auth.signup.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div style={{ maxWidth: "400px", width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, color: colors.title, marginBottom: "8px" }}>
            {t('auth.signup.title')}
          </h1>
          <p style={{ fontSize: "16px", color: colors.subtitle }}>
            {t('auth.signup.subtitle')}
          </p>
        </div>

        {/* Signup Form */}
        <div
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: "16px",
            padding: "32px",
            border: `2px solid ${colors.cardBorder}`,
            boxShadow: isDark ? "0 10px 25px rgba(0, 0, 0, 0.3)" : "0 10px 25px rgba(79, 70, 229, 0.15)",
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: colors.title, marginBottom: "8px" }}>
                {t('auth.signup.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={inputStyle}
                placeholder="johndoe"
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: colors.title, marginBottom: "8px" }}>
                {t('auth.signup.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: colors.title, marginBottom: "8px" }}>
                {t('auth.signup.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: colors.title, marginBottom: "8px" }}>
                {t('auth.signup.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  backgroundColor: isDark ? "#7f1d1d" : "#fef2f2",
                  border: `1px solid ${isDark ? "#ef4444" : "#fecaca"}`,
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "20px",
                }}
              >
                <p style={{ fontSize: "14px", color: isDark ? "#fca5a5" : "#dc2626" }}>{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                backgroundColor: isLoading ? "#fdba74" : "#f97316",
                color: "white",
                fontWeight: 600,
                padding: "14px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? t('common.loading') : t('auth.signup.submit')}
            </button>
          </form>

          {/* Links */}
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: colors.text }}>
              {t('auth.signup.hasAccount')}{" "}
              <Link href="/auth/login" style={{ color: "#818cf8", fontWeight: 600 }}>
                {t('auth.signup.signIn')}
              </Link>
            </p>
          </div>

          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <Link href="/" style={{ fontSize: "14px", color: colors.text }}>
              {t('common.backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
