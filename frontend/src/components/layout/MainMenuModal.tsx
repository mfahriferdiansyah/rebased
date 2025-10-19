import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Trophy, History, Settings, FileText, LogOut, Layers, Loader2, Lock } from "lucide-react";
import { Strategy } from "@/lib/types/strategy";
import { PlanCard } from "./PlanCard";
import { Paginator } from "@/components/ui/paginator";
import { useStrategy } from "@/hooks/useStrategy";
import { useDelegation } from "@/hooks/useDelegation";
import { ApiStrategy } from "@/lib/types/api-strategy";
import { BlockType, AssetBlock } from "@/lib/types/blocks";
import { useToast } from "@/hooks/use-toast";
import { HistoryView } from "@/components/history/HistoryView";

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
  locked?: boolean;
};

export function MainMenuModal({ open, onOpenChange, onStrategyLoad }: MainMenuModalProps) {
  const [selectedItem, setSelectedItem] = useState<string>("strategies");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { toast } = useToast();

  // Fetch real strategies from backend
  const { strategies, loading, deleteStrategy, refreshStrategies } = useStrategy();
  const { delegations } = useDelegation();

  // Refresh strategies when modal opens
  useEffect(() => {
    if (open) {
      refreshStrategies();
    }
  }, [open, refreshStrategies]);

  // Calculate paginated strategies
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStrategies = strategies.slice(startIndex, endIndex);

  // Convert ApiStrategy to canvas Strategy and load
  const handleStrategyDeploy = (apiStrategy: ApiStrategy) => {
    if (apiStrategy.strategyLogic) {
      const canvasStrategy = apiStrategy.strategyLogic as Strategy;
      onStrategyLoad?.(canvasStrategy);
      onOpenChange(false);
      toast({
        title: 'Strategy Loaded',
        description: `${canvasStrategy.name || 'Strategy'} loaded into canvas`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Strategy has no canvas data',
        variant: 'destructive',
      });
    }
  };

  const handleStart = async (id: string) => {
    // Strategy is activated by creating delegation in wizard
    toast({
      title: 'Not Implemented',
      description: 'Use the START block in canvas to activate strategy',
    });
  };

  const handleStop = async (id: string) => {
    // Strategy is stopped by revoking delegation
    toast({
      title: 'Not Implemented',
      description: 'Use the Delegation Manager to revoke delegation',
    });
  };

  const handleDelete = async (id: string) => {
    const success = await deleteStrategy(id);
    if (success) {
      // Reset to first page if current page becomes empty
      const newTotalPages = Math.ceil((strategies.length - 1) / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: "strategies",
      icon: Layers,
      label: "Strategies",
      description: "Your saved strategies",
      content: (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 flex items-end justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Your Strategies</h3>
              <p className="text-sm text-gray-600 mt-1">
                {strategies.length} {strategies.length === 1 ? 'strategy' : 'strategies'} saved
              </p>
            </div>
            <button
              onClick={() => {
                onOpenChange(false);
              }}
              className="px-3 py-1.5 rounded text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 active:scale-95 transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="text-sm">+</span>
              Create New Strategy
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
                <p className="text-sm text-gray-500">Loading strategies...</p>
              </div>
            ) : strategies.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                  <Layers className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-2">No saved strategies yet</p>
                <p className="text-xs text-gray-400">Create your first strategy on the canvas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedStrategies.map((strategy) => {
                  // Find delegation for this strategy
                  const delegation = delegations.find(d => d.strategyId === strategy.id && d.isActive);

                  // Convert to StrategyWithMetrics format for PlanCard
                  const strategyWithMetrics = {
                    ...strategy.strategyLogic as Strategy,
                    id: strategy.id,
                    name: strategy.strategyLogic?.name || strategy.name || 'Untitled Strategy',
                    description: `${strategy.tokens.length} assets • ${strategy.isActive ? 'Active' : 'Inactive'}`,
                    status: delegation ? 'running' : strategy.isActive ? 'draft' : 'stopped',
                    metrics: {
                      totalValuation: 0, // TODO: Get from portfolio analyzer
                      pnl: 0,
                      trades: 0,
                    },
                    metadata: {
                      createdAt: new Date(strategy.createdAt).getTime(),
                      updatedAt: new Date(strategy.updatedAt).getTime(),
                    },
                  };

                  return (
                    <PlanCard
                      key={strategy.id}
                      strategy={strategyWithMetrics as any}
                      onDeploy={() => handleStrategyDeploy(strategy)}
                      onStart={handleStart}
                      onStop={handleStop}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Pagination Footer */}
          {strategies.length > 0 && (
            <div className="flex-shrink-0 bg-white py-3 px-6 shadow-[0_-1px_4px_rgba(0,0,0,0.06)]">
              <Paginator
                totalItems={strategies.length}
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
      locked: true,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Leaderboard</h3>
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Coming Soon</h4>
                <p className="text-sm text-gray-600 mt-1">
                  This feature is currently under development.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "history",
      icon: History,
      label: "History",
      description: "Your rebalance history",
      content: <HistoryView />,
    },
    {
      id: "docs",
      icon: FileText,
      label: "Documentation",
      description: "Learn how to build",
      locked: true,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Documentation</h3>
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Coming Soon</h4>
                <p className="text-sm text-gray-600 mt-1">
                  This feature is currently under development.
                </p>
              </div>
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
      locked: true,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Settings</h3>
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Coming Soon</h4>
                <p className="text-sm text-gray-600 mt-1">
                  This feature is currently under development.
                </p>
              </div>
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
                const isLocked = item.locked;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (isLocked) {
                        toast({
                          title: 'Feature Locked',
                          description: `${item.label} is currently under development for this hackathon. Stay tuned!`,
                          variant: 'default',
                        });
                      } else {
                        setSelectedItem(item.id);
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg
                      text-left transition-all duration-200
                      ${isSelected
                        ? "bg-gray-900 text-white"
                        : isLocked
                        ? "text-gray-400 cursor-not-allowed opacity-60"
                        : "text-gray-700 hover:bg-gray-100 active:scale-95"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{item.label}</div>
                    </div>
                    {isLocked && (
                      <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
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
