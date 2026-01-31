"use client";

interface SpectatorGridProps {
  grid: number[][];
  puzzle: number[][];
  size?: "sm" | "md";
}

export function SpectatorGrid({ grid, puzzle, size = "md" }: SpectatorGridProps) {
  const cellSize = size === "sm" ? 32 : 40;
  const fontSize = size === "sm" ? 14 : 16;
  
  const isCellInitial = (row: number, col: number) => puzzle[row][col] !== 0;
  
  const getCellStyle = (row: number, col: number) => {
    const baseStyle: React.CSSProperties = {
      width: cellSize,
      height: cellSize,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize,
      fontWeight: 600,
      borderRight: (col + 1) % 3 === 0 && col < 8 ? "2px solid #374151" : "1px solid #d1d5db",
      borderBottom: (row + 1) % 3 === 0 && row < 8 ? "2px solid #374151" : "1px solid #d1d5db",
      backgroundColor: isCellInitial(row, col) ? "#f3f4f6" : "white",
      color: isCellInitial(row, col) ? "#374151" : "#3b82f6",
    };
    
    return baseStyle;
  };
  
  return (
    <div
      style={{
        display: "inline-block",
        border: "2px solid #374151",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "white",
      }}
    >
      {grid.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: "flex" }}>
          {row.map((cell, colIndex) => (
            <div key={colIndex} style={getCellStyle(rowIndex, colIndex)}>
              {cell !== 0 ? cell : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

