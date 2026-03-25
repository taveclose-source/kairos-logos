# LOGOS — PERSISTENT MEMORY + CONVERSATION DOWNLOADS
## Full Product Spec, Stripe Setup, and Implementation Plan

---

## PRICING MODEL

### Cost basis (our internal costs):
- Claude Haiku: ~$0.00025/1K input tokens, ~$0.00125/1K output tokens
- Average Ask query WITHOUT memory: ~1,000 input + 500 output = ~$0.00088/query
- Average Ask query WITH memory (adds ~1,500 token context): ~2,500 input + 500 output = ~$0.00088 + $0.000375 = ~$0.00125/query
- Memory overhead per query: ~$0.00037
- Industry markup: 5-8x for AI products
- Our target markup: 6x = charge $0.0022/memory-enhanced query

### Credit bundle pricing (our charge to user):
At $0.005 per query credit (6x markup on average memory query cost):
- $2.99 = 600 query credits
- $4.99 = 1,000 query credits  
- $9.99 = 2,100 query credits (~5% bonus)
- Auto-reload: $4.99 when balance hits 100 credits (~50 queries remaining)

### Who gets what:
| Feature                    | Free | Scholar | Ministry | Memory Add-on |
|----------------------------|------|---------|----------|---------------|
| Ask queries/day            | 3    | ∞       | ∞        | ∞             |
| Download conversations     | ✗    | ✓       | ✓        | ✓             |
| Persistent memory          | ✗    | ✗       | ✗        | ✓ (credits)   |
| Auto-reload memory credits | ✗    | ✗       | ✗        | ✓ (opt-in)    |
| Disable memory             | —    | —       | —        | ✓ (anytime)   |

Memory is an add-on available to Scholar and above ONLY.
Free users cannot purchase memory credits.

---

## STRIPE PRODUCTS TO CREATE

Create these in your Stripe dashboard at stripe.com/products:

### Product 1: Memory Credit Bundle — Starter
- Name: "Logos Memory Credits — Starter"
- Type: One-time payment
- Price: $2.99
- Description: "600 query credits for persistent Bible study memory"
- Metadata: credits=600, product_type=memory_credits
- Save the Price ID as: NEXT_PUBLIC_STRIPE_MEMORY_299

### Product 2: Memory Credit Bundle — Standard  
- Name: "Logos Memory Credits — Standard"
- Type: One-time payment
- Price: $4.99
- Description: "1,000 query credits for persistent Bible study memory"
- Metadata: credits=1000, product_type=memory_credits
- Save the Price ID as: NEXT_PUBLIC_STRIPE_MEMORY_499

### Product 3: Memory Credit Bundle — Value
- Name: "Logos Memory Credits — Value"
- Type: One-time payment
- Price: $9.99
- Description: "2,100 query credits — includes 5% bonus credits"
- Metadata: credits=2100, product_type=memory_credits
- Save the Price ID as: NEXT_PUBLIC_STRIPE_MEMORY_999

### Product 4: Auto-Reload Setup (for Stripe Setup Intent)
- This is not a product but a Stripe Setup Intent flow
- When user enables auto-reload, capture their payment method
- Store stripe_payment_method_id in memory_credits table
- Charge automatically when credits_remaining < auto_reload_threshold

---

## USER FUNNEL

### Entry points:
1. Ask page — after any query, show "Enable Memory" prompt
2. Dashboard — Memory status card with credits remaining
3. Profile/Settings — Memory management section
4. Pricing page — Memory add-on section

### Flow 1: Scholar user discovers memory
1. User asks a question on /ask
2. After answer appears, subtle banner below response:
   "💡 Enable memory so Logos remembers your study context"
   → "Learn more" link → Memory feature explanation modal
3. Modal explains the feature, shows pricing
4. "Enable Memory" → Stripe checkout for $4.99 starter bundle
5. On success: memory_credits row created, auto-reload prompt shown

