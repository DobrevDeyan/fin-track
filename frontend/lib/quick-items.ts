/**
 * Pre-built quick expense items with preset prices
 * These are common items users frequently purchase, organized by category
 */

export interface QuickItem {
  id: string;
  label: string;
  amount: number;
  emoji?: string;
}

export interface CategoryQuickItems {
  categoryId: string;
  items: QuickItem[];
}

/**
 * Quick items organized by category
 * Prices are in EUR and represent typical/average costs
 */
export const QUICK_ITEMS_BY_CATEGORY: CategoryQuickItems[] = [
  {
    categoryId: "Food & Dining",
    items: [
      { id: "coffee", label: "Coffee", amount: 3.50, emoji: "☕" },
      { id: "breakfast", label: "Breakfast", amount: 8.00, emoji: "🥐" },
      { id: "lunch", label: "Lunch", amount: 12.00, emoji: "🍱" },
      { id: "dinner", label: "Dinner", amount: 18.00, emoji: "🍽️" },
      { id: "fast_food", label: "Fast Food", amount: 9.00, emoji: "🍔" },
      { id: "groceries", label: "Groceries", amount: 25.00, emoji: "🛒" },
      { id: "snacks", label: "Snacks", amount: 4.50, emoji: "🍫" },
      { id: "drinks", label: "Drinks", amount: 5.00, emoji: "🥤" },
    ],
  },
  {
    categoryId: "Transportation",
    items: [
      { id: "gas_small", label: "Gas – Partial", amount: 20.00, emoji: "⛽" },
      { id: "gas_full", label: "Gas – Full Tank", amount: 50.00, emoji: "⛽" },
      { id: "parking", label: "Parking", amount: 3.00, emoji: "🅿️" },
      { id: "public_transport", label: "Public Transport", amount: 2.50, emoji: "🚇" },
      { id: "taxi", label: "Taxi", amount: 15.00, emoji: "🚕" },
      { id: "uber", label: "Uber/Ride", amount: 12.00, emoji: "🚗" },
      { id: "toll", label: "Toll", amount: 5.00, emoji: "🛣️" },
    ],
  },
  {
    categoryId: "Shopping",
    items: [
      { id: "clothing", label: "Clothing", amount: 35.00, emoji: "👕" },
      { id: "electronics", label: "Electronics", amount: 50.00, emoji: "📱" },
      { id: "household", label: "Household Items", amount: 20.00, emoji: "🏠" },
      { id: "personal_care", label: "Personal Care", amount: 12.00, emoji: "🧴" },
    ],
  },
  {
    categoryId: "Bills & Utilities",
    items: [
      { id: "phone_bill", label: "Phone Bill", amount: 25.00, emoji: "📱" },
      { id: "internet", label: "Internet", amount: 35.00, emoji: "🌐" },
      { id: "electricity", label: "Electricity", amount: 60.00, emoji: "⚡" },
      { id: "water", label: "Water", amount: 30.00, emoji: "💧" },
      { id: "subscription", label: "Subscription", amount: 10.00, emoji: "📺" },
    ],
  },
  {
    categoryId: "Taxes & Insurance",
    items: [
      { id: "kasko", label: "Kasko (Car Insurance)", amount: 300.00, emoji: "🚗" },
      { id: "liability_insurance", label: "Liability Insurance", amount: 150.00, emoji: "🛡️" },
      { id: "vehicle_tax", label: "Vehicle Tax", amount: 200.00, emoji: "📋" },
      { id: "property_tax", label: "Property Tax", amount: 500.00, emoji: "🏠" },
      { id: "municipal_tax", label: "Municipal Tax", amount: 100.00, emoji: "🏛️" },
      { id: "home_insurance", label: "Home Insurance", amount: 400.00, emoji: "🏡" },
    ],
  },
  {
    categoryId: "Entertainment",
    items: [
      { id: "movie", label: "Movie", amount: 12.00, emoji: "🎬" },
      { id: "concert", label: "Concert", amount: 45.00, emoji: "🎵" },
      { id: "restaurant", label: "Restaurant", amount: 35.00, emoji: "🍴" },
      { id: "bar", label: "Bar", amount: 20.00, emoji: "🍺" },
      { id: "game", label: "Game/App", amount: 5.00, emoji: "🎮" },
      { id: "sports", label: "Sports/Gym", amount: 15.00, emoji: "⚽" },
    ],
  },
  {
    categoryId: "Health & Pharmacy",
    items: [
      { id: "pharmacy", label: "Pharmacy", amount: 15.00, emoji: "💊" },
      { id: "doctor", label: "Doctor Visit", amount: 40.00, emoji: "🩺" },
      { id: "dentist", label: "Dentist", amount: 60.00, emoji: "🦷" },
      { id: "vitamins", label: "Vitamins", amount: 12.00, emoji: "💊" },
      { id: "gym_membership", label: "Gym", amount: 30.00, emoji: "🏋️" },
    ],
  },
  {
    categoryId: "Education",
    items: [
      { id: "books", label: "Books", amount: 20.00, emoji: "📚" },
      { id: "course", label: "Online Course", amount: 30.00, emoji: "🎓" },
      { id: "tuition", label: "Tuition", amount: 200.00, emoji: "🏫" },
      { id: "supplies", label: "Supplies", amount: 15.00, emoji: "✏️" },
    ],
  },
  {
    categoryId: "Travel & Vacation",
    items: [
      { id: "flight", label: "Flight", amount: 150.00, emoji: "✈️" },
      { id: "hotel", label: "Hotel", amount: 80.00, emoji: "🏨" },
      { id: "airbnb", label: "Airbnb", amount: 60.00, emoji: "🏡" },
      { id: "car_rental", label: "Car Rental", amount: 40.00, emoji: "🚗" },
      { id: "sightseeing", label: "Sightseeing", amount: 20.00, emoji: "🗺️" },
    ],
  },
  {
    categoryId: "Gifts & Donations",
    items: [
      { id: "birthday_gift", label: "Birthday Gift", amount: 30.00, emoji: "🎁" },
      { id: "charity", label: "Charity", amount: 20.00, emoji: "❤️" },
      { id: "flowers", label: "Flowers", amount: 25.00, emoji: "💐" },
      { id: "donation", label: "Donation", amount: 10.00, emoji: "🤝" },
    ],
  },
  {
    categoryId: "Other",
    items: [
      { id: "cash", label: "Cash Withdrawal", amount: 50.00, emoji: "💵" },
      { id: "tip", label: "Tip", amount: 5.00, emoji: "💸" },
      { id: "repair", label: "Repair", amount: 30.00, emoji: "🔧" },
    ],
  },
];

/**
 * Get quick items for a specific category
 */
export function getQuickItemsForCategory(categoryId: string): QuickItem[] {
  const categoryItems = QUICK_ITEMS_BY_CATEGORY.find(
    (cat) => cat.categoryId === categoryId
  );
  return categoryItems?.items || [];
}

/**
 * Get a quick item by ID
 */
export function getQuickItemById(categoryId: string, itemId: string): QuickItem | undefined {
  const items = getQuickItemsForCategory(categoryId);
  return items.find((item) => item.id === itemId);
}

