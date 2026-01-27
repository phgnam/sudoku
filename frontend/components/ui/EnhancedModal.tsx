"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "./Modal";

interface EnhancedModalProps {
  isOpen: boolean;
  type: "success" | "failure";
  stats?: {
    time: number;
    hints: number;
    mistakes: number;
    difficulty: string;
  };
  onNewGame: () => void;
  onClose?: () => void;
}

export function EnhancedModal({
  isOpen,
  type,
  stats,
  onNewGame,
  onClose,
}: EnhancedModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const t = useTranslations();

  useEffect(() => {
    if (isOpen && type === "success") {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, type]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Shared styles
  const statRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0",
  };

  const statLabelStyle: React.CSSProperties = {
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  const statValueStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: "1.125rem",
    color: "#111827",
  };

  const primaryButtonStyle: React.CSSProperties = {
    width: "100%",
    background: type === "success"
      ? "linear-gradient(to right, #2563eb, #4f46e5)"
      : "linear-gradient(to right, #ef4444, #e11d48)",
    color: "white",
    fontWeight: 600,
    padding: "0.875rem 1.5rem",
    borderRadius: "0.75rem",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    fontSize: "1rem",
    position: "relative",
    zIndex: 10,
  };

  const secondaryButtonStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    fontWeight: 600,
    padding: "0.875rem 1.5rem",
    borderRadius: "0.75rem",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    position: "relative",
    zIndex: 10,
  };

  return (
    <Modal isOpen={isOpen} size="md">
      {type === "success" ? (
        <div style={{ padding: "2rem" }}>
          {/* Confetti Effect */}
          {showConfetti && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: "1rem" }}>
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="animate-confetti"
                  style={{
                    position: "absolute",
                    left: `${Math.random() * 100}%`,
                    top: "-10%",
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                >
                  {["🎉", "🎊", "✨", "⭐", "🌟"][Math.floor(Math.random() * 5)]}
                </div>
              ))}
            </div>
          )}

          {/* Success Content */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem", position: "relative" }}>
            <div style={{ fontSize: "4.5rem", marginBottom: "1rem" }} aria-hidden="true">🎉</div>
            <h2 id="modal-title" style={{ fontSize: "1.875rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>
              {t('game.modal.success.title')}
            </h2>
            <p style={{ color: "#6b7280" }}>
              {t('game.modal.success.subtitle')}
            </p>
          </div>

          {/* Stats Display */}
          {stats && (
            <div style={{
              background: "linear-gradient(to bottom right, #f9fafb, #f3f4f6)",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}>
              <div style={statRowStyle}>
                <span style={statLabelStyle}>
                  <span>📊</span> {t('game.modal.success.difficulty')}
                </span>
                <span style={statValueStyle}>{stats.difficulty}</span>
              </div>
              <div style={statRowStyle}>
                <span style={statLabelStyle}>
                  <span>⏱️</span> {t('game.modal.success.time')}
                </span>
                <span style={{ ...statValueStyle, fontFamily: "monospace" }}>{formatTime(stats.time)}</span>
              </div>
              <div style={statRowStyle}>
                <span style={statLabelStyle}>
                  <span>💡</span> {t('game.modal.success.hintsUsed')}
                </span>
                <span style={statValueStyle}>{stats.hints}/3</span>
              </div>
              <div style={statRowStyle}>
                <span style={statLabelStyle}>
                  <span>❌</span> {t('game.modal.success.mistakes')}
                </span>
                <span style={statValueStyle}>{stats.mistakes}/3</span>
              </div>

              {stats.time < 300 && stats.hints === 0 && stats.mistakes === 0 && (
                <div style={{ paddingTop: "1rem", borderTop: "1px solid #e5e7eb", marginTop: "0.5rem" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    color: "#ca8a04",
                    backgroundColor: "#fefce8",
                    borderRadius: "0.5rem",
                    padding: "0.5rem",
                  }}>
                    <span style={{ fontSize: "1.5rem" }}>⭐</span>
                    <span style={{ fontWeight: 600 }}>{t('game.modal.success.perfect')}</span>
                    <span style={{ fontSize: "1.5rem" }}>⭐</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", position: "relative", zIndex: 10 }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNewGame();
              }}
              style={primaryButtonStyle}
            >
              {t('game.modal.success.playAgain')}
            </button>
            {onClose && (
              <button type="button" onClick={onClose} style={secondaryButtonStyle}>
                {t('game.modal.success.backToHome')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: "2rem" }}>
          {/* Failure Content */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "4.5rem", marginBottom: "1rem" }} aria-hidden="true">😢</div>
            <h2 id="modal-title" style={{ fontSize: "1.875rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>
              {t('game.modal.failure.title')}
            </h2>
            <p style={{ color: "#6b7280" }}>
              {t('game.modal.failure.subtitle')}
            </p>
          </div>

          {/* Encouragement */}
          <div style={{
            background: "linear-gradient(to bottom right, #eff6ff, #eef2ff)",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            marginBottom: "1.5rem",
            border: "1px solid #dbeafe",
          }}>
            <p
              style={{ fontSize: "0.875rem", color: "#1e40af", textAlign: "center", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: t.raw('game.modal.failure.tip') }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", position: "relative", zIndex: 10 }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNewGame();
              }}
              style={primaryButtonStyle}
            >
              {t('game.modal.failure.tryAgain')}
            </button>
            {onClose && (
              <button type="button" onClick={onClose} style={secondaryButtonStyle}>
                {t('game.modal.failure.backToHome')}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
