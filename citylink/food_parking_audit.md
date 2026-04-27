# CityLink Audit: Food & Parking Ecosystems 🍽️🚗

**Auditor**: Antigravity (World-Class CTO/QA/Architect)
**Date**: 2026-04-20
**Scope**: `food.service.ts`, `parking.service.ts`, Database Schema

---

## 🍽️ Restaurant (Food) Ecosystem Audit

### 1. Data Model Conflict: "Split Brain" 🚨
The service layer is currently in a "Split Brain" state, querying two different tables for identical data:
*   `fetchFoodItems` queries `food_items`.
*   `fetchRestaurantMenu` queries `menu_items`.
*   **Risk**: Logic drift and data fragmentation. Changes made to a restaurant's menu in one dashboard might not appear in the citizen's shopping screen.
*   **Recommendation**: **UNIFY** into `menu_items`. Deprecate `food_items`.

### 2. Transaction Integrity ✅
*   **Status**: Excellent.
*   **Logic**: Uses `process_food_purchase` RPC for atomic order placement and wallet deduction.
*   **Logic**: Uses `complete_food_order_payout` RPC for secure merchant payouts.

---

## 🚗 Parking Ecosystem Audit

### 1. Payment Resilience: "Saga Pattern" 💎
*   **Finding**: The `endParkingSession` implementation is world-class.
*   **Mechanism**: It implements a "Compensating Transaction" flow. If the session update fails after the payment is deducted, the system automatically triggers a refund to the user's wallet with idempotent keys.
*   **Resilience**: It correctly flags `refund_failed` for manual admin intervention in the rare case of a total system failure.

### 2. Double-Booking Vulnerability ⚠️
*   **Finding**: `startParkingSession` is a direct `INSERT`.
*   **Risk**: It lacks an atomic "check-then-set" lock. A user could theoretically start multiple sessions for the same spot, or two users could "squat" on the same spot simultaneously if their requests arrive at the same time.
*   **Recommendation**: Migrate to a `start_parking_session` RPC that checks spot availability and user session status in a single Postgres transaction.

---

## 🛠️ Action Plan

### Immediate Cleanup
1.  **Unify Food Tables**: Migrate any data from `food_items` to `menu_items` and update `food.service.ts` to use only `menu_items`.
2.  **Harden Parking Start**: Create the `start_parking_session` RPC to ensure spot occupancy is locked atomically.

### Strategic
- Remove legacy "Mock" blocks (`if (!hasSupabase())`) from production service files to reduce bundle size and prevent accidental mock data exposure.

---
**Verdict**: The **Parking** logic is the most resilient part of the app so far. The **Food** logic is secure but needs data model cleanup to prevent future bugs.
