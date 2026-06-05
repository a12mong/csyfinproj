# TDS-63: Payment Form Auth Cookie Fix - QA Test Report

**Issue:** Payment form returning "Invalid or expired token" error  
**Fix Commit:** `d8c3f36` - "fix: send auth cookie with payment form submission"  
**Status:** ✅ QA REVIEW IN PROGRESS  
**Tester:** QA Tester Agent  
**Test Date:** 2026-04-16

---

## Executive Summary

The payment form was failing with "Invalid or expired token" because it used a raw `fetch()` call without including the authentication cookie. The fix adds `credentials: "include"` to the fetch call, matching the pattern used elsewhere in the app via the `apiFetch()` helper.

**Fix Verification:** The code change is correct and properly implemented.

---

## Root Cause Analysis (Verified)

### Problem
- **Symptom:** POST to `/api/v1/payments` returns `{ "error": "Invalid or expired token" }`
- **Root Cause Identified:** 
  - The payment form's `handleSubmitPayment` function used raw `fetch()` without `credentials: "include"`
  - The browser does NOT send cookies by default in fetch requests
  - The backend expects an HttpOnly auth cookie, which was never being transmitted
  - Dead code attempted to read `localStorage.getItem("token")` which was never set

### Why Other APIs Work
- The rest of the app uses `apiFetch()` helper (from `@/lib/api`)
- The `apiFetch()` helper correctly includes `credentials: "include"`
- This was identified as the inconsistency

---

## Code Review

### File Changed
**Path:** `apps/web/src/app/payments/page.tsx`  
**Lines:** 271-275

### Before (Broken)
```typescript
const res = await fetch(`${API_BASE_URL}/payments`, {
  method: "POST",
  body: formData,
  // ❌ Missing credentials: "include"
});
```

### After (Fixed)
```typescript
const res = await fetch(`${API_BASE_URL}/payments`, {
  method: "POST",
  credentials: "include",  // ✅ Now includes auth cookie
  body: formData,
});
```

### Additional Fix
- Removed dead code attempting to read `localStorage.getItem("token")`
- This code was unreachable and never provided a fallback

---

## Test Plan

### Test Categories

#### 1. **AUTH COOKIE TRANSMISSION** ✅
- [x] Verify `credentials: "include"` is present in the fetch call
- [x] Confirm no fallback to localStorage token (dead code removed)
- [x] Confirm no hardcoded token in request

#### 2. **FORM SUBMISSION - HAPPY PATH** (Ready for E2E Testing)
- [ ] User logs in and receives HttpOnly auth cookie
- [ ] User navigates to Payments page
- [ ] User fills payment form with installment reference
- [ ] User submits form with amount, date, and payment channel
- [ ] Request succeeds (HTTP 200/201)
- [ ] Response shows payment recorded successfully
- [ ] Payment appears in "Pending Verification" list

#### 3. **REFERENCE TYPE COVERAGE** (Ready for E2E Testing)
- [ ] **Installment reference:** Submit payment linked to installment
- [ ] **Contract reference:** Submit payment linked to contract (with optional specific installment)
- [ ] **Sale/PO reference:** Submit payment via sale ID (resolves to contract)

#### 4. **SLIP IMAGE UPLOAD** (Ready for E2E Testing)
- [ ] Submit payment WITH slip image (bank transfer channel)
- [ ] Verify multipart/form-data encoding (FormData handles this)
- [ ] Verify slip image is stored and retrievable
- [ ] Verify slip appears in "Pending Verification" list for review

#### 5. **PAYMENT CHANNELS** (Ready for E2E Testing)
- [ ] Cash payment (no slip required)
- [ ] Bank transfer (slip image required)
- [ ] LINE payment

#### 6. **FORM VALIDATION** (Ready for E2E Testing)
- [ ] Amount validation (required, min 1)
- [ ] Date validation (required)
- [ ] Reference selection validation (depends on reference type)
- [ ] Error messages display correctly

#### 7. **PAYMENT VERIFICATION FLOW** (Ready for E2E Testing)
- [ ] User can approve pending payment
- [ ] User can reject pending payment
- [ ] Verify state updates correctly in UI

#### 8. **REGRESSION TESTING** (Ready for E2E Testing)
- [ ] Other apiFetch calls still work (installments, contracts, payments list)
- [ ] Auth still works for other pages
- [ ] No impact on other payment-related endpoints

---

## Implementation Status

| Component | Status | Evidence |
|-----------|--------|----------|
| Code Fix Applied | ✅ Complete | Commit `d8c3f36` shows `credentials: "include"` on line 273 |
| Dead Code Removed | ✅ Complete | localStorage token code removed |
| Matches App Pattern | ✅ Verified | Consistent with other apiFetch usage |
| Syntax Correct | ✅ Verified | FormData + fetch with credentials is valid |
| Type Safe | ✅ Verified | No TypeScript errors in the change |

---

## Next Steps for QA

### Browser-Based Testing Required
To fully verify this fix works end-to-end, the following browser tests are needed:

1. **Setup:**
   - Ensure backend API is running at localhost:4000
   - Ensure frontend is running (dev server)
   - Create or have a test user account with auth cookie

2. **Happy Path Test:**
   - Log in → Navigate to Payments
   - Fill form (installment ref, amount 1000, date today, cash)
   - Submit → Verify success message
   - Check "Pending Verification" list for new payment

3. **Image Upload Test:**
   - Fill form with bank transfer
   - Upload test slip image
   - Submit → Verify slip is stored

4. **Verify/Reject Test:**
   - Approve a pending payment in the UI
   - Verify state changes

### Tools for Testing
- Browser DevTools Network tab (verify "Cookie" header is sent in request)
- Browser Console (verify no JS errors on form submission)
- Backend logs (verify auth succeeds after fix)

---

## Risk Assessment

### No Breaking Changes
- Fix is **backward compatible**
- Uses standard Fetch API: `credentials: "include"` is well-supported
- All modern browsers support this option

### Deployment Safety
- ✅ No database migrations required
- ✅ No backend changes required
- ✅ No changes to other components
- ✅ Safe to deploy in isolation

---

## Sign-Off Checklist

- [ ] Code review approved
- [x] Root cause verified
- [x] Fix is correct and complete
- [ ] Browser-based E2E testing completed
- [ ] No regressions detected
- [ ] Ready for production

---

## Notes

This fix addresses a critical issue where authenticated users could not submit payments. The root cause was the fetch call not including credentials. The solution is minimal and correct, following the established pattern used throughout the app via the `apiFetch()` helper function.
