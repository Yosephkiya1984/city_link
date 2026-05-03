# World-Class Restaurant Management Blueprint

In top-tier international restaurant systems (like Toast, Square for Restaurants, or TouchBistro), the system is divided by **"Front of House"** (Hostess, Waiter), **"Back of House"** (Kitchen, Inventory), and **"Operations"** (Manager, Owner). 

Here is the industry-standard breakdown of exactly what each role should see and do. We will use this blueprint to lock down the CityLink Restaurant Dashboard.

---

### 1. The Owner (Super Admin)
**The Ultimate Authority.** The Owner's dashboard is heavily focused on the macro-level health of the business.
*   **Exclusive Access:** Full financial dashboard, bank withdrawal capabilities, tax reporting, and platform billing.
*   **Capabilities:** 
    *   Can override any system setting.
    *   Can add/remove Managers.
    *   Can view high-level analytics (peak hours, top-selling items, revenue trends).
*   **CityLink UI:** Sees ALL tabs (Overview, Orders, Menu, Tables, Stock, Finance, Staff).

### 2. The General Manager (Admin)
**The Operations Director.** The Manager runs the day-to-day business. They do not have access to the owner's bank account or withdrawal buttons, but they control everything else.
*   **Capabilities:**
    *   **Staffing:** Add/remove Waiters, Hostesses, and Kitchen Staff. Assign shifts and areas.
    *   **Store Control:** Toggle the restaurant as "Open" or "Closed" for online deliveries.
    *   **Menu & Inventory:** Add new dishes, change prices, and update ingredient stock levels.
    *   **Disputes:** Handle customer complaints or refund requests from the delivery side.
    *   **Floor Plan:** Actually *build* and edit the grid (moving tables, changing capacity).
*   **CityLink UI:** Sees Overview, Orders, Menu, Tables, Stock, Staff Management. (Cannot see Finance/Withdrawals).

### 3. The Hostess (Front of House Orchestrator)
**The Traffic Controller.** The Hostess is the first point of contact. Their entire job is maximizing table turnover and managing flow.
*   **Capabilities:**
    *   **Live Floor Plan:** They live on the "Tables" screen. They see which tables are cleaning, free, or reserved.
    *   **Reservations & Waitlist:** They accept or decline incoming reservations. They assign walk-ins to free tables.
    *   **Customer Chat:** They manage the Chat Portal to speak with guests who are running late or have special requests (allergies, anniversaries).
    *   **Note:** The Hostess *does not* take food orders or change the menu. They only manage *people and seating*.
*   **CityLink UI:** Sees ONLY the **Tables** tab and the **Chat Inbox**.

### 4. The Waiter / Server (Service Execution)
**The Revenue Generator.** The Waiter needs a fast, distraction-free interface to take orders and flip tables.
*   **Capabilities:**
    *   **Table Management (Assigned only):** They update the status of the tables they are serving (`Ordering` → `Serving` → `Paying` → `Cleaning` → `Free`).
    *   **Order Taking:** They punch in orders for walk-ins or add items to an existing reservation.
    *   **QR Check-in:** When a reserved guest arrives, the Waiter scans the guest's CityLink QR code to instantly verify them and link the table to their citizen app (for digital payment later).
*   **CityLink UI:** Sees ONLY the **Tables** tab and **Orders** tab.

### 5. The Kitchen Display System (Back of House)
*You didn't mention this, but it is standard in world-class systems!*
**The Engine Room.** A tablet mounted in the kitchen.
*   **Capabilities:**
    *   **Order Queue:** Sees a live stream of food tickets sent by the Waiters or Delivery App.
    *   **Status Updates:** Taps a ticket to mark it as "Preparing" and then "Ready for Pickup/Serving".
    *   **86'ing Items:** If they run out of tomatoes, the Kitchen can tap "Tomatoes" to mark it out of stock. This instantly updates the Waiter's tablets and the Citizen Delivery app so no one can order it.
*   **CityLink UI:** Sees ONLY an optimized **Kitchen Orders** queue and **Stock Alerts**.

---

### 6. Ethiopian Market Specifics (Cafes & Nightclubs)
Because CityLink is built specifically for Ethiopia, we must adapt the international standard to fit local realities:
*   **Nightclubs & VIP Lounges (The "Door" Role):** We will add a **Bouncer / Door** role. They need to scan QR codes for pre-paid VIP reservations or cover charges to prevent fraud at the door. Waiters at nightclubs need a "Bottle Service" quick-tap interface for extremely fast, high-volume drink orders.
*   **Traditional Restaurants (Gebeta/Shared Meals):** Ethiopian dining often involves groups sharing a single large platter (Mahberawi, Beyaynetu). The waiter's order system must easily handle adding multiple extra plates, extra injera, or split meat portions to a single central order.
*   **High-Volume Cafes (Macchiato/Buna):** For places with massive foot traffic (where people just grab a quick coffee), the "Table" concept might be too slow. Waiters in cafes will have a **"Quick Sale / Counter"** mode to punch in orders instantly without assigning a table.
*   **Connectivity Resilience:** Ethiopian internet can fluctuate. The Waiter dashboard must cache orders locally and sync the millisecond the connection returns, ensuring the kitchen never misses an order even during a brief network drop.

---

### How We Make This Real in CityLink

Your thoughts were extremely accurate and perfectly align with this model! To make this "World-Class" in our code, we will enforce strict **Role-Based Access Control (RBAC)** on the components:

1.  **The API Layer:** Ensure that if a Waiter's app gets hacked, the database itself rejects any attempt by a Waiter to delete a menu item.
2.  **The UI Layer:** We will clean up the `RestaurantDashboard.tsx` so that when Bambi (Waiter) logs in, the screen is clean, simple, and strictly shows their assigned tables and open orders.
