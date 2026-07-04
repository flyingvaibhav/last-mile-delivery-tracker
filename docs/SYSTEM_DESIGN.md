# System Design Document - Last-Mile Delivery Tracker

This document details the architectural specifications and core algorithms driving the Last-Mile Delivery Tracker platform.

---

## 1. Rate Calculation Engine

The Rate Calculation Engine ensures dynamic, admin-configurable pricing with zero hardcoded values.

### Mathematics & Formulae
The engine uses standard volumetric conversions:
1. **Volumetric Weight ($W_v$)**:
   $$W_v = \frac{L \times B \times H}{5000}$$
   *Where dimensions $L, B, H$ are in centimeters and result is in kilograms.*
2. **Billed Weight ($W_b$)**:
   $$W_b = \max(W_a, W_v)$$
   *Where $W_a$ is the actual weight of the package.*
3. **Freight Charge ($C_f$)**:
   $$C_f = C_{base} + (W_b \times R_{kg})$$
   *Where $C_{base}$ is the base handling charge and $R_{kg}$ is the rate per kilogram. Both values are loaded dynamically from the route's active `RateCard`.*
4. **Final Bill ($C_{total}$)**:
   $$C_{total} = (C_f \times M_{vehicle}) + S_{cod}$$
   *Where $M_{vehicle}$ represents the vehicle multiplier (1.0x for 2-Wheeler, 1.5x for Three-Wheeler, 2.5x for Tata Ace, and 4.0x for Pickup) and $S_{cod}$ represents the Cash-on-Delivery processing fee, loaded from `CODSurcharge` based on the category (`B2B` | `B2C`) if `paymentType === "COD"`.*

```
[Dimensions L x B x H] ---> Volumetric Wt (L*B*H/5000) ---\
                                                          ===> Max Weight ===> Apply Rate Card ---> Total Charge
[Actual Weight (Kg)]  -----------------------------------/                     (Base + Wt*PerKg)
```

---

## 2. Zone Detection Approach

Rather than relying on coordinate boundaries or polygon checks, the platform translates delivery points into zones using postal pincodes (or area strings):
* **Pincode Mapping (`Areas` collection)**: A single unique index maps each postal code to exactly one Zone (e.g. `110001` &rarr; `Zone North`).
* **Route Types**:
  * **Intra-Zone Route**: Pickup Zone ID matches Drop Zone ID. Base fee and per-kg rates are loaded from the intra-zone `RateCard` (e.g., `Zone North` to `Zone North`).
  * **Inter-Zone Route**: Pickup Zone ID differs from Drop Zone ID. Rates are loaded from the inter-zone route card (e.g., `Zone North` to `Zone West`).
* **Missing Config Handlers**: If a customer requests a route that does not have an active rate configuration in MongoDB, the pricing engine rejects the checkout preview with a descriptive warning (e.g., *No rate card configured for B2B shipments from Zone North to Zone West*), prompting the admin to configure the missing rate map.

---

## 3. Auto-Assignment Logic

The automated assignment system resolves delivery dispatching using localized geographic queries.

```
                    [Admin clicks Auto-Assign]
                                |
                                v
               Find Order Pickup Zone (Zone A)
                                |
                                v
     [Query Available Agents in Zone A (currentZoneId)]
              /                               \
     (Agent Found)                       (No Agent Found)
           /                                     \
Assign Agent & Set "Busy"                [Query Any Available Agent]
                                          /                       \
                                   (Agent Found)            (No Agent Free)
                                         /                           \
                              Assign Agent & Set "Busy"      Return "No Agents Available"
```

1. **Zone Matching**: When an admin triggers auto-assign, the scheduler reads the order's `pickupZoneId`.
2. **Zone Check**: It queries the `Agent` collection for agents who are:
   - Currently `availabilityStatus === "available"`
   - Currently located in `currentZoneId === pickupZoneId`
3. **Global Fallback**: If no available agent is located in the pickup zone, the system queries the entire database for any agent who is `availabilityStatus === "available"` regardless of location, minimizing package backlog.
4. **State Transition**: Upon assignment:
   - The Order's `agentId` is updated to the agent's Clerk ID.
   - The Agent's status is toggled to `"busy"` to lock them out of further auto-assignments.
   - An immutable audit trail entry is saved in `OrderStatusHistory` denoting the auto-assignment, and the customer is notified via email.

---

## 4. Failed-Delivery Handling & Rescheduling

The platform includes a self-healing lifecycle to handle delivery failures.

1. **Failure Input**: If a delivery agent marks a package as `"Failed"`, they must provide a reason (e.g., *Customer refused payment*).
2. **Alert Sequence**: The status updates to `"Failed"`. An email containing the failure reason is sent to the customer, and the agent's availability status is reverted to `"available"`.
3. **Customer Recovery**: The customer logs into their dashboard, views the timeline, and fills the rescheduling calendar.
4. **Lifecycle Reset**: Upon rescheduling:
   - The order's `rescheduledDate` is set.
   - The order's status reverts to `"Pending"`.
   - The order's `agentId` is cleared, and `failedReason` is reset.
   - The package re-enters the unassigned pool. It can now be auto-assigned or manually assigned to a new agent for the rescheduled date.
