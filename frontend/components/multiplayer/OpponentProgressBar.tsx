"use client";

interface OpponentProgressBarProps {
  opponentName: string;
  filledCount: number;
  totalEmpty: number; // Total cells that need to be filled
}

export function OpponentProgressBar({
  opponentName,
  filledCount,
  totalEmpty,
}: OpponentProgressBarProps) {
  const percentage = totalEmpty > 0 ? Math.round((filledCount / totalEmpty) * 100) : 0;
  
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 16px",
        backgroundColor: "#fff7ed",
        borderRadius: "12px",
        border: "2px solid #fb923c",
        minWidth: "200px",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          backgroundColor: "#fb923c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          color: "white",
          fontWeight: 700,
        }}
      >
        {opponentName.charAt(0).toUpperCase()}
      </div>

      {/* Progress info */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#9a3412",
              maxWidth: "100px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {opponentName}
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#c2410c",
            }}
          >
            {filledCount}/{totalEmpty}
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "8px",
            backgroundColor: "#fed7aa",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percentage}%`,
              backgroundColor: "#fb923c",
              borderRadius: "4px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Percentage */}
      <span
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color: "#ea580c",
          minWidth: "45px",
          textAlign: "right",
        }}
      >
        {percentage}%
      </span>
    </div>
  );
}

