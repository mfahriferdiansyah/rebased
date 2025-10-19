import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;
  private tokensData: any;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured. AI features will be disabled.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || '',
    });

    // Load tokens data with multiple fallback paths for production safety
    try {
      // Try multiple paths in order:
      // 1. From environment variable (highest priority for custom deployments)
      // 2. From working directory (development: backend/tokens.json)
      // 3. From dist root (production Nixpacks: dist/tokens.json)
      // 4. From project root via relative path
      const possiblePaths = [
        process.env.TOKENS_JSON_PATH, // Custom: env variable
        path.join(process.cwd(), 'tokens.json'), // Dev: backend/tokens.json
        path.join(process.cwd(), 'dist', 'tokens.json'), // Nixpacks: backend/dist/tokens.json
        path.join(__dirname, '../../../../tokens.json'), // From compiled: dist/apps/api/src/ai/ -> dist/tokens.json
        path.join(__dirname, '../../../../../tokens.json'), // Fallback: one level higher
      ].filter(Boolean); // Remove undefined

      let tokensPath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath!)) {
          tokensPath = testPath!;
          break;
        }
      }

      if (!tokensPath) {
        throw new Error('tokens.json not found in any expected location');
      }

      const tokensJson = fs.readFileSync(tokensPath, 'utf-8');
      this.tokensData = JSON.parse(tokensJson);
      this.logger.log(`✅ Loaded tokens.json successfully from: ${tokensPath}`);
    } catch (error) {
      this.logger.error('❌ Failed to load tokens.json', error);
      this.tokensData = { tokens: {} };
    }
  }

  /**
   * Find token by address and chainId
   */
  private findToken(address: string, chainId: number): any {
    const chainTokens = this.tokensData.tokens[chainId.toString()] || [];
    return chainTokens.find(
      (t: any) => t.address.toLowerCase() === address.toLowerCase()
    );
  }

  async generateStrategyFromIntent(
    userIntent: string,
    currentStrategy?: any,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<any> {
    this.logger.log(`Generating strategy from intent: ${userIntent}`);

    // Detect if user wants to MODIFY existing strategy or CREATE new one
    const modificationKeywords = [
      'change', 'update', 'modify', 'adjust', 'increase', 'decrease',
      'make it', 'set', 'switch', 'replace', 'swap'
    ];

    const intent = userIntent.toLowerCase();
    const isModification = modificationKeywords.some(keyword => intent.includes(keyword));

    // Only include current canvas state if user is modifying (not creating new)
    let strategyContext = '';
    if (currentStrategy && currentStrategy.blocks && currentStrategy.blocks.length > 0 && isModification) {
      const assetBlocks = currentStrategy.blocks.filter((b: any) => b.type === 'asset');
      const actionBlocks = currentStrategy.blocks.filter((b: any) => b.type === 'action');

      strategyContext = `\n\nCURRENT CANVAS STATE (for modification):
- Strategy Name: ${currentStrategy.name || 'Untitled'}
- Assets: ${assetBlocks.map((b: any) => `${b.data.symbol} (${b.data.initialWeight}%)`).join(', ')}
${actionBlocks.length > 0 ? `- Actions: ${actionBlocks.map((b: any) => b.data.actionType).join(', ')}` : ''}

User is modifying the existing strategy above. Maintain the existing blocks and only apply the requested changes.`;
    }

    const systemPrompt = `You are a portfolio strategy designer for Rebased, a crypto portfolio automation platform.

Your job is to convert user intent into a structured strategy with blocks and connections. You must respond with valid JSON only.

CRITICAL CONNECTION RULES (MUST FOLLOW):
1. START → ASSET blocks (connect to ALL assets)
2. ASSET → ACTION blocks (ALL assets connect to action)
3. ACTION → END block (action connects to end)
4. NEVER connect: ASSET → ASSET (assets don't connect to each other!)
5. NEVER connect: ACTION → ACTION (one action per strategy for now)

IMPORTANT RULES FOR STABLE RESPONSES:
1. Use ONLY Monad Testnet tokens (chainId: 10143)
2. Use real token addresses from this list:
   - WETH: 0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37 (18 decimals) - Use for ETH/Ethereum
   - USDC: 0xf817257fed379853cDe0fa4F97AB987181B1E5Ea (6 decimals) - Use for stablecoin/stable/USD
   - WBTC: 0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d (8 decimals) - Use for BTC/Bitcoin
3. For native MON, use: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE (18 decimals)
4. Total weights MUST sum to 100
5. Block IDs must be unique (use format: asset-1, asset-2, action-1, etc.)
6. Use consistent positioning for clean layouts
7. LISTEN TO USER'S ASSET PREFERENCES:
   - If user says "BTC" or "Bitcoin", include WBTC
   - If user says "ETH" or "Ethereum", include WETH
   - If user says "stable" or "stablecoin" or "USDC", include USDC
   - Conservative = more stablecoin (60-70% USDC)
   - Aggressive = more crypto (70-80% WETH/WBTC)
   - Balanced = 50/50 split

Available block types:
1. ASSET: Represents a token (WETH, USDC, WBTC, MON) with initial weight
2. ACTION: Rebalance actions with interval and drift settings

Return ONLY valid JSON following this exact structure.

COMPLETE EXAMPLE JSON (2 assets + 1 action):
{
  "name": "ETH/USDC Rebalancing",
  "description": "60/40 portfolio with hourly rebalancing",
  "blocks": [
    {
      "id": "asset-1",
      "type": "asset",
      "position": { "x": 400, "y": 100 },
      "size": { "width": 200, "height": 150 },
      "data": {
        "symbol": "WETH",
        "name": "Wrapped ETH",
        "address": "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37",
        "chainId": 10143,
        "decimals": 18,
        "initialWeight": 60
      },
      "connections": { "inputs": ["start-block"], "outputs": ["action-1"] }
    },
    {
      "id": "asset-2",
      "type": "asset",
      "position": { "x": 400, "y": 300 },
      "size": { "width": 200, "height": 150 },
      "data": {
        "symbol": "USDC",
        "name": "USD Coin",
        "address": "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea",
        "chainId": 10143,
        "decimals": 6,
        "initialWeight": 40
      },
      "connections": { "inputs": ["start-block"], "outputs": ["action-1"] }
    },
    {
      "id": "action-1",
      "type": "action",
      "position": { "x": 750, "y": 180 },
      "size": { "width": 200, "height": 180 },
      "data": {
        "actionType": "rebalance",
        "rebalanceTrigger": {
          "interval": 60,
          "drift": 5
        },
        "description": "Rebalance every 60 minutes with 5% drift threshold"
      },
      "connections": { "inputs": ["asset-1", "asset-2"], "outputs": [] }
    }
  ],
  "connections": [
    {
      "id": "conn-start-1",
      "source": { "blockId": "start-block", "port": "output" },
      "target": { "blockId": "asset-1", "port": "input" }
    },
    {
      "id": "conn-start-2",
      "source": { "blockId": "start-block", "port": "output" },
      "target": { "blockId": "asset-2", "port": "input" }
    },
    {
      "id": "conn-asset-1-action",
      "source": { "blockId": "asset-1", "port": "output" },
      "target": { "blockId": "action-1", "port": "input" }
    },
    {
      "id": "conn-asset-2-action",
      "source": { "blockId": "asset-2", "port": "output" },
      "target": { "blockId": "action-1", "port": "input" }
    },
    {
      "id": "conn-action-end",
      "source": { "blockId": "action-1", "port": "output" },
      "target": { "blockId": "end-block", "port": "input" }
    }
  ],
  "startBlockPosition": { "x": 50, "y": 200 },
  "endBlockPosition": { "x": 1150, "y": 200 }
}

Layout rules:
- START at x: 50
- Asset blocks at x: 400 (vertical spacing: 200px between each asset)
- Action blocks at x: 750
- END at x: 1150
- Center Y based on number of blocks`;

    try {
      // Build messages array with conversation history
      const messages: any[] = [
        { role: 'system', content: systemPrompt + strategyContext },
      ];

      // Add conversation history if provided (for context continuity)
      if (conversationHistory && conversationHistory.length > 0) {
        // Take last 6 messages to keep context window manageable
        const recentHistory = conversationHistory
          .slice(-6)
          .filter((msg: any) =>
            msg &&
            typeof msg === 'object' &&
            !Array.isArray(msg) &&
            msg.role &&
            msg.content &&
            typeof msg.content === 'string' &&
            msg.content.trim().length > 0
          );

        if (recentHistory.length > 0) {
          messages.push(...recentHistory);
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: isModification
          ? `Modify the strategy above based on: "${userIntent}"`
          : `Create a NEW strategy for: "${userIntent}"`,
      });

      this.logger.debug(`OpenAI messages: ${JSON.stringify(messages, null, 2)}`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more stable, consistent responses
        max_tokens: 2000,
      });

      const strategyData = JSON.parse(
        completion.choices[0].message.content || '{}',
      );

      this.logger.log(`Successfully generated strategy: ${strategyData.name}`);

      // Enrich blocks with token data from tokens.json
      const enrichedBlocks = (strategyData.blocks || []).map((block: any) => {
        if (block.type === 'asset' && block.data?.address && block.data?.chainId) {
          const tokenData = this.findToken(block.data.address, block.data.chainId);

          if (tokenData) {
            this.logger.debug(`Enriched ${block.data.symbol} with token data (logo: ${tokenData.logoURI})`);
            return {
              ...block,
              data: {
                ...block.data,
                name: tokenData.name || block.data.name,
                logoUri: tokenData.logoURI,
              },
            };
          }
        }
        return block;
      });

      return {
        id: `strategy-${Date.now()}`,
        name: strategyData.name,
        description: strategyData.description,
        blocks: enrichedBlocks,
        connections: strategyData.connections || [],
        startBlockPosition: strategyData.startBlockPosition || { x: 50, y: 200 },
        endBlockPosition: strategyData.endBlockPosition || { x: 800, y: 200 },
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: '1.0',
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate strategy from OpenAI', error);
      throw new Error('Failed to generate strategy from AI');
    }
  }
}
