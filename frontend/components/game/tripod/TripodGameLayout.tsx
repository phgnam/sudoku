/**
 * TripodGameLayout Component
 * Wraps the tripod game with responsive layout
 */

"use client";

import React from "react";

interface TripodGameLayoutProps {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  controls?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
}

export function TripodGameLayout({
  children,
  topBar,
  controls,
  sidebar,
  footer,
}: TripodGameLayoutProps) {
  return (
    <main className="min-h-screen bg-clean-light dark:bg-clean-dark">
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Top Info Bar */}
        {topBar}

        {/* Controls Section */}
        {controls && <div className="mb-6">{controls}</div>}

        {/* Main Game Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Grid Container */}
          <div className="flex-1">{children}</div>

          {/* Sidebar (Stats, Instructions, etc) */}
          {sidebar && (
            <div className="lg:w-80 flex flex-col gap-4">{sidebar}</div>
          )}
        </div>

        {/* Footer (Additional info, completion, etc) */}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </main>
  );
}

