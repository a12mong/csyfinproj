# TDS-71 QA Test Plan: Contracts Module Alignment with Installment Sales

## Overview
Verify that the contracts module has been updated to work with the new installment sales workflow (replacing old finance_company approach) with proper dual-customer support and UI/text updates.

## Test Environment Setup
- **URL:** http://localhost:3000 (or staging URL)
- **Database:** Fresh test data with sample customers and sales
- **Focus Areas:**
  - Contract creation flow (4 steps: Customer → Sales → Terms → Preview)
  - Sales linking UI
  - Contract display and payment recording
  - Backward compatibility

---

## Test Scenarios

### GROUP 1: Contract Creation with Installment Sales

#### Test 1.1: Installment Sale Appears in Contracts (TC-71-1-1)
**Objective:** Verify Step 2 (Sales) shows only installment sales, not finance_company sales

**Steps:**
1. Create a test customer (type: personal or individual)
2. Create two sales for this customer:
   - Sale A: payment_method = "installment", amount = 50,000
   - Sale B: payment_method = "finance_company", amount = 30,000 (legacy)
3. Open Contracts page → Click "New Contract"
4. Step 1: Select the test customer
5. Step 2: Verify sales list

**Expected Results:**
- ✅ Only Sale A (installment) appears in the list
- ✅ Sale B (finance_company) is NOT shown
- ✅ No filter by customer type (all types should see installment sales)
- ✅ Text says "Select installment sales to link" (not "finance-company")

**Notes:** This is the critical change from TDS-70

---

#### Test 1.2: Principal Auto-Suggested from Finance Amount (TC-71-1-2)
**Objective:** Verify principal field auto-populates from selected installment sale

**Steps:**
1. From previous test, select Sale A (installment, amount 50,000)
2. Step 3 (Terms): Observe the Principal field

