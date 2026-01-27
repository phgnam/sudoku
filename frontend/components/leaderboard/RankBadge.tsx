"use client";

import { memo } from "react";

interface RankBadgeProps {
  rank: number;
  size?: "sm" | "md";
}

export const RankBadge = memo(function RankBadge({
  rank,
  size = "md",
}: RankBadgeProps) {
  const sizeMap = { sm: 20, md: 28 };
  const fontSize = size === "sm" ? "14px" : "18px";

  if (rank === 1) return <span style={{ fontSize }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize }}>🥉</span>;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: sizeMap[size],
        height: sizeMap[size],
        borderRadius: "50%",
        backgroundColor: "#e0e7ff",
        color: "#4f46e5",
        fontSize: size === "sm" ? "12px" : "14px",
        fontWeight: 600,
      }}
    >
      {rank}
    </span>
  );
});

