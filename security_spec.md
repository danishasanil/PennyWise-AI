# PennyWise AI - Firestore Security Specification

## Data Invariants
1. Every user document (`/users/{userId}`) can only be created, read, and updated by the authenticated user whose `request.auth.uid == userId`.
2. All subcollection documents (`expenses`, `savingsGoals`, `purchaseAnalyses`, `payments`) strictly belong to `/users/{userId}/...` where `request.auth.uid == userId`.
3. An expense document cannot have negative amounts, must belong to the user, and must contain valid categories.
4. Savings goals must have positive target amounts, and current amounts cannot be manipulated by third parties.
5. Payment records cannot have their verified status altered except through confirmed backend verification, and cannot be accessed across different users.
6. Identity spoofing is prohibited: `userId` in path and author/owner matching `request.auth.uid` is strictly verified.
7. Timestamps and numeric values must strictly adhere to type safety and boundary sizes to prevent Denial of Wallet.

## The "Dirty Dozen" Threat Payloads (Blocked by Security Rules)
1. **Unauthenticated Read of User Profile**: Attacker calls `get(/users/victim123)` without auth -> `PERMISSION_DENIED`.
2. **Cross-User Profile Modification**: User `attacker` tries to `update(/users/victim123)` -> `PERMISSION_DENIED`.
3. **Spoofed Expense Creation**: User `attacker` tries to create an expense in `/users/victim123/expenses/exp1` -> `PERMISSION_DENIED`.
4. **Negative Expense Amount Injection**: User writes `{ amount: -500 }` to distort budget balance -> `PERMISSION_DENIED`.
5. **Overly Large String Bomb (Denial of Wallet)**: Injecting 2MB string into `notes` or `title` -> `PERMISSION_DENIED` (enforced via `.size() <= 200` and `.size() <= 1000`).
6. **Orphaned User Creation**: Writing to `/users/{userId}` where `userId != request.auth.uid` -> `PERMISSION_DENIED`.
7. **Cross-Tenant List Query**: Querying `collectionGroup('expenses')` without owner scoping -> `PERMISSION_DENIED`.
8. **Malicious Payment Record Falsification**: User attempting to inject verified PayPal status `{ status: 'COMPLETED', verified: true }` without legitimate backend signature/verification -> scoped to user and verified parameters.
9. **Invalid ID Path Variable Injection**: Writing to `/users/attacker%20junk$%^/expenses/1` -> `PERMISSION_DENIED` via `isValidId()`.
10. **State Shortcutting in Savings Goals**: Modifying read-only `createdAt` timestamp -> `PERMISSION_DENIED`.
11. **Shadow Field Injection**: Injecting `{ isAdmin: true, role: 'superadmin' }` into profile payload -> `PERMISSION_DENIED` via key validation.
12. **Unauthenticated List of All Expenses**: Public scrape attempt -> `PERMISSION_DENIED`.
