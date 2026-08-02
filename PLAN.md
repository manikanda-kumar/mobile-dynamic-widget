# Dynamic Experience Platform (DXP)

## Vision

Build a backend-driven mobile experience platform where the application becomes a renderer while all personalization, widget ordering, layouts, themes, experiments and business logic are controlled from the backend.

The objective is to ship new experiences without requiring mobile releases.

---

# Goals

- Backend controls entire home screen
- Personalized widgets per customer
- Dynamic widget ordering
- A/B experimentation
- Feature flags
- Theme customization
- Analytics driven optimization
- Zero app updates for experience changes

---

# Architecture

                    Mobile App
                        │
            Widget Rendering Engine
                        │
        Layout / Theme / Widget Registry
                        │
──────────────────────────────────────────
        Experience Platform Backend
──────────────────────────────────────────

• Personalization Engine
• Rules Engine
• Widget Manifest Service
• Theme Service
• Experiment Engine
• CMS
• Analytics Pipeline

---

# Widget Manifest

The backend returns a JSON manifest.

Example

{
  "version": 3,
  "theme": "banking_dark",
  "layout": "home_v2",
  "widgets": [
    {
      "type": "loan_offer",
      "priority": 10
    },
    {
      "type": "complete_kyc",
      "priority": 20
    }
  ]
}

The app only renders predefined widgets.

No arbitrary UI generation.

---

# Layout Engine

Support

- Horizontal Cards
- Vertical Cards
- Grid
- Carousel
- Full Width Banner
- Composite Layouts

Example

1x1
2x1
2x2
3 column
Nested layouts

---

# Widget Types

- Loan Offers
- Credit Card Offers
- FD
- Pledge
- KYC
- vKYC
- Email Verification
- Mobile Verification
- Birthday
- Anniversary
- Rewards
- Cashback
- Payments
- Investments

---

# Personalization Inputs

- Customer Segment
- Products Owned
- Risk
- Eligibility
- Geography
- Campaigns
- ML Scores
- Recent Activity
- Device
- Session

---

# Analytics

Track

- Impressions
- Clicks
- Dwell Time
- Scroll
- Conversion
- Drop-offs
- Widget Ranking
- Experiment Results

---

# Tech Stack

Backend

- Kotlin
- Spring Boot
- PostgreSQL
- Redis
- Kafka

Mobile

- React Native
- Dynamic Renderer

CMS

- Headless CMS

---

# Milestones

## Phase 1

- Widget Registry
- Layout Engine
- Manifest API

## Phase 2

- Rules Engine
- Personalization

## Phase 3

- Experiments
- Analytics

## Phase 4

- CMS
- Themes
- Optimizations

---

# Success Criteria

- New widgets without app release
- Dynamic layouts
- Personalization
- Experiment support
- High rendering performance
