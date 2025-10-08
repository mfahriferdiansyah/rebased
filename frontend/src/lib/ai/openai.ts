import OpenAI from "openai";
import { Strategy, Block, BlockType } from "@/lib/types/blocks";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
});

export async function generateStrategyFromIntent(
  userIntent: string
): Promise<Strategy> {
  const systemPrompt = `You are a portfolio strategy designer for Rebased, a crypto portfolio automation platform.

Your job is to convert user intent into a structured strategy with blocks and connections.

Available block types:
1. ASSET: Represents a token (ETH, USDC, BTC, etc.) with initial weight
2. CONDITION: IF statements (price > X, allocation > Y%, etc.)
3. ACTION: THEN statements (rebalance to X%, shift to Y%, etc.)
4. TRIGGER: When to execute (time interval, drift threshold, condition met)

Return JSON with this structure:
{
  "name": "Strategy name",
  "description": "What this strategy does",
  "blocks": [
    {
      "id": "unique-id",
      "type": "asset|condition|action|trigger",
      "position": { "x": 100, "y": 100 },
      "size": { "width": 200, "height": 150 },
      "data": { /* block-specific data */ },
      "connections": { "inputs": [], "outputs": [] }
    }
  ],
  "connections": [
    {
      "id": "conn-id",
      "source": { "blockId": "block-1", "port": "output" },
      "target": { "blockId": "block-2", "port": "input" }
    }
  ]
}

Layout rules:
- Asset blocks on the left (x: 100-300)
- Condition blocks in the middle (x: 400-600)
- Action blocks on the right (x: 700-900)
- Vertical spacing: 200px between blocks
- Make it visually balanced and easy to follow

Data structure examples:
ASSET: { "symbol": "ETH", "name": "Ethereum", "initialWeight": 60, "icon": "💎" }
CONDITION: { "operator": "GT", "leftOperand": { "type": "price", "asset": "ETH" }, "rightOperand": { "type": "value", "value": 5000 }, "description": "When ETH > $5000" }
ACTION: { "actionType": "rebalance", "targets": [{ "asset": "ETH", "targetWeight": 50 }], "description": "Shift to 50/50" }
TRIGGER: { "triggerType": "drift", "config": { "driftThreshold": 5 } }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Create a strategy for: "${userIntent}"`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const strategyData = JSON.parse(
    completion.choices[0].message.content || "{}"
  );

  return {
    id: `strategy-${Date.now()}`,
    name: strategyData.name,
    description: strategyData.description,
    blocks: strategyData.blocks,
    connections: strategyData.connections,
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: "1.0",
    },
  };
}
