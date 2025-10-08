import React, { useMemo } from "react";
import { Strategy } from "@/lib/types/strategy";
import { Block, BlockType } from "@/lib/types/blocks";
import { StrategyValidator } from "@/lib/engine/Validator";
import { serializeStrategy, downloadJSON } from "@/lib/utils/serialization";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

interface StrategyPreviewProps {
  strategy: Strategy;
  selectedBlockId?: string | null;
}

export function StrategyPreview({ strategy, selectedBlockId }: StrategyPreviewProps) {
  const validator = new StrategyValidator();
  const validation = useMemo(() => validator.validate(strategy), [strategy]);

  const selectedBlock = useMemo(
    () => strategy.blocks.find((b) => b.id === selectedBlockId),
    [strategy.blocks, selectedBlockId]
  );

  const blockCounts = useMemo(() => {
    return {
      asset: strategy.blocks.filter((b) => b.type === BlockType.ASSET).length,
      condition: strategy.blocks.filter((b) => b.type === BlockType.CONDITION).length,
      action: strategy.blocks.filter((b) => b.type === BlockType.ACTION).length,
      trigger: strategy.blocks.filter((b) => b.type === BlockType.TRIGGER).length,
    };
  }, [strategy.blocks]);

  const handleDownload = () => {
    downloadJSON(strategy);
  };

  return (
    <div className="bg-white flex flex-col h-full">
      {/* Description and Export */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">{strategy.description || "No description"}</p>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      <div className="p-4 border-b flex-shrink-0">
        {validation.valid ? (
          <Alert className="bg-gray-50 border-gray-300">
            <CheckCircle2 className="h-4 w-4 text-gray-700" />
            <AlertDescription className="text-gray-900 text-sm">
              Strategy is valid and ready to deploy
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-gray-50 border-gray-300">
            <AlertCircle className="h-4 w-4 text-gray-700" />
            <AlertDescription className="text-gray-900 text-sm">
              {validation.errors.length} error{validation.errors.length !== 1 ? "s" : ""} found
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="mx-4 mt-2 flex-shrink-0">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="validation" className="flex-1">Validation</TabsTrigger>
          <TabsTrigger value="json" className="flex-1">JSON</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Block Statistics */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Blocks</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded p-2 border border-gray-200">
                    <div className="text-xs text-gray-600">Assets</div>
                    <div className="text-lg font-bold text-gray-900">
                      {blockCounts.asset}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-2 border border-gray-200">
                    <div className="text-xs text-gray-600">Conditions</div>
                    <div className="text-lg font-bold text-gray-900">
                      {blockCounts.condition}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-2 border border-gray-200">
                    <div className="text-xs text-gray-600">Actions</div>
                    <div className="text-lg font-bold text-gray-900">
                      {blockCounts.action}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-2 border border-gray-200">
                    <div className="text-xs text-gray-600">Triggers</div>
                    <div className="text-lg font-bold text-gray-900">
                      {blockCounts.trigger}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connections */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Connections</h4>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-2xl font-bold text-gray-700">
                    {strategy.connections.length}
                  </div>
                  <div className="text-xs text-gray-600">Total connections</div>
                </div>
              </div>

              {/* Selected Block Details */}
              {selectedBlock && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Selected Block</h4>
                  <div className="bg-gray-50 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Type</span>
                      <Badge variant="outline">{selectedBlock.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">ID</span>
                      <span className="text-xs font-mono">{selectedBlock.id}</span>
                    </div>
                    {selectedBlock.type === BlockType.ASSET && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Symbol</span>
                          <span className="text-xs font-semibold">
                            {selectedBlock.data.symbol}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Weight</span>
                          <span className="text-xs font-semibold">
                            {selectedBlock.data.initialWeight}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Assets List */}
              {blockCounts.asset > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Assets</h4>
                  <div className="space-y-2">
                    {strategy.blocks
                      .filter((b) => b.type === BlockType.ASSET)
                      .map((block) => (
                        <div key={block.id} className="bg-gray-50 rounded p-2 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {block.data.icon || "💎"}
                              </span>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {block.data.symbol}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {block.data.name}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {block.data.initialWeight}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="mt-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Errors */}
              {validation.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-700" />
                    Errors ({validation.errors.length})
                  </h4>
                  <div className="space-y-2">
                    {validation.errors.map((error, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-300 rounded p-2">
                        <p className="text-sm text-gray-900">{error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-gray-700" />
                    Warnings ({validation.warnings.length})
                  </h4>
                  <div className="space-y-2">
                    {validation.warnings.map((warning, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-300 rounded p-2">
                        <p className="text-sm text-gray-900">{warning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Clear */}
              {validation.errors.length === 0 && validation.warnings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-gray-700 mb-2" />
                  <p className="text-sm font-semibold text-gray-900">
                    No issues found!
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Your strategy is valid and ready to deploy
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* JSON Tab */}
        <TabsContent value="json" className="mt-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <pre className="text-xs bg-gray-50 rounded p-3 overflow-x-auto">
                <code>{serializeStrategy(strategy)}</code>
              </pre>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
