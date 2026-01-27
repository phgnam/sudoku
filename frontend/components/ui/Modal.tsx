"use client";

import { useEffect, ReactNode, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  showCloseButton = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const sizeValues = {
    sm: "24rem",
    md: "28rem",
    lg: "32rem",
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 50,
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: sizeValues[size],
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#ffffff",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          animation: "scaleIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              width: "2rem",
              height: "2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: "#f3f4f6",
              border: "none",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <span style={{ color: "#6b7280", fontSize: "1.25rem", lineHeight: 1 }}>
              ×
            </span>
          </button>
        )}
        {children}
      </div>
    </div>
  );

  // Use portal to render directly to body, avoiding any parent CSS issues
  return createPortal(modalContent, document.body);
}

// Modal sub-components for consistent styling
Modal.Header = function ModalHeader({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div style={{ textAlign: "center", padding: "1.5rem", paddingBottom: 0 }}>
      {icon && <div style={{ marginBottom: "1rem" }}>{icon}</div>}
      <h2 id="modal-title" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
        {children}
      </h2>
    </div>
  );
};

Modal.Body = function ModalBody({ children }: { children: ReactNode }) {
  return <div style={{ padding: "1.5rem" }}>{children}</div>;
};

Modal.Footer = function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "1.5rem", paddingTop: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {children}
    </div>
  );
};

