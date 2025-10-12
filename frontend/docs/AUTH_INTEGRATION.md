# Authentication Integration - SIWE + Privy

## ✅ Implementation Complete

### What Was Fixed

**Root Cause:** Frontend was using Privy JWT tokens, but backend expected its own SIWE-based JWT tokens.

**Solution:** Implemented hybrid authentication combining Privy (for UX) with SIWE (for backend auth).

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User → Privy Login (email/social/wallet)                │
│     ├─ Email + OTP                                          │
│     ├─ Google OAuth                                         │
│     ├─ Twitter OAuth                                        │
│     └─ MetaMask / WalletConnect                             │
│                                                              │
│  2. useAuth Hook → Auto-trigger SIWE flow                   │
│     ├─ GET /auth/nonce (get nonce from backend)             │
│     ├─ Sign SIWE message with Privy wallet                  │
│     └─ POST /auth/verify (get backend JWT)                  │
│                                                              │
│  3. useStrategy / useDelegation → Use backend JWT            │
│     ├─ POST /strategies (with backend JWT)                  │
│     ├─ POST /delegations (with backend JWT)                 │
│     └─ All API calls authenticated                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Files Created/Modified

### ✨ New Files

1. **`src/lib/api/auth.ts`** - Auth API client
   - `getNonce(address)` - Get SIWE nonce
   - `verifySignature(message, signature)` - Get backend JWT

2. **`src/hooks/useAuth.ts`** - Hybrid auth hook
   - Combines Privy + SIWE authentication
   - Auto-triggers SIWE flow after Privy login
   - Caches backend JWT with expiry tracking
   - Provides `getBackendToken()` for API calls

### 📝 Modified Files

3. **`src/hooks/useStrategy.ts`**
   - Replaced `usePrivy().getAccessToken()` with `useAuth().getBackendToken()`
   - Updated all authentication checks
   - Removed Privy token caching (now handled by useAuth)

4. **`src/hooks/useDelegation.ts`**
   - Same changes as useStrategy
   - Uses backend JWT for all API calls

5. **`src/lib/api/index.ts`**
   - Added export for authApi

6. **`package.json`**
   - Added `siwe@^3.0.0` dependency

---

## 🔄 Authentication Flow Details

### Step 1: Privy Login
```typescript
// User clicks "Sign In" button
// Privy modal opens with login options
// User selects method (email/social/wallet)
// Privy handles authentication
// usePrivy().authenticated becomes true
```

### Step 2: Auto SIWE Flow (useAuth hook)
```typescript
// useAuth detects Privy authentication
// Automatically triggers SIWE flow:

// 1. Get nonce from backend
const { nonce } = await authApi.getNonce(userAddress);

// 2. Create SIWE message
const siweMessage = new SiweMessage({
  domain: window.location.host,
  address: userAddress,
  statement: 'Sign in to Rebased',
  uri: window.location.origin,
  version: '1',
  chainId: 10143 or 84532,
  nonce,
  issuedAt: new Date().toISOString(),
});

// 3. Sign with Privy wallet
const signature = await wallet.signMessage(messageToSign);

// 4. Verify and get JWT
const { accessToken, expiresAt } = await authApi.verifySignature(
  messageToSign,
  signature
);

// 5. Cache token
setBackendToken(accessToken);
setTokenExpiry(expiresAt);
```

### Step 3: API Calls
```typescript
// useStrategy / useDelegation calls
const token = await getBackendToken();

// Makes API request with backend JWT
await strategiesApi.createStrategy(dto, token);
// Authorization: Bearer <backend-jwt>
```

---

## 🎯 Key Features

### 1. **Automatic SIWE Trigger**
- No manual intervention required
- Triggers once when Privy login completes
- User only needs to sign one message

### 2. **Token Caching**
- Backend JWT cached with expiry tracking
- Returns cached token if still valid (5min buffer)
- Auto-refreshes when expired

### 3. **Retry Logic**
- 3 retry attempts on token expiry
- Automatic token refresh between retries
- Graceful error handling

### 4. **Cleanup on Logout**
- Clears backend JWT when user logs out
- Resets all authentication state
- No stale data

---

## 🧪 Testing Checklist

### ✅ Ready to Test