### Flow 2: Purchase more credits
1. User sees "Credits: 45 remaining" in ask page header or dashboard
2. Clicks "Add Credits" → credit purchase modal
3. Three bundle options shown with credit counts
4. Select → Stripe one-time payment → credits added to account

### Flow 3: Auto-reload setup
1. After first credit purchase, show "Auto-reload" toggle
2. "Automatically purchase 1,000 credits ($4.99) when balance drops below 100"
3. User toggles on → Stripe Setup Intent to save payment method
4. Auto-reload fires via Stripe webhook → credits_remaining updated

### Flow 4: Disable memory
1. Profile > Study Memory > toggle off
2. Confirmation: "Memory will be paused. Your saved memory is preserved and will resume when you re-enable."
3. memory_enabled = false — memory context NOT injected into queries
4. Credits still accumulate/deplete only when enabled

### Flow 5: Download conversation
1. Any conversation in /ask shows download icon in top-right
2. Click → format selector: PDF or Plain Text
3. PDF includes: Logos branding, date, all Q&A, referenced verses
4. Plain text: simple formatted export
5. Available to Scholar and above — free users see lock icon with upgrade prompt

---

## IMPLEMENTATION FOR BUBBY

### New files to create:
- src/app/api/memory/route.ts — get/update user memory
- src/app/api/memory/credits/route.ts — purchase and deduct credits  
- src/app/api/memory/auto-reload/route.ts — Stripe auto-reload webhook handler
- src/app/api/ask/download/route.ts — generate PDF/text download
- src/components/MemoryBanner.tsx — post-query memory upsell
- src/components/MemoryModal.tsx — memory feature explanation + purchase
- src/components/CreditPurchaseModal.tsx — buy more credits
- src/app/settings/memory/page.tsx — memory management page

### Modified files:
- src/app/api/ask/route.ts — inject memory context when enabled, deduct credits
- src/app/ask/page.tsx — show credit balance, download button, memory banner
- src/app/dashboard/page.tsx — memory status card
- src/app/settings/profile/page.tsx — link to memory settings
- src/app/pricing/page.tsx — add memory add-on section

### Memory injection logic in ask/route.ts:
```
const memoryRecord = await getMemory(userId)
if (memoryRecord?.memory_enabled && memoryRecord?.credits_remaining > 0) {
  // Add memory context to system prompt
  systemPrompt += `\n\nUser study context:\n${JSON.stringify(memoryRecord.memory_data)}`
  // Deduct credits based on tokens used
  const creditsUsed = calculateCredits(inputTokens, outputTokens)
  await deductCredits(userId, creditsUsed)
  // Update memory after response
  await updateMemory(userId, question, answer)
}
```

### Credit calculation:
```
function calculateCredits(inputTokens: number, outputTokens: number): number {
  // 1 credit = approximately 1 query
  // Fine-grained: charge proportional to actual token usage
  const baseCost = (inputTokens * 0.00025 + outputTokens * 0.00125) / 1000
  const markup = 6
  const creditsUsed = baseCost * markup / 0.005
  return Math.ceil(creditsUsed * 100) / 100 // round up to 2 decimal places
}
```

### Stripe webhook additions:
Handle these events in existing webhook route:
- checkout.session.completed (type=memory_credits) → add credits
- payment_intent.succeeded (auto_reload) → add credits, log transaction
- payment_method.attached → save to memory_credits table

---

## MEMORY DATA STRUCTURE

The memory_data jsonb column stores:
```json
{
  "books_studied": ["John", "Romans", "Genesis"],
  "topics_explored": ["salvation", "covenant", "prophecy"],
  "theological_notes": "User is studying Pauline theology. Interested in TR/KJV distinctions.",
  "last_10_questions": [...],
  "church_context": "Baptist, KJV-only",
  "study_depth": "pastoral",
  "last_updated": "2026-03-18"
}
```

The agent reads this at session start and appends new
insights at session end based on the conversation.
Max memory size: 2,000 tokens to keep cost predictable.
