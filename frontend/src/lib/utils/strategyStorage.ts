import { Strategy } from "@/lib/types/strategy";
import { StrategyWithMetrics, StrategyStatus } from "./mockStrategies";

const STORAGE_KEY = "saved-strategies";

export function getSavedStrategies(): StrategyWithMetrics[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading saved strategies:", error);
    return [];
  }
}

export function saveStrategy(
  strategy: Strategy,
  metrics?: { pnl: number; pnlAbsolute: number; totalValuation: number },
  status?: StrategyStatus
): void {
  try {
    const saved = getSavedStrategies();

    const strategyWithMetrics: StrategyWithMetrics = {
      ...strategy,
      status: status || "draft",
      metrics: metrics || {
        pnl: 0,
        pnlAbsolute: 0,
        totalValuation: 0,
      },
    };

    // Check if strategy already exists
    const existingIndex = saved.findIndex((s) => s.id === strategy.id);

    if (existingIndex >= 0) {
      // Update existing
      saved[existingIndex] = strategyWithMetrics;
    } else {
      // Add new
      saved.push(strategyWithMetrics);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (error) {
    console.error("Error saving strategy:", error);
  }
}

export function deleteStrategy(id: string): void {
  try {
    const saved = getSavedStrategies();
    const filtered = saved.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting strategy:", error);
  }
}

export function getStrategyById(id: string): StrategyWithMetrics | null {
  try {
    const saved = getSavedStrategies();
    return saved.find((s) => s.id === id) || null;
  } catch (error) {
    console.error("Error getting strategy by ID:", error);
    return null;
  }
}
