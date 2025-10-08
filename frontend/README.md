# Rebased Strategy Builder - Quick Reference

## 🎯 Core Concept

Build crypto portfolio strategies by connecting blocks in a flow. Each block does ONE thing.

---

## 📦 Block Types (6 Total)

### 1. START

**Purpose:** Entry point of every strategy  
**Contains:** Strategy name, description  
**Can connect to:** ASSETS, TRIGGER  
**Use case:** "Begin building my strategy"

---

### 2. ASSETS

**Purpose:** Define which tokens + their target weights  
**Contains:**

- Token list (symbol, address, chain, name)
- Weight for each token (must sum to 100%)

**Can connect to:** CONDITION, ACTION, FILTER, END  
**Use case:**

- Simple: "60% ETH, 40% USDC" → END
- Advanced: "70% ETH, 30% USDC" → CONDITION

**UI:** Token selector + weight slider per token

---

### 3. CONDITION

**Purpose:** Check if market meets criteria (IF statement)  
**Contains:**

- **Type:** Price, Allocation Drift, Portfolio Gain/Loss, Time
- **Params:** tokenSymbol, operator (>, <, >=, <=), value, unit

**Can connect to:** ACTION, CONDITION (for chaining)  
**Use cases:**

- "IF ETH price > $5000"
- "IF portfolio gain > 20%"
- "IF ETH allocation drifts > 5%"

**UI:** Dropdown for type, token selector, number input

---

### 4. ACTION

**Purpose:** Execute changes (THEN statement)  
**Contains:**

- **Type:** Rebalance, Shift Allocation, Take Profit, Stop Loss
- **Params:** newWeights, targetStablecoin, percentage

**Can connect to:** END, CONDITION (for ELSE)  
**Use cases:**

- "THEN shift to 50% ETH, 50% USDC"
- "THEN take 20% profit to USDC"
- "THEN rebalance to target weights"

**UI:** Dropdown for type, weight sliders (if SHIFT_ALLOCATION)

---

### 5. TRIGGER (Optional)

**Purpose:** Define how often to check conditions  
**Contains:**

- **Type:** Time Interval, Price Change, Manual
- **Params:** interval (seconds), priceChangeThreshold (%)

**Can connect to:** ASSETS  
**Use cases:**

- "Check every 60 seconds"
- "Check when price moves 5%"

**Default:** Every 60 seconds (can skip this block)  
**UI:** Interval slider or percentage input

---

### 6. END

**Purpose:** Terminal node, marks completion  
**Contains:** Validation status  
**Can connect to:** Nothing (terminal)  
**Use case:** "Strategy is complete"

---

## 🔗 Connection Rules

```
START → [ASSETS, TRIGGER]
ASSETS → [CONDITION, ACTION, FILTER, END]
CONDITION → [ACTION, CONDITION]
ACTION → [END, CONDITION]
TRIGGER → [ASSETS]
FILTER → [ASSETS]
END → []
```

---

## 📋 Strategy Patterns

### Pattern 1: Simple Rebalancing

```
START → ASSETS → END
```

**What it does:** Maintains target weights forever  
**Example:** "Keep 60% ETH, 40% USDC"

---

### Pattern 2: Conditional Rebalancing

```
START → ASSETS → CONDITION → ACTION → END
```

**What it does:** Change weights when condition met  
**Example:** "Start 70/30, but IF ETH > $5k THEN go 50/50"

---

### Pattern 3: Multi-Condition (IF-ELSE)

```
START → ASSETS → CONDITION → ACTION → CONDITION → ACTION → END
```

**What it does:** Multiple rules  
**Example:**

- IF ETH > $5k THEN 50/50
- ELSE IF ETH < $3k THEN 80/20
- ELSE maintain 70/30

---

## 🎨 What Each Block Can Reference

### CONDITION Block Values

Can check:

- **Token prices** (requires: token from ASSETS)
- **Allocations** (requires: token from ASSETS)
- **Portfolio value** (no dependency)
- **Time elapsed** (no dependency)

