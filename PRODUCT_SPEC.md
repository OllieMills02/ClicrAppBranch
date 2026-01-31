# CLICR — Full App Build Spec (Mobile App + Backend)

## Global Build Requirement: No Placeholders / Fully Functional App

**This must be a fully functioning production-ready app. Every screen, button, tab, link, toggle, and feature must be fully built out end-to-end. Nothing can be left as a mock, placeholder, “coming soon,” dead link, or non-functional UI element.**

**Rules:**

1. If a button exists, it must perform the correct action and show success/error states.
2. If a feature is shown in UI, it must have full backend support (create/read/update/delete) and correct permissions.
3. All navigation must work across all tabs with real data persistence.
4. All forms must validate inputs and handle edge cases.
5. All actions must be auditable where applicable (resets, bans, exports, user role changes).
6. All realtime features must actually sync across devices/users.
7. Reports and exports must generate real files (Excel/PDF) and download successfully.
8. No empty pages: every tab must have working default states, empty states, loading states, and error states.
9. Offline scenarios must be handled (queue + sync) for counting and scanning where required.

---

## Product summary

**CLICR combines live, communicated counters with an easy-to-use ID scanner to show real-time occupancy and foot traffic from anywhere — plus clean reporting to look back on.**
It replaces **clunky standalone ID scanners** and **analog clickers** with **one connected platform**.

---

## Platforms

1. **iOS app (primary)**: operator app used by door staff + managers
2. **Web dashboard (optional but recommended)**: deep reporting + admin (can be Phase 2)
3. **Cloud backend**: authentication, realtime sync, event storage, exports, ban lists

---

## Core Concepts / Data Model

### Business (Tenant)

* Business name, timezone, owner
* Team members + roles
* Settings (reset rules, export defaults, privacy mode)

### Venue

* Venue name, address (optional)
* Capacity limit (optional)
* Contains Areas

### Area

* Area name
* Optional capacity limit
* Contains Clicrs (logical clickers)

### Clicr (Communicated counter)

A “Clicr” is a logical counter assigned to an Area.

* Name (e.g., “Main Entry”, “VIP Exit”)
* Mode: `IN_ONLY`, `OUT_ONLY`, `BIDIRECTIONAL`
* Live occupancy is computed from events and syncs to all authorized devices instantly

### CountEvent (append-only event log, the source of truth)

* timestamp (server), user_id, venue_id, area_id, clicr_id
* delta (+1, -1, +10, etc.)
* event_type: tap, bulk adjust, reset, admin override
* idempotency_key (prevents duplicates / supports offline sync)

### IDScanEvent (append-only)

* timestamp
* scan_result: accepted/denied
* derived values: age, age_band, gender/sex field, postal code/region
* link to CountEvent if accepted and auto-add is enabled
* stored ID token for watchlist/ban matching (see Privacy Mode)

---

## Roles & Permissions (must exist)

* **Owner/Admin**: everything (structure, users, bans, exports, resets)
* **Manager**: view/operate; exports; resets (optional)
* **Door Staff**: counting + ID scanning only for assigned venues/areas/clicrs
* **Viewer** (optional): read-only dashboards

---

# App Flow

## 1) App Store Download → Create Account → Onboarding Wizard

### Onboarding goals

* Build the tenant structure in minutes
* Avoid confusion: users should finish onboarding already “ready to run the door”
* Auto-create sensible defaults, but allow edits later

### Onboarding screens (step-by-step)

**Step A — Account**

* Email + password (or SSO later)
* Business Name (required)
* Timezone (required)
* Accept Terms

**Step B — Venues**

* Add 1+ venues
* Venue name required
* Optional: venue capacity limit

**Step C — Areas (per venue)**

* Add areas under each venue (e.g., “Main Floor”, “Patio”, “VIP”)
* Optional: area capacity

**Step D — Clicrs (per area)**
For each area:

* Ask: “How many Clicrs in this area?”
* Create that many rows with:

  * Clicr name (required)
  * Mode (IN/OUT/BIDIRECTIONAL)
* Provide templates:

  * Entry/Exit pair (1 IN + 1 OUT)
  * Busy door setup (2 IN + 1 OUT)
  * Single device (1 BIDIRECTIONAL)

**Step E — ID Scanner Setup**

* Ask: “Are you using an external Bluetooth ID scanner?”

  * Yes → Pair now
  * Not now → Skip (can enable later)
* Ask: “Should accepted scans automatically add +1 to occupancy?”

  * Default: ON (can be configured per area)

**Step F — Review**

* Summary screen showing:

  * Business → venues → areas → clicrs
  * ID scan mode (auto-add ON/OFF)
* Confirm → Finish

### Post-onboarding landing

Send user directly to **Setup Dashboard** that mirrors what they configured.

---

## 2) Main Navigation (tabs)

* **Dashboard**
* **Venues**
* **Areas**
* **Clicr**
* **Reports**
* **Settings**

(You can keep Business as a section inside Settings.)

---

# Live Operations (The “Communicated Clickers” System)

## Real-time communication rules (non-negotiable)