**Expected Results:**
- ✅ Principal field auto-fills with 50,000 (the sale's finance amount)
- ✅ User can manually override if needed

**Notes:** This supports the business logic: installment sale amount → contract principal

---

#### Test 1.3: Contract Created with 2-Party Structure (TC-71-1-3)
**Objective:** Verify contract has exactly 2 parties (CSY + Customer), not 3-party with finance company

**Steps:**
1. Continue from Test 1.2
2. Fill in remaining terms (annual interest rate, num installments, start date)
3. Step 4 (Preview): Review contract parties
4. Submit → Create contract
5. Open the created contract detail page
6. Check Contract Parties section

**Expected Results:**
- ✅ Contract has exactly 2 parties:
  1. CSY (company/creditor)
  2. Customer (debtor - matching selected customer)
- ✅ NO third party for finance company
- ✅ Contract displays party roles correctly
- ✅ CSY appears with proper credentials/identification

**Notes:** Verify in both preview and final saved contract

---

#### Test 1.4: Installment Schedule Generates Correctly (TC-71-1-4)
**Objective:** Verify amortization schedule matches requested terms

**Steps:**
1. From created contract (Test 1.3):
2. Open the contract and view Amortization Schedule
3. Verify schedule calculations:
   - Number of rows = num_installments
   - Sum of principal = original principal
   - Due dates = start_date + 1 month, +2 months, etc.
   - Interest calculation matches annual rate

**Expected Results:**
- ✅ Schedule has correct number of rows
- ✅ Principal and interest breakdown is accurate
- ✅ Balance reduces to 0 by final installment
- ✅ Due dates increment by 1 month each
- ✅ If annual_rate = 0%, no interest shown
- ✅ If annual_rate > 0%, interest calculated correctly

**Notes:** Use the amortization calculation formula from page.tsx lines 82-122

---

### GROUP 2: Text and UI Verification

#### Test 2.1: No "Finance Company" Terminology (TC-71-2-1)
**Objective:** Verify all old "finance company" language has been replaced

**Steps:**
1. Navigate to Contracts page
2. Click "New Contract"
3. Step 1 & 2: Review all labels, descriptions, and messages
4. Check for any remaining references to:
   - "Finance company"
   - "Finance institution"
   - "Financial institution" (legacy term)
5. Contract detail page: Check all sections
6. Search page if applicable

**Expected Results:**
- ✅ NO occurrences of "finance company" (case-insensitive)
- ✅ Language updated to "installment sale" or "installment"
- ✅ Message examples:
  - "Select installment sales to link. Principal will be auto-suggested from selected sales."
  - "No active installment sales found for this customer."
- ✅ Empty state messages updated

**Notes:** This is a critical requirement from TDS-70

---

#### Test 2.2: Customer Type Badges in Selector (TC-71-2-2)
**Objective:** Verify customer type badges appear in customer selector

**Steps:**
1. Open Contracts page → New Contract
2. Step 1 (Customer selector): View customer list
3. Check each customer for type badge

**Expected Results:**
- ✅ Each customer shows a type badge:
  - personal → Blue badge with "Personal"
  - individual → Green badge with "Individual"
  - finance → Amber badge with "Finance"
- ✅ Badges are positioned consistently
- ✅ Badges are readable (good contrast)
- ✅ Badges match design in Sales modal

**Notes:** Customer type badges should follow same styling as sales modal (TDS-67)

---

### GROUP 3: Backward Compatibility

#### Test 3.1: Old Finance Company Sales Still Display (TC-71-3-1)
**Objective:** Verify existing contracts linked to old finance_company sales still work

**Setup:**
1. Ensure database has contracts created with old finance_company sales
2. These contracts should have been created before this sprint

**Steps:**
1. Navigate to Contract list page
2. Search for contracts linked to finance_company sales
3. Open each contract detail page
4. Verify all information displays correctly

**Expected Results:**
- ✅ Old contracts appear in list (not hidden)
- ✅ All contract details load without errors
- ✅ Display shows contract parties (might show finance company if stored)
- ✅ Amortization schedule displays
- ✅ No JavaScript errors in console
- ✅ Payment recording still functional (Test 4.2)

**Notes:** Migration may not delete old records, just prevent new ones from being created

---

#### Test 3.2: Contract List Shows All Contracts (TC-71-3-2)
**Objective:** Verify both old and new contracts visible in list

**Steps:**
1. Contract list page
2. Apply filters: Status = "All", no other filters
3. Verify both:
   - New contracts linked to installment sales
   - Old contracts linked to finance_company sales

**Expected Results:**
- ✅ Both types appear in the list
- ✅ Filtering by status works correctly
- ✅ Pagination works for large lists
- ✅ Search functionality works

---

### GROUP 4: Regression Testing

#### Test 4.1: Sales List/Detail Still Works (TC-71-4-1)
**Objective:** Verify sales module not broken by contract changes

**Steps:**
1. Navigate to Sales page
2. Create a new installment sale
3. View sale detail page
4. Check that:
   - Customer selection works
   - Payment method = installment
   - Finance amount displays
   - All fields editable
5. Check sales list filters
6. Try filtering by payment_method and status

**Expected Results:**
- ✅ Create sale works end-to-end
- ✅ Sales list page loads
- ✅ Detail page shows all fields
- ✅ Filters work correctly
- ✅ No JavaScript errors
- ✅ Customer type badges appear (if implemented)

**Notes:** Verify sales module not affected by contract updates

---

#### Test 4.2: Payment Recording for Contract Installments (TC-71-4-2)
**Objective:** Verify users can record payments against contract installments

**Steps:**
1. Use a contract with active installment schedule (from Test 1.4)
2. Navigate to contract detail page
3. Find Installments/Amortization section
4. Attempt to record payment for first installment:
   - Click "Record Payment" or similar button
   - Enter amount and date
   - Upload receipt image (optional)
5. Verify payment recorded

**Expected Results:**
- ✅ Payment recording UI accessible
- ✅ Can enter amount (should match or be less than due amount)
- ✅ Can select due date
- ✅ Can upload receipt/proof
- ✅ Payment saved to database
- ✅ Amortization schedule updates to show:
   - Payment status
   - Remaining balance
   - Next due date

**Notes:** Critical for debt collection workflow

---

## Test Data Requirements

### Sample Customers
```
Customer 1 (Personal)
- Name: John Personal
- Phone: 089-123-4567
- ID Card: 1234567890123
- Type: personal

Customer 2 (Individual)
- Name: Jane Business
- Phone: 089-234-5678
- ID Card: 9876543210987
- Type: individual

Customer 3 (Finance) [Legacy]
- Name: Finance Firm Co.
- Phone: 089-345-6789
- ID Card: 5555555555555
- Type: finance
```

### Sample Sales
```
Sale 1 (Installment - for Customer 1)
- payment_method: installment
- finance_amount: 50,000
- status: active

Sale 2 (Finance Company - for Customer 1) [Legacy]
- payment_method: finance_company
- finance_amount: 30,000
- status: active

Sale 3 (Installment - for Customer 2)
- payment_method: installment
- finance_amount: 75,000
- status: active
```

---

## Execution Results Template

### Summary
- **Total Tests:** 10
- **Passed:** ___
- **Failed:** ___
- **Blocked:** ___
- **Date Tested:** ___
- **Tester:** QA Tester (Agent)

### Test Results

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| TC-71-1-1 | Installment Sale Appears | ⬜ | |
| TC-71-1-2 | Principal Auto-Suggested | ⬜ | |
| TC-71-1-3 | 2-Party Contract Structure | ⬜ | |
| TC-71-1-4 | Installment Schedule | ⬜ | |
| TC-71-2-1 | No Finance Company Terms | ⬜ | |
| TC-71-2-2 | Customer Type Badges | ⬜ | |
| TC-71-3-1 | Old Sales Compatibility | ⬜ | |
| TC-71-3-2 | Contract List All Contracts | ⬜ | |
| TC-71-4-1 | Sales Module Still Works | ⬜ | |
| TC-71-4-2 | Payment Recording Works | ⬜ | |

### Bugs Found
(To be filled during testing)

### Screenshots/Evidence
(To be attached)

---

## Success Criteria (from issue)
- ✅ All test scenarios pass (10/10)
- ✅ No "finance company" terminology in UI
- ✅ Contract creation with installment sales works end-to-end
- ✅ Backward compatibility maintained
- ✅ No regression in related features
- ✅ Test report posted as comment on TDS-71

---

## Blockers
- ⏳ TDS-70 (Frontend contracts fix) - must be completed before testing
- ⏳ TDS-69 (Backend contracts service) - must be completed before testing

**Ready to execute:** When TDS-70 status = "done"