**Correlation:** Must reference tokens defined in ASSETS block

---

### ACTION Block Values

Can modify:

- **Weights** (requires: tokens from ASSETS)
- **Profit taking** (requires: target stablecoin in ASSETS)

**Correlation:** Can only rebalance tokens that exist in ASSETS block

---

## ✅ Validation Rules

1. **ASSETS:** Weights must sum to 100%
2. **CONDITION:** Token must exist in ASSETS
3. **ACTION:** New weights must reference ASSETS tokens
4. **Flow:** Must have exactly one START and one END
5. **Connections:** Follow CONNECTION_RULES (see above)

---

## 💡 Real-World Examples

### Example 1: Conservative Holder

```
START
  → ASSETS: 50% ETH, 50% USDC
  → END
```

**Behavior:** Rebalances to 50/50 every minute (default)

---

### Example 2: Take Profits Gradually

```
START
  → ASSETS: 80% ETH, 20% USDC
  → CONDITION: IF ETH price > $5000
  → ACTION: SHIFT to 60% ETH, 40% USDC
  → END
```

**Behavior:**

- Normally maintains 80/20
- When ETH hits $5k, shifts to 60/40
- Locks in profits automatically

---

### Example 3: Stop Loss Protection

```
START
  → ASSETS: 70% ETH, 30% USDC
  → CONDITION: IF portfolio loss > 15%
  → ACTION: SHIFT to 30% ETH, 70% USDC
  → END
```

**Behavior:**

- Normally maintains 70/30
- If portfolio drops 15%, goes defensive (30/70)
- Protects against further losses

---

### Example 4: Momentum Strategy

```
START
  → ASSETS: 60% ETH, 40% USDC
  → CONDITION: IF ETH gain > 20%
  → ACTION: SHIFT to 70% ETH, 30% USDC
  → CONDITION: IF ETH loss > 10%
  → ACTION: SHIFT to 50% ETH, 50% USDC
  → END
```

**Behavior:**

- Starts 60/40
- IF ETH pumps 20% → increase to 70% (ride the wave)
- IF ETH dumps 10% → decrease to 50% (cut losses)
- Dynamic allocation based on momentum

---

## 🛠️ Implementation Guide

### For Claude Code:

```typescript
// Use CONNECTION_RULES to validate connections
import { canConnect, CONNECTION_RULES } from "./blockSchema";

function handleConnect(source: Block, target: Block) {
  if (!canConnect(source.type, target.type)) {
    showError(`Cannot connect ${source.type} to ${target.type}`);
    return false;
  }
  // Create connection...
}

// Show only valid next blocks in UI
function getAvailableBlocks(currentBlock: Block): BlockType[] {
  return CONNECTION_RULES[currentBlock.type];
}

// Validate before deployment
function validateStrategy(blocks: Block[]): boolean {
  // Check all blocks, sum of weights, connections, etc.
  return allValid;
}
```

---

## 🎯 Key Principles

1. **ONE BLOCK = ONE PURPOSE** (don't overload blocks)
2. **WEIGHTS IN ASSETS** (cleaner, less blocks)
3. **LINEAR FLOW** (top to bottom, left to right)
4. **VALIDATE EARLY** (show errors as user builds)
5. **DEFAULTS MATTER** (60s interval, REBALANCE_TO_TARGET)

---

## 📊 Block Correlation Summary

| Block     | References         | Requires            |
| --------- | ------------------ | ------------------- |
| START     | Nothing            | Nothing             |
| ASSETS    | Token list, Prices | Nothing             |
| CONDITION | ASSETS tokens      | ASSETS block exists |
| ACTION    | ASSETS tokens      | ASSETS block exists |
| TRIGGER   | Nothing            | Nothing             |
| END       | Nothing            | Valid strategy      |

**Critical:** CONDITION and ACTION blocks MUST reference tokens defined in ASSETS block!