1. **User Login Flow**
   - [ ] Open frontend (http://localhost:5173)
   - [ ] Click "Sign In" button
   - [ ] Login with Privy (email/social/wallet)
   - [ ] Verify SIWE signature prompt appears
   - [ ] Sign SIWE message
   - [ ] Check console for "🔐 Auto-triggering SIWE flow..."
   - [ ] Verify success toast: "Authentication successful"

2. **Save Strategy**
   - [ ] Create a strategy with asset blocks
   - [ ] Click "Save" button in toolbar
   - [ ] Verify no auth error
   - [ ] Check success toast: "Strategy saved successfully"
   - [ ] Verify strategy appears in backend database

3. **Create Delegation**
   - [ ] Open delegation manager modal
   - [ ] Create new delegation
   - [ ] Sign EIP-712 delegation
   - [ ] Verify no auth error
   - [ ] Check success toast: "Delegation created successfully"

---

## 🐛 Known Issues to Debug

### Issue 1: Invalid Nonce
**Symptom:** Backend returns "Invalid nonce" error during SIWE verification

**Possible Causes:**
1. Nonce being reused (replay protection)
2. Race condition - multiple SIWE flows triggered
3. Nonce expired (time-based validation)

**Debug Steps:**
```typescript
// Add logging in useAuth.ts
console.log('1. Getting nonce for:', userAddress);
console.log('2. Nonce received:', nonce);
console.log('3. Message to sign:', messageToSign);
console.log('4. Signature:', signature);
console.log('5. Backend response:', authResponse);
```

**Fix Ideas:**
- Check `siweCompletedRef` is preventing duplicate flows
- Verify nonce is fresh from backend
- Check backend isn't rotating nonce prematurely

### Issue 2: Multiple Login Requests
**Symptom:** useAuth hook triggers SIWE flow multiple times

**Possible Causes:**
1. `useEffect` dependency array causing re-triggers
2. React strict mode (double-mounting in dev)
3. Token expiry check re-triggering flow

**Debug Steps:**
```typescript
// Add counter in useAuth.ts
const attemptCounterRef = useRef(0);

useEffect(() => {
  attemptCounterRef.current++;
  console.log('🔄 useAuth effect triggered (attempt #', attemptCounterRef.current, ')');

  // ... existing code
}, [authenticated, ready, userAddress, wallet]);
```

**Fix Ideas:**
- Add more aggressive `siweCompletedRef` checks
- Debounce the SIWE trigger
- Check if token is already valid before re-authenticating

---

## 🔍 Debugging Commands

### Check Backend Health
```bash
curl http://localhost:3000/health
```

### Test Auth Nonce Endpoint
```bash
curl -X POST http://localhost:3000/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

### Check Database
```bash
cd /Users/kadzu/Documents/Repositories/rebased-monorepo/rebased/backend
npm run prisma:studio
# Open http://localhost:5555
# Check User table for nonce values
```

### Monitor Backend Logs
```bash
# In backend terminal
# Watch for:
# - "GET /auth/nonce" requests
# - "POST /auth/verify" requests
# - Any authentication errors
```

---

## 🎬 Next Steps

1. **Test the Save Button** ✅
   - Create strategy on frontend
   - Click save
   - Should work without auth error

2. **Debug "Invalid Nonce"** 🐛
   - Add logging to useAuth.ts
   - Check if multiple SIWE flows triggered
   - Verify nonce rotation in backend

3. **Fix Multiple Requests** 🔧
   - Add request deduplication
   - Improve siweCompletedRef logic
   - Consider debouncing

4. **Contract Integration** 🚀
   - Deploy smart contracts
   - Add ABIs to backend
   - Implement on-chain calls
   - Complete end-to-end rebalancing flow

---

## 📚 Related Documentation

- Backend: `/rebased/backend/docs/END_TO_END_FLOW.md`
- Backend: `/rebased/backend/docs/TESTING.md`
- Frontend: `/rebased/frontend/docs/PRIVY_SETUP.md`
- Backend Auth: `/rebased/backend/apps/api/src/auth/auth.service.ts`

---

**Status:** ✅ Implementation Complete | 🧪 Ready for Testing | 🐛 Known Issues to Address
