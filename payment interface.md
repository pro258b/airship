Go to Product catalog > Pricing tables in your Stripe Dashboard.
Create a pricing table with your products and customise its appearance.
Copy the generated embed code and paste it into your website's HTML.


 Added stable handle slugs to every item so Stripe records map directly to UI entries (airship/shop.js:5).
  - Introduced DOM-driven registry discovery plus Stripe price hydration helpers that fetch, normalise, and stamp
  price tags (airship/shop.js:207-312), and wired them into rendering/buy flows (airship/shop.js:330-378).
  - Declared the registry location in markup for discovery (airship/shop.html:7) and seeded a writable price cache
  scaffold (airship/stripe-prices.json:1).
  - Delivered a standalone Stripe CLI utility with dry-run support to create prices and persist mappings
  incrementally (airship/scripts/stripe_price_manager.js:1-211).
  - Logged the completed engineering stage in the implementation plan (airship/IMPLEMENTATION_PLAN.md:55-59).

  Testing

  - node scripts/stripe_price_manager.js list

  Notes

  - No Python code touched; no decorators or other Pythonic constructs applied.
  - Populate actual Stripe price data by running node scripts/stripe_price_manager.js create … with real
  STRIPE_SECRET_KEY, then reload shop.html to confirm live price hydration.