# Product Suggestion Algorithm Improvements

## Current Algorithm Strengths
- ✅ Semantic matching with word boundaries
- ✅ Preference type weighting
- ✅ Field-based scoring (name, tags, description, category)
- ✅ Diversity bonus for multiple matches

## Proposed Improvements

### 1. **Use Rich Product Metadata** (HIGH PRIORITY)
Products have rich metadata fields that aren't being used:
- `targetAudience`: ["for-her", "for-him", "for-kids", "for-teens"]
- `occasionTags`: ["birthday", "valentine", "christmas"]
- `giftStyleTags`: ["thoughtful", "luxury", "practical"]
- `ageGroupTags`: ["child", "teen", "young-adult"]
- `interestTags`: ["sports", "music", "reading"]
- `relationshipTags`: ["family", "friend", "romantic"]
- `priceRange`: "budget", "mid-range", "luxury"
- `lifestyleTags`: ["urban", "active", "homebody"]

**Implementation**: Match recipient's relationship, age range, and preferences to these tags.

### 2. **Analytics-Based Ranking** (HIGH PRIORITY)
Use `product_analytics_events` table to boost:
- Products with high view counts
- Products frequently added to wishlist
- Products with purchases
- Products with shares

**Implementation**: Add popularity score based on analytics events.

### 3. **Relationship-Aware Matching** (MEDIUM PRIORITY)
Map recipient relationship to `relationshipTags`:
- "Wife" → ["romantic", "family"]
- "Friend" → ["friend"]
- "Mother" → ["family", "romantic"] (if applicable)
- "Father" → ["family"]

### 4. **Age Group Matching** (MEDIUM PRIORITY)
Match recipient's `ageRange` to product's `ageGroupTags`:
- "18-25" → ["young-adult"]
- "26-30" → ["adult"]
- "31-40" → ["adult"]
- etc.

### 5. **Price Range Consideration** (LOW PRIORITY)
If recipient has budget preferences, match to `priceRange` tags.

### 6. **Occasion Awareness** (MEDIUM PRIORITY)
Detect upcoming occasions based on:
- Current date
- Recipient's recent life events
- Match to `occasionTags`

### 7. **Synonym Expansion** (MEDIUM PRIORITY)
Expand keywords with synonyms:
- "running" → ["jogging", "marathon", "fitness"]
- "drawing" → ["art", "sketching", "painting"]
- "music" → ["songs", "melody", "tunes"]

### 8. **Recency Boost** (LOW PRIORITY)
Slightly boost newer products (based on `createdAt`).

### 9. **Stock Availability** (HIGH PRIORITY)
Penalize or exclude out-of-stock products.

### 10. **Vendor Reputation** (LOW PRIORITY)
If vendor ratings exist, boost products from highly-rated vendors.

## Implementation Priority

**Phase 1 (Immediate)**:
1. Use rich product metadata (targetAudience, relationshipTags, ageGroupTags, interestTags)
2. Stock availability check
3. Analytics-based popularity boost

**Phase 2 (Short-term)**:
4. Relationship-aware matching
5. Age group matching
6. Synonym expansion

**Phase 3 (Long-term)**:
7. Occasion awareness
8. Price range matching
9. Vendor reputation
10. Recency boost

