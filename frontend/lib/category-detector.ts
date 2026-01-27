/**
 * Category Auto-Detection
 *
 * Simple keyword-based category detection from merchant names and receipt text
 */

import { TRANSACTION_CATEGORIES } from './categories';

/**
 * Keyword mappings to categories
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': [
    // Restaurants & Fast Food
    'mcdonald', 'mcdonalds', 'burger king', 'kfc', 'subway', 'pizza hut', 'domino',
    'starbucks', 'costa', 'cafe', 'coffee', 'restaurant', 'bistro', 'grill',
    'diner', 'eatery', 'bakery', 'pizzeria', 'sushi', 'chinese', 'thai',
    'indian', 'mexican', 'italian', 'food', 'kitchen', 'tavern', 'pub',
    // Grocery Stores
    'grocery', 'supermarket', 'market', 'lidl', 'aldi', 'walmart', 'tesco',
    'sainsbury', 'waitrose', 'morrisons', 'asda', 'whole foods', 'trader joe',
    'kaufland', 'billa', 'carrefour', 'metro', 'fresh', 'organic',
    // Delivery
    'uber eats', 'deliveroo', 'just eat', 'doordash', 'grubhub', 'foodpanda',
  ],
  'Shopping': [
    // General Retail
    'amazon', 'ebay', 'target', 'walmart', 'costco', 'ikea', 'home depot',
    'lowes', 'best buy', 'apple store', 'store', 'shop', 'mall', 'retail',
    'outlet', 'boutique', 'mart', 'warehouse',
    // Clothing
    'zara', 'h&m', 'uniqlo', 'gap', 'nike', 'adidas', 'puma', 'primark',
    'fashion', 'clothing', 'apparel', 'shoes', 'footwear', 'jewelry',
    // Electronics
    'electronics', 'tech', 'computer', 'phone', 'mobile', 'gadget',
    // Online Shopping
    'etsy', 'wish', 'aliexpress', 'shopify',
  ],
  'Transportation': [
    // Gas & Fuel
    'shell', 'bp', 'exxon', 'mobil', 'chevron', 'texaco', 'petrol', 'gas station',
    'fuel', 'diesel', 'gasoline', 'lukoil', 'total', 'eni', 'petrom', 'omv',
    // Public Transit
    'uber', 'lyft', 'taxi', 'cab', 'transit', 'metro', 'subway', 'bus',
    'train', 'railway', 'airline', 'flight', 'parking', 'toll',
    // Car Services
    'car wash', 'auto', 'mechanic', 'tire', 'service center', 'repair',
  ],
  'Bills & Utilities': [
    // Utilities
    'electric', 'electricity', 'power', 'gas', 'water', 'sewage', 'utility',
    'energy', 'heating', 'cooling', 'hvac',
    // Communications
    'phone', 'mobile', 'internet', 'broadband', 'cable', 'tv', 'streaming',
    'netflix', 'spotify', 'hulu', 'disney', 'hbo', 'verizon', 'at&t', 't-mobile',
    'vodafone', 'orange', 'telekom', 'virgin',
    // Housing
    'rent', 'mortgage', 'landlord', 'property management', 'hoa',
  ],
  'Taxes & Insurance': [
    // Insurance
    'insurance', 'insure', 'policy', 'coverage', 'premium', 'geico', 'allstate',
    'progressive', 'state farm', 'liberty mutual', 'axa', 'allianz',
    // Health Insurance
    'health', 'medical', 'dental', 'vision', 'healthcare',
    // Taxes
    'tax', 'irs', 'hmrc', 'revenue', 'government', 'council',
  ],
  'Entertainment': [
    // Movies & Shows
    'cinema', 'movie', 'theater', 'theatre', 'amc', 'regal', 'imax',
    'concert', 'show', 'ticket', 'event', 'festival',
    // Gaming
    'game', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'epic games',
    // Sports & Recreation
    'gym', 'fitness', 'sport', 'club', 'yoga', 'spa', 'wellness', 'massage',
    'golf', 'tennis', 'swimming', 'bowling',
    // Subscriptions
    'subscription', 'membership', 'patreon',
    // Travel & Leisure
    'hotel', 'airbnb', 'booking', 'expedia', 'trip', 'vacation', 'resort',
    'museum', 'zoo', 'park', 'attraction', 'tour',
  ],
  'Salary': [
    'salary', 'payroll', 'wage', 'income', 'payment', 'employer',
    'compensation', 'bonus', 'commission',
  ],
};

/**
 * Detect category from merchant name and/or receipt text
 * @param merchantName - The merchant/store name
 * @param receiptText - Optional full receipt text for additional context
 * @returns Detected category or 'Other' if no match found
 */
export function detectCategory(merchantName: string, receiptText?: string): string {
  const searchText = `${merchantName} ${receiptText || ''}`.toLowerCase();

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Default to 'Other' if no match found
  return 'Other';
}

/**
 * Get confidence score for detected category
 * @param merchantName - The merchant/store name
 * @param receiptText - Optional full receipt text
 * @returns Object with category and confidence (0-1)
 */
export function detectCategoryWithConfidence(
  merchantName: string,
  receiptText?: string
): { category: string; confidence: number } {
  const searchText = `${merchantName} ${receiptText || ''}`.toLowerCase();
  let bestMatch: { category: string; matchCount: number } = { category: 'Other', matchCount: 0 };

  // Check each category's keywords and count matches
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let matchCount = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > bestMatch.matchCount) {
      bestMatch = { category, matchCount };
    }
  }

  // Calculate confidence based on number of keyword matches
  // 1 match = 0.6, 2 matches = 0.75, 3+ matches = 0.9
  let confidence = 0;
  if (bestMatch.matchCount >= 3) {
    confidence = 0.9;
  } else if (bestMatch.matchCount === 2) {
    confidence = 0.75;
  } else if (bestMatch.matchCount === 1) {
    confidence = 0.6;
  }

  return {
    category: bestMatch.category,
    confidence,
  };
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): readonly string[] {
  return TRANSACTION_CATEGORIES;
}
