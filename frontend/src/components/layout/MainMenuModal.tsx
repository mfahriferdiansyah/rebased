import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Trophy, History, Settings, FileText, LogOut, Layers } from "lucide-react";
import { Strategy } from "@/lib/types/strategy";
import { PlanCard } from "./PlanCard";
import { mockStrategies, StrategyWithMetrics } from "@/lib/utils/mockStrategies";
import { getSavedStrategies } from "@/lib/utils/strategyStorage";
import { Paginator } from "@/components/ui/paginator";

interface MainMenuModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStrategyLoad?: (strategy: Strategy) => void;
}

type MenuItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  content: React.ReactNode;
};

export function MainMenuModal({ open, onOpenChange, onStrategyLoad }: MainMenuModalProps) {
  const [selectedItem, setSelectedItem] = useState<string>("plans");
  const [plans, setPlans] = useState<StrategyWithMetrics[]>([...mockStrategies, ...getSavedStrategies()]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Calculate paginated plans
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlans = plans.slice(startIndex, endIndex);

  const handleStrategyDeploy = (strategy: StrategyWithMetrics) => {
    onStrategyLoad?.(strategy);
    onOpenChange(false);
  };

  const handleStart = (id: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "running" as const } : p))
    );
    console.log("Start strategy:", id);
    // TODO: API call to start strategy
  };

  const handleStop = (id: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "stopped" as const } : p))
    );
    console.log("Stop strategy:", id);
    // TODO: API call to stop strategy
  };

  const handleDelete = (id: string) => {
    setPlans((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      // Reset to first page if current page becomes empty
      const newTotalPages = Math.ceil(updated.length / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
      return updated;
    });
    console.log("Delete strategy:", id);
    // TODO: API call to delete strategy
  };

  const menuItems: MenuItem[] = [
    {
      id: "plans",
      icon: Layers,
      label: "Plans",
      description: "Your saved strategies",
      content: (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 flex items-end justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Your Plans</h3>
              <p className="text-sm text-gray-600 mt-1">
                Deploy strategies to the canvas and start building
              </p>
            </div>
            <button
              onClick={() => {
                console.log("Create new plan");
                // TODO: Open canvas with empty strategy
              }}
              className="px-3 py-1.5 rounded text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 active:scale-95 transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="text-sm">+</span>
              Create New Plan
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {plans.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                  <Layers className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No saved plans yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    strategy={plan}
                    onDeploy={handleStrategyDeploy}
                    onStart={handleStart}
                    onStop={handleStop}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sticky Pagination Footer */}
          {plans.length > 0 && (
            <div className="flex-shrink-0 bg-white py-3 px-6 shadow-[0_-1px_4px_rgba(0,0,0,0.06)]">
              <Paginator
                totalItems={plans.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: "leaderboard",
      icon: Trophy,
      label: "Leaderboard",
      description: "View top strategies",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Leaderboard</h3>
          <p className="text-sm text-gray-600">View the top performing strategies from the community.</p>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((rank) => (
              <div key={rank} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
                  {rank}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">Strategy {rank}</div>
                  <div className="text-xs text-gray-600">+{Math.floor(Math.random() * 50)}% returns</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "history",
      icon: History,
      label: "History",
      description: "Your strategy history",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Strategy History</h3>
          <p className="text-sm text-gray-600">View and manage your saved strategies.</p>
          <div className="text-center py-8 text-gray-500 text-sm">
            No strategies in history yet
          </div>
        </div>
      ),
    },
    {
      id: "docs",
      icon: FileText,
      label: "Documentation",
      description: "Learn how to build",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Documentation</h3>
          <p className="text-sm text-gray-600">Learn how to build powerful trading strategies.</p>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-semibold text-sm text-gray-900">Getting Started</div>
              <div className="text-xs text-gray-600 mt-1">Learn the basics of building strategies</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-semibold text-sm text-gray-900">Block Types</div>
              <div className="text-xs text-gray-600 mt-1">Understanding different block types</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-semibold text-sm text-gray-900">Advanced Features</div>
              <div className="text-xs text-gray-600 mt-1">Master complex strategies</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      description: "App preferences",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Settings</h3>
          <p className="text-sm text-gray-600">Customize your experience.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-900">Dark Mode</span>
              <div className="w-10 h-6 bg-gray-300 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-900">Notifications</span>
              <div className="w-10 h-6 bg-gray-900 rounded-full"></div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const selectedMenuItem = menuItems.find((item) => item.id === selectedItem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden">
        <div className="flex h-full overflow-hidden">
          {/* Left Menu Panel */}
          <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-300 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-300 flex-shrink-0">
              <h2 className="font-bold text-gray-900">Menu</h2>
              <p className="text-xs text-gray-600 mt-1">Navigate to different sections</p>
            </div>

            {/* Menu Items */}
            <div className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedItem === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item.id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg
                      text-left transition-all duration-200
                      ${isSelected
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100 active:scale-95"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{item.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            <div className="p-3 border-t border-gray-300 flex-shrink-0">
              <button
                onClick={() => {
                  console.log("Logout");
                  onOpenChange(false);
                }}
                className="
                  w-full flex items-center gap-3 p-3 rounded-lg
                  text-gray-700 hover:bg-gray-100 active:scale-95
                  transition-all duration-200
                "
              >
                <LogOut className="w-4 h-4" />
                <span className="font-semibold text-sm">Logout</span>
              </button>
            </div>
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedMenuItem?.content}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
