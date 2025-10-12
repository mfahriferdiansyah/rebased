# Manual Auth Button - Fix for Infinite Loop

## ✅ Problem Solved

**Before:**
- Auto-trigger SIWE on Privy login
- Error → Reset flag → Trigger again → Error → **INFINITE LOOP** 🔥
- Effect count reached 26+ times
- Console spam with 401 errors

**After:**
- **NO auto-trigger** - User has full control
- Manual "Sign Message" button appears when needed
- Rate limiting: 3 second cooldown between attempts
- Max 3 attempts, then require page refresh
- **NO MORE SPAM** ✅

---

## 🎯 How It Works Now

### User Flow

1. **User logs in with Privy** (email/social/wallet)
   - Privy authentication completes
   - NO automatic SIWE trigger

2. **Yellow button appears bottom-right**
   ```
   ┌─────────────────────────────────────────┐
   │ ⚠️ Backend Authentication Required      │
   │                                         │
   │ Sign a message to access your          │
   │ strategies and delegations             │
   │                                         │
   │ [ 🛡️ Sign Message ]  3 attempts left   │
   └─────────────────────────────────────────┘
   ```

3. **User clicks "Sign Message"**
   - SIWE flow starts
   - Wallet signature prompt appears
   - User signs message

4. **Success or Error**
   - ✅ Success: Button disappears, user can access features
   - ❌ Error: Button stays, user can retry (with cooldown)

---

## 🔧 Implementation Details

### Changes Made

#### 1. **`src/hooks/useAuth.ts`** - Core Hook Updates

**Removed:**
- Auto-trigger useEffect (was causing infinite loop)
- Automatic reset of `siweCompletedRef` on error

**Added:**
```typescript
// Manual trigger function
const triggerSIWE = async () => {
  // Rate limiting checks
  if (now - lastAttemptTime < 3000) {
    toast('Please wait...');
    return;
  }

  // Max attempts check
  if (attemptCount >= 3) {
    toast('Too many attempts');
    return;
  }

  // Reset flag to allow retry
  siweCompletedRef.current = false;

  // Track attempt
  attemptCount++;

  // Trigger SIWE
  await getBackendToken();
};
```

**Error Handling:**
```typescript
catch (error) {
  // KEEP flag as true - prevents auto-retry loop
  siweCompletedRef.current = true;

  // User must manually click button to retry
  toast('Click "Sign Message" to retry');
}
```

**Success Handling:**
```typescript
// Reset counters on success
attemptCount.current = 0;
lastAttemptTime.current = 0;
```

#### 2. **`src/components/auth/AuthRetryButton.tsx`** - New Component

**Features:**
- Only shows when: Privy ✅ + Backend ❌
- Button with loading state
- Shows remaining attempts
- Disabled when max attempts reached
- Animated entrance (slide + fade)

**UI States:**
```typescript
// Normal state
<Button onClick={triggerSIWE}>
  🛡️ Sign Message
</Button>
3 attempts left

// Loading state
<Button disabled>
  ⏳ Signing...
</Button>

// Max attempts
<Button disabled>
  🛡️ Sign Message
</Button>
Max attempts reached. Refresh page.
```

#### 3. **`src/App.tsx`** - Global Integration

```typescript
import { AuthRetryButton } from './components/auth/AuthRetryButton';

// Inside TooltipProvider
<AuthRetryButton />
```

---

## 📊 Rate Limiting

### Cooldown System

**Timing:**
- 3 seconds between attempts
- Shows countdown: "Try again in 2 seconds"

**Max Attempts:**
- 3 attempts total
- After 3 failures: "Please refresh page"

**Reset Conditions:**
- Success: Resets counter to 0
- Logout: Resets counter to 0
- Page refresh: Resets counter to 0

---

## 🧪 Testing Instructions

### Test 1: Normal Flow

1. **Open app:** http://localhost:5173
2. **Login with Privy** (any method)
3. **Verify:**
   - ✅ NO auto SIWE trigger
   - ✅ NO console spam
   - ✅ Yellow button appears bottom-right

