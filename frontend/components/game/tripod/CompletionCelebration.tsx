"use client";

import { useEffect, useState } from "react";

// CSS keyframes for celebration animations
const celebrationKeyframes = `
@keyframes fadeInScale {
  0% { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes confettiFall {
  0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

@keyframes celebrationBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  }

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

interface CompletionCelebrationProps {
  timeTaken: number; // in seconds
  onPlayAgain: () => void;
  isVisible: boolean;
}

// Confetti piece component
function ConfettiPiece({ index }: { index: number }) {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
  ];
  const color = colors[index % colors.length];
  const left = `${(index * 7.3) % 100}%`;
  const delay = `${(index * 0.1) % 2}s`;
  const duration = `${2 + (index % 3)}s`;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 0,
        width: "10px",
        height: "10px",
        backgroundColor: color,
        borderRadius: index % 2 === 0 ? "50%" : "2px",
        animation: `confettiFall ${duration} ease-out ${delay} forwards`,
        zIndex: 60,
      }}
    />
  );
}

export function CompletionCelebration({
  timeTaken,
  onPlayAgain,
  isVisible,
}: CompletionCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Use requestAnimationFrame to avoid synchronous state update warning and ensure animation plays
      requestAnimationFrame(() => {
        setShowConfetti(true);
      });
      // Hide confetti after animation completes
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <style>{celebrationKeyframes}</style>

      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "fadeInScale 400ms ease-out forwards",
        }}
      >
        {/* Confetti */}
        {showConfetti && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
          </div>
        )}

        {/* Modal */}
        <div
          className="bg-white dark:bg-slate-800 rounded-3xl p-10 sm:p-12 text-center shadow-2xl z-50 animate-[fadeInScale_500ms_ease-out_forwards]"
          style={{
            animation: "fadeInScale 500ms ease-out forwards",
          }}
        >
          {/* Trophy Emoji */}
          <div
            style={{
              fontSize: "64px",
              marginBottom: "16px",
              animation: "celebrationBounce 1s ease-in-out infinite",
            }}
          >
            🏆
          </div>

          {/* Success Message */}
          <h2
            style={{
              fontSize: "32px",
              fontWeight: 700,
              marginBottom: "8px",
              background: "linear-gradient(90deg, #14b8a6, #3b82f6, #8b5cf6)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 3s linear infinite",
            }}
          >
            Puzzle Complete!
          </h2>

          <p className="text-base text-slate-500 dark:text-slate-400 mb-6">
            Congratulations! You solved the Tripod puzzle.
          </p>

          {/* Time Display */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 dark:bg-slate-700/50 rounded-xl mb-8">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Time:
            </span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
              {formatTime(timeTaken)}
            </span>
          </div>

          {/* Play Again Button */}
          <div>
            <button
              onClick={onPlayAgain}
              style={{
                padding: "14px 32px",
                fontSize: "16px",
                fontWeight: 600,
                color: "white",
                backgroundColor: "#14b8a6",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#0d9488";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#14b8a6";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default CompletionCelebration;
