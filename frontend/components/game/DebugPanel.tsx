"use client";

import { useGameStore } from "@/store/game";
import { useState, useEffect } from "react";

export function DebugPanel() {
  const gameState = useGameStore();
  const hasHydrated = useGameStore((state) => state._hasHydrated);
  const [isVisible, setIsVisible] = useState(false);

  // Load visibility state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("debug-panel-visible");
    if (saved !== null) {
      setIsVisible(saved === "true");
    }
  }, []);

  // Save visibility state to localStorage
  useEffect(() => {
    localStorage.setItem("debug-panel-visible", String(isVisible));
  }, [isVisible]);

  // Keyboard shortcut: Ctrl+D or Cmd+D to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const clearLocalStorage = () => {
    localStorage.removeItem("sudoku-game-storage");
    window.location.reload();
  };

  const showLocalStorage = () => {
    const data = localStorage.getItem("sudoku-game-storage");
    console.log("localStorage data:", data ? JSON.parse(data) : "empty");
    alert("Check console for localStorage data");
  };

  const togglePanel = () => {
    setIsVisible(!isVisible);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={togglePanel}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: isVisible ? "#1e293b" : "#3b82f6",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontSize: "20px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
        title={
          isVisible ? "Hide Debug Panel (Ctrl+D)" : "Show Debug Panel (Ctrl+D)"
        }
      >
        🐛
      </button>

      {/* Debug Panel */}
      {isVisible && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            backgroundColor: "#1e293b",
            color: "white",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "12px",
            maxWidth: "300px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            zIndex: 9999,
          }}
        >
          <h3
            style={{
              margin: "0 0 12px 0",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            🐛 Debug Panel
          </h3>

          <div style={{ marginBottom: "12px" }}>
            <div>
              <strong>Hydrated:</strong> {hasHydrated ? "✅ Yes" : "❌ No"}
            </div>
            <div>
              <strong>Game ID:</strong> {gameState.id || "null"}
            </div>
            <div>
              <strong>Difficulty:</strong> {gameState.difficulty || "null"}
            </div>
            <div>
              <strong>Hints Used:</strong> {gameState.hintsUsed}
            </div>
            <div>
              <strong>Mistakes:</strong> {gameState.mistakes}
            </div>
            <div>
              <strong>Moves:</strong> {gameState.moveHistory.length}
            </div>
            <div>
              <strong>Time:</strong> {Math.floor(gameState.timeElapsed / 60)}:
              {(gameState.timeElapsed % 60).toString().padStart(2, "0")}
            </div>
            <div>
              <strong>Status:</strong> {gameState.status}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={showLocalStorage}
              style={{
                padding: "6px 12px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Show localStorage
            </button>
            <button
              onClick={clearLocalStorage}
              style={{
                padding: "6px 12px",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Clear & Reload
            </button>
          </div>
        </div>
      )}
    </>
  );
}