4. **Click "Sign Message"**
5. **Sign in wallet**
6. **Verify:**
   - ✅ Success toast
   - ✅ Button disappears
   - ✅ Can now save strategies

### Test 2: Error Handling

1. **Login with Privy**
2. **Click "Sign Message"**
3. **CANCEL signature in wallet**
4. **Verify:**
   - ✅ Error toast: "Click Sign Message to retry"
   - ✅ Button still visible
   - ✅ NO infinite loop
   - ✅ Can click button again

### Test 3: Rate Limiting

1. **Login with Privy**
2. **Click "Sign Message"** → Cancel
3. **Immediately click again**
4. **Verify:**
   - ✅ Toast: "Try again in X seconds"
   - ✅ Button disabled briefly

### Test 4: Max Attempts

1. **Login with Privy**
2. **Click "Sign Message"** → Cancel (3 times)
3. **Verify:**
   - ✅ Shows "0 attempts left"
   - ✅ Button shows "Max attempts reached"
   - ✅ Must refresh page to retry

---

## 🔍 Console Output

### Before (BROKEN)
```
🔄 useAuth effect triggered (count: 26)
🔐 Auto-triggering SIWE flow...
❌ SIWE authentication failed: Invalid nonce
🔄 useAuth effect triggered (count: 27)
🔐 Auto-triggering SIWE flow...
❌ SIWE authentication failed: Invalid nonce
🔄 useAuth effect triggered (count: 28)
[... INFINITE SPAM ...]
```

### After (FIXED)
```
[User logs in with Privy]
[No automatic SIWE trigger]

[User clicks "Sign Message" button]
🔐 Manual SIWE trigger (attempt 1/3)
🔐 Starting SIWE flow for: 0x47B2...
1️⃣ Getting nonce from backend...
   Nonce received: abc123...
2️⃣ Creating SIWE message...
3️⃣ Requesting signature...
4️⃣ Verifying with backend...
✅ SIWE flow completed successfully

[Button disappears]
```

---

## 🐛 Debugging "Invalid Nonce"

If you still get "Invalid nonce" errors:

### 1. Check Backend Logs

```bash
cd /Users/kadzu/Documents/Repositories/rebased-monorepo/rebased/backend
npm run start:api

# Watch for:
# POST /auth/nonce
# POST /auth/verify
```

### 2. Check Database

```bash
npm run prisma:studio
# Open User table
# Check nonce value for your address
```

### 3. Verify Address Normalization

**Frontend sends:**
```typescript
await authApi.getNonce(userAddress.toLowerCase());
// "0x47b245f2a3c7557d855e4d800890c4a524a42cc8"
```

**Backend expects:**
```typescript
const normalizedAddress = address.toLowerCase();
// Must match exactly
```

### 4. Check SIWE Message Format

```typescript
// Frontend message
const siweMessage = new SiweMessage({
  domain: window.location.host,  // "localhost:5173"
  address: userAddress,           // "0x47B2..." (case-sensitive!)
  chainId: 10143 or 84532,
  nonce: "abc123...",
});

// Backend verification
const fields = await siweMessage.verify({ signature });
// Must match exactly
```

---

## 📝 Files Modified

1. ✏️ `src/hooks/useAuth.ts`
   - Removed auto-trigger useEffect
   - Added `triggerSIWE()` function
   - Added rate limiting
   - Fixed error handling

2. ✨ `src/components/auth/AuthRetryButton.tsx` (NEW)
   - Manual trigger button
   - Visual feedback
   - Rate limit UI

3. ✏️ `src/App.tsx`
   - Added `<AuthRetryButton />` globally

---

## 🚀 Next Steps

1. **Test the flow** - Login and click "Sign Message"
2. **Debug "Invalid nonce"** - Check backend logs if still failing
3. **Remove debug logs** - Clean up console.log for production
4. **Try save strategy** - Should work once backend auth succeeds

---

**Status:** ✅ Infinite Loop Fixed | 🎮 User Control Added | 🧪 Ready to Test