* Every tap on any Clicr creates a **CountEvent**
* Backend updates live occupancy projections immediately
* Backend broadcasts realtime updates to all authorized devices (WebSocket/SSE)
* All counts stay consistent across:

  * Staff devices
  * Manager devices
  * Dashboard views

### Live metrics (always available)

* Live Occupancy
* Traffic In (today/session)
* Traffic Out (today/session)
* Peak occupancy + timestamp

### Offline behavior

* If device is offline:

  * queue events locally with idempotency keys
  * sync on reconnect
  * backend dedupes and replays updates
* Occupancy must never go negative for staff; admin override exists

---

# ID Scanning (External Bluetooth Scanner) + Auto-Add to Count

## Supported scanner behavior

Many Bluetooth ID scanners behave like a **Bluetooth keyboard (HID)** and “type” the PDF417/AAMVA data into a focused text field.

### ID Scan input requirements

* The app must have a dedicated scan screen with an always-focused input capture area:

  * hidden text input to receive scanner output
  * detect scan completion by terminator (newline/return) or timing threshold
* Parse PDF417/AAMVA payload to derive:

  * date of birth → age + age band
  * sex/gender field (as provided by ID standard)
  * postal code → “region”
  * expiration status
* Determine **accepted vs denied** based on your rules:

  * of-age threshold (venue-configurable, default 21)
  * expiration / invalid format / banned token

## Auto-add occupancy (critical)

If scan_result = ACCEPTED and auto-add is enabled:

* create a CountEvent `+1` into the configured “Entry Clicr” for that area
* user should see:

  * “Accepted ✅”
  * “+1 added to occupancy”
  * occupancy updates instantly

If denied:

* no count event
* show denial reason:

  * underage / expired / banned / invalid

## Scanner pairing UX

In Settings:

* “Scanner Devices”

  * Pair new scanner (Bluetooth)
  * Choose default scanner per device
  * Test scan
  * Troubleshooting tips

> Optional later: camera-based scanning as fallback.

---

# Reports & Analytics (What operators actually need)

Reports must be **readable**, actionable, and exportable.

## Report categories

### A) Foot Traffic + Occupancy

* Occupancy over time (line)
* Traffic In vs Traffic Out (line or stacked)
* Peak occupancy + time
* Time near/at capacity (if capacity configured)

### B) Demographics (from ID scans)

* Age distribution (bar by age band)
* Gender/sex distribution (bar/pie)
* Region distribution (based on postal code/state/country)

  * Show “Top ZIPs” or “Top Regions” charts
* Accepted vs denied ratio

### C) Operational Insights (simple but powerful)

* “Busiest hour” and “slowest hour”
* “Scan acceptance rate”
* “Avg arrivals per 15 min”
* “Projected busy window” (future feature, can be placeholder)

## Exports

Reports must export as:

* **Excel (.xlsx)** (multi-sheet)
* PDF
* CSV (optional)

Excel workbook sheets recommended:

* Summary
* Occupancy_TimeSeries
* Traffic_In_Out
* Demographics_Age
* Demographics_Gender
* Demographics_Region
* Event_Log (admin/manager only)

Exports generate a background job:

* queued → processing → ready
* downloadable link (time-limited)

---

# Settings (Admin Center)

## A) Team & Roles

* Invite user
* Assign role
* Assign allowed venues/areas/clicrs

## B) Ban staff users (business-wide or venue-level)

* Ban from business OR selected venues
* Duration: temporary or permanent
* **Required reason + notes**
* Force logout on ban
* Maintain audit history

## C) Patron watchlist / bans (from ID scan data)

You said: “store the data pulled from the ID in order to ban them or look back.”

### IMPORTANT: Privacy-forward design (recommended default)

Do **not** store full raw ID data by default. Instead:

* Store derived attributes (age band, gender/sex, region)
* Store a **non-reversible token** for matching the same ID again:

  * `patron_token = HMAC_SHA256(issuer + id_number + DOB, secret_salt)`
    This allows:
* recognize repeat scans
* ban/watchlist matching
* without storing name/address/license number in plain form

### Patron Ban record

* patron_token
* status: watchlist / banned
* scope: business-wide or venue-specific
* reason category + reason text (required)
* created_by, timestamps
* optional expiry date (temporary bans)

### Scan-time behavior

When scanning an ID:

* compute patron_token
* check ban list
* if banned:

  * show “BANNED” + reason + instructions
  * do not auto-add to count

### “Look back” behavior

In Reports:

* allow managers to view scan history by filters (time range, venue, area)
* optionally show “repeat visitor count” using patron_token frequency
* never expose raw ID fields if privacy mode is on

## D) Operational settings

* Reset rules (manual / scheduled)
* Capacity thresholds (warn at 80/90/100%)
* Auto-add count on accepted scan (global default + override per area)
* Export defaults

---

# Reset (Implementation Guidance so it actually works)

Reset must be event-based and realtime:

* Create a RESET event in the CountEvent log
* Recompute projection for that scope (area/venue/business) to new baseline
* Broadcast update to all devices instantly
* Clear device caches for that scope

Common failure to avoid:

* updating UI number without writing reset event (or writing event without updating projections)
