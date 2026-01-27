"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface TutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

type TutorialStepKey = "welcome" | "selectCell" | "enterNumber" | "notes" | "hints" | "undo" | "mistakes" | "ready";

interface TutorialStepConfig {
  key: TutorialStepKey;
  highlight: string | null;
  icon: string;
}

const tutorialStepConfigs: TutorialStepConfig[] = [
  { key: "welcome", highlight: "grid", icon: "🎯" },
  { key: "selectCell", highlight: "cell", icon: "👆" },
  { key: "enterNumber", highlight: "numberpad", icon: "🔢" },
  { key: "notes", highlight: "notes", icon: "📝" },
  { key: "hints", highlight: "hint", icon: "💡" },
  { key: "undo", highlight: "undo", icon: "↩️" },
  { key: "mistakes", highlight: "mistakes", icon: "❌" },
  { key: "ready", highlight: null, icon: "🚀" },
];

export function Tutorial({ onComplete, onSkip }: TutorialProps) {
  const t = useTranslations();
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const stepConfig = tutorialStepConfigs[currentStep];
  const isLastStep = currentStep === tutorialStepConfigs.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!mounted) return null;

  const tutorialContent = (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      style={{ animation: "fadeIn 0.2s ease-out" }}
    >
      {/* Tutorial Card */}
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl"
        style={{ animation: "scaleIn 0.2s ease-out" }}
      >
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('game.tutorial.step', { current: currentStep + 1, total: tutorialStepConfigs.length })}
            </span>
            <button
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('game.tutorial.skip')}
            </button>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep + 1) / tutorialStepConfigs.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="text-7xl">{stepConfig.icon}</div>
        </div>

        {/* Content */}
        <div className="mb-8 text-center">
          <h2 id="tutorial-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t(`game.tutorial.steps.${stepConfig.key}.title`)}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
            {t(`game.tutorial.steps.${stepConfig.key}.content`)}
          </p>
        </div>

        {/* Visual Highlight */}
        <div className="mb-8 flex justify-center">
          {stepConfig.highlight === "grid" && (
            <div className="grid grid-cols-3 gap-1.5 w-36 h-36">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-lg border border-blue-200 dark:border-blue-700"
                />
              ))}
            </div>
          )}
          {stepConfig.highlight === "cell" && (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl border-4 border-blue-600 animate-pulse shadow-lg shadow-blue-500/50" />
          )}
          {stepConfig.highlight === "numberpad" && (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <div
                  key={num}
                  className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center font-bold text-lg text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
                >
                  {num}
                </div>
              ))}
            </div>
          )}
          {stepConfig.highlight === "notes" && (
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-xl border-2 border-purple-300 dark:border-purple-600 p-1">
              <div className="grid grid-cols-3 gap-0.5 h-full">
                {[1, 2, "", 4, "", 6, "", 8, 9].map((n, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-xs text-purple-600 dark:text-purple-300 font-medium"
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
          )}
          {stepConfig.highlight === "hint" && (
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-300 to-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-pulse">
                <span className="text-3xl">💡</span>
              </div>
            </div>
          )}
          {stepConfig.highlight === "undo" && (
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">↩️</span>
            </div>
          )}
          {stepConfig.highlight === "mistakes" && (
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    i <= 2
                      ? "bg-red-100 dark:bg-red-900/50 text-red-500"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                  }`}
                >
                  ❌
                </div>
              ))}
            </div>
          )}
          {!stepConfig.highlight && (
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50 animate-bounce">
              <span className="text-4xl">✓</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
          >
            {t('game.tutorial.previous')}
          </button>
          <button
            onClick={handleNext}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            {isLastStep ? t('game.tutorial.startPlaying') : t('game.tutorial.next')}
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render directly to body
  return createPortal(tutorialContent, document.body);
}
