# TDS-71 QA Test Report: Contracts Module Alignment with Installment Sales

**Issue:** [TDS-71](/TDS/issues/TDS-71) - QA: Verify contracts module aligns with installment sales workflow

**Test Date:** [TO BE FILLED]
**Tester:** QA Tester (Agent 23a444cb-ea98-4be6-9578-faf8119db47f)
**Environment:** Local dev (http://localhost:3000)
**Database:** Test dataset

---

## Executive Summary

| Metric | Result |
|--------|--------|
| **Total Tests** | 10 |
| **Passed** | [TBD] |
| **Failed** | [TBD] |
| **Blocked** | [TBD] |
| **Pass Rate** | [TBD] % |
| **Status** | ⏳ PENDING - Awaiting TDS-70 completion |

---

## Test Results Matrix

| # | Test ID | Test Name | Status | Evidence | Notes |
|---|---------|-----------|--------|----------|-------|
| 1 | TC-71-1-1 | Installment Sale Appears in Step 2 | ⬜ | [TBD] | Verify only `installment` sales shown, not `finance_company` |
| 2 | TC-71-1-2 | Principal Auto-Suggested | ⬜ | [TBD] | Verify principal = sale.financeAmount |
| 3 | TC-71-1-3 | 2-Party Contract Structure | ⬜ | [TBD] | Verify CSY + Customer, no finance company |
| 4 | TC-71-1-4 | Installment Schedule Correct | ⬜ | [TBD] | Verify amortization calculations |
| 5 | TC-71-2-1 | No "Finance Company" Terminology | ⬜ | [TBD] | Search entire UI for old terminology |
| 6 | TC-71-2-2 | Customer Type Badges | ⬜ | [TBD] | Verify badges in customer selector |
| 7 | TC-71-3-1 | Old Finance Company Sales Still Work | ⬜ | [TBD] | Verify backward compatibility |
| 8 | TC-71-3-2 | Contract List Shows All Contracts | ⬜ | [TBD] | Both old and new contracts visible |
| 9 | TC-71-4-1 | Sales Module Still Works | ⬜ | [TBD] | Regression: Sales list/detail functional |
| 10 | TC-71-4-2 | Payment Recording Still Works | ⬜ | [TBD] | Regression: Can record contract payments |

---

## Detailed Test Results

### GROUP 1: Contract Creation with Installment Sales

#### Test 1.1 (TC-71-1-1): Installment Sale Appears in Step 2

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Created test customer (type: personal)
- [ ] Created Sale A (installment, 50,000) and Sale B (finance_company, 30,000)
- [ ] Opened Contracts page → New Contract
- [ ] Selected customer in Step 1
- [ ] Reviewed Step 2 sales list

**Expected Results:**
- ✅ Only Sale A (installment) appears
- ✅ Sale B (finance_company) NOT shown
- ✅ Text reads "Select installment sales to link" (not "finance-company")
- ✅ Empty state message: "No active installment sales found..."

**Actual Result:** [TBD]

**Screenshots:** [TBD]

**Notes:** [TBD]

---

#### Test 1.2 (TC-71-1-2): Principal Auto-Suggested from Finance Amount

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Selected Sale A (installment, 50,000) from previous test
- [ ] Navigated to Step 3 (Terms)
- [ ] Observed Principal field

**Expected Results:**
- ✅ Principal field = 50,000
- ✅ User can manually override

**Actual Result:** [TBD]

**Screenshots:** [TBD]

**Notes:** [TBD]

---

#### Test 1.3 (TC-71-1-3): 2-Party Contract Structure

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Filled remaining terms (annual_rate, num_installments, start_date)
- [ ] Reviewed Step 4 (Preview)
- [ ] Created contract
- [ ] Opened contract detail page
- [ ] Checked Contract Parties section

**Expected Results:**
- ✅ Exactly 2 parties:
  - CSY (company/creditor)
  - Customer (debtor)
- ✅ NO finance company third party
- ✅ Party roles displayed correctly

**Actual Result:** [TBD]

**Screenshots:** [TBD]

**Notes:** [TBD]

---

#### Test 1.4 (TC-71-1-4): Installment Schedule Generates Correctly

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Opened created contract from Test 1.3
- [ ] Reviewed Amortization Schedule section
- [ ] Verified calculations:
  - [ ] Number of rows = num_installments
  - [ ] Sum of principal = original principal
  - [ ] Due dates increment by 1 month
  - [ ] Interest calculations accurate

**Expected Results:**
- ✅ Correct number of schedule rows
- ✅ Principal + interest breakdown accurate
- ✅ Balance reduces to 0 by last installment
- ✅ Due dates: start_date + 1, +2, +3... months
- ✅ If annual_rate = 0%, no interest
- ✅ If annual_rate > 0%, interest calculated correctly

**Actual Result:** [TBD]

**Screenshots:** [TBD]

**Notes:** [TBD]

---

### GROUP 2: Text and UI Verification

#### Test 2.1 (TC-71-2-1): No "Finance Company" Terminology

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Contracts page reviewed
- [ ] New Contract flow (all 4 steps) reviewed
- [ ] Contract detail page reviewed
- [ ] Searched for: "finance company", "finance institution", "financial institution"
- [ ] Browser console checked for errors

**Expected Results:**
- ✅ NO instances of "finance company" (case-insensitive)
- ✅ Language updated to "installment sale" or "installment"
- ✅ Example updated text:
  - "Select installment sales to link. Principal will be auto-suggested from selected sales."
  - "No active installment sales found for this customer."
- ✅ No JavaScript errors

**Actual Result:** [TBD]

**Grep Results:** 
```
[TBD]
```

**Screenshots:** [TBD]

**Notes:** [TBD]

---

#### Test 2.2 (TC-71-2-2): Customer Type Badges in Selector

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Opened Contracts page → New Contract → Step 1
- [ ] Reviewed customer list
- [ ] Checked each customer for type badge

**Expected Results:**
- ✅ Badges present for each customer:
  - personal → Blue "Personal"
  - individual → Green "Individual"
  - finance → Amber "Finance"
- ✅ Consistent positioning
- ✅ Good contrast/readability
- ✅ Matches sales modal styling

**Actual Result:** [TBD]

**Screenshots:** [TBD]

**Notes:** [TBD]

---

### GROUP 3: Backward Compatibility

#### Test 3.1 (TC-71-3-1): Old Finance Company Sales Still Display

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Located existing contract linked to finance_company sale
- [ ] Opened contract detail page
- [ ] Verified information loads without errors

**Expected Results:**
- ✅ Contract appears in list
- ✅ Detail page loads successfully
- ✅ All fields display correctly
- ✅ Party information shows (may include finance company if stored)
- ✅ Amortization schedule displays
- ✅ No JavaScript errors
- ✅ Payment recording functional (see Test 4.2)

**Actual Result:** [TBD]

**Screenshots:** [TBD]

**Notes:** [TBD]

---

#### Test 3.2 (TC-71-3-2): Contract List Shows All Contracts

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Opened Contracts page
- [ ] Applied filters: Status = "All"
- [ ] Verified both old (finance_company) and new (installment) contracts visible

**Expected Results:**
- ✅ Both types of contracts appear in list
- ✅ Filtering by status works correctly
- ✅ Pagination works
- ✅ Search functionality works

**Actual Result:** [TBD]

**Screenshots:** [TBD]

**Notes:** [TBD]

---

### GROUP 4: Regression Testing

#### Test 4.1 (TC-71-4-1): Sales Module Still Works

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Navigated to Sales page
- [ ] Created new installment sale
- [ ] Viewed sale detail page
- [ ] Tested filters (payment_method, status)
- [ ] Checked browser console for errors

**Expected Results:**
- ✅ Create sale works end-to-end
- ✅ Sales list loads
- ✅ Detail page shows all fields
- ✅ Filters work correctly
- ✅ No JavaScript errors
- ✅ Customer type badges visible (if implemented)

**Actual Result:** [TBD]

**Screenshots:** [TBD]

**Notes:** [TBD]

---

#### Test 4.2 (TC-71-4-2): Payment Recording for Contracts

**Status:** ⬜ PENDING

**Test Steps Executed:**
- [ ] Used contract with active installment schedule
- [ ] Opened contract detail page
- [ ] Located installments section
- [ ] Clicked "Record Payment"
- [ ] Entered payment amount and date
- [ ] Uploaded receipt (optional)
- [ ] Submitted payment
- [ ] Verified amortization schedule updates

**Expected Results:**
- ✅ Payment recording UI accessible
- ✅ Can enter valid amount
- ✅ Can select due date
- ✅ Can upload receipt
- ✅ Payment saved to database
- ✅ Amortization updates:
  - Payment status shown
  - Remaining balance updated
  - Next due date shown

**Actual Result:** [TBD]

**Screenshots:** [TBD]

**Notes:** [TBD]

---

## Issues Found

### Critical Issues
(None found yet - TBD)

### Major Issues
(None found yet - TBD)

### Minor Issues
(None found yet - TBD)

### Observations
(TBD)

---

## Test Data Created

### Customers
- `personal-user-001`: Type = personal, for installment contracts
- `individual-user-001`: Type = individual, for installment contracts
- `finance-user-001`: Type = finance, legacy test

### Sales
- `installment-sale-001`: payment_method = installment, 50,000 THB
- `installment-sale-002`: payment_method = installment, 75,000 THB
- `finance-co-sale-001`: payment_method = finance_company, 30,000 THB (legacy)

### Contracts Created
- `contract-inst-001`: From installment-sale-001
- [TBD - additional contracts created during testing]

---

## Acceptance Criteria Checklist

- [ ] All 10 test scenarios pass (TC-71-1-1 through TC-71-4-2)
- [ ] No "finance company" terminology found in UI
- [ ] Contract creation with installment sales works end-to-end
- [ ] Backward compatibility maintained for old contracts
- [ ] No regressions in related features
- [ ] Test report posted as comment on [TDS-71](/TDS/issues/TDS-71)
- [ ] Screenshots/evidence attached

---

## Sign-Off

**Tester:** QA Tester
**Test Completion Date:** [TBD]
**Approval Status:** ⏳ PENDING

---

## Appendices

### A. Test Environment Details
- Node version: [TBD]
- pnpm version: [TBD]
- Database: [TBD]
- Browser: [TBD]

### B. Logs / Error Output
```
[TBD]
```

### C. Screen Recording / Videos
[TBD - Links to any video evidence]

### D. Related Issues
- Blocked by: [TDS-70](/TDS/issues/TDS-70) (Frontend contracts fix)
- Blocked by: [TDS-69](/TDS/issues/TDS-69) (Backend contracts service)
- Parent: [TDS-64](/TDS/issues/TDS-64) (Sales Workflow Redesign Phase 2)
