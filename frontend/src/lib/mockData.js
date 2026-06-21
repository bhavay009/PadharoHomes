// Mock data for the UI build. Swapped for the real API later (see src/api.js).

export const CATEGORIES = [
  { id: "beach", label: "Beachfront", emoji: "🏖️" },
  { id: "cabin", label: "Cabins", emoji: "🛖" },
  { id: "city", label: "City", emoji: "🏙️" },
  { id: "mountain", label: "Mountains", emoji: "⛰️" },
  { id: "pool", label: "Amazing pools", emoji: "🏊" },
  { id: "lake", label: "Lakefront", emoji: "🛶" },
  { id: "luxe", label: "Luxe", emoji: "💎" },
  { id: "farm", label: "Farm stays", emoji: "🌾" },
];

export const AMENITIES = [
  "Wifi", "Air conditioning", "Pool", "Kitchen", "Free parking",
  "Washer", "TV", "Pet friendly", "Workspace", "Hot tub",
];

const IMG = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const PROPERTIES = [
  {
    id: "p1",
    title: "Sunset Cottage by the Sea",
    city: "Goa", country: "India", category: "beach",
    price: 4500, rating: 4.92, reviews: 128, guests: 4, bedrooms: 2, baths: 2,
    superhost: true,
    images: [IMG("photo-1502672260266-1c1ef2d93688"), IMG("photo-1512917774080-9991f1c4c750"), IMG("photo-1505691938895-1758d7feb511")],
    host: { name: "Asha", joined: "2021" },
    amenities: ["Wifi", "Pool", "Air conditioning", "Kitchen", "Free parking"],
    description:
      "Wake up to the sound of waves in this airy sea-view cottage. Minutes from North Goa's best beaches, cafes and nightlife — yet tucked away for calm evenings.",
  },
  {
    id: "p2",
    title: "Pine Ridge Mountain Cabin",
    city: "Manali", country: "India", category: "mountain",
    price: 3800, rating: 4.85, reviews: 96, guests: 6, bedrooms: 3, baths: 2,
    superhost: false,
    images: [IMG("photo-1449158743715-0a90ebb6d2d8"), IMG("photo-1476231682828-37e571bc172f"), IMG("photo-1518733057094-95b53143d2a7")],
    host: { name: "Rohan", joined: "2020" },
    amenities: ["Wifi", "Hot tub", "Kitchen", "Free parking", "Workspace"],
    description:
      "A cozy wooden cabin wrapped in pine forest with sweeping Himalayan views. Perfect for a digital detox or a workation by the fire.",
  },
  {
    id: "p3",
    title: "The Glass Penthouse",
    city: "Mumbai", country: "India", category: "city",
    price: 9200, rating: 4.97, reviews: 211, guests: 4, bedrooms: 2, baths: 2,
    superhost: true,
    images: [IMG("photo-1502005229762-cf1b2da7c5d6"), IMG("photo-1560448204-e02f11c3d0e2"), IMG("photo-1545324418-cc1a3fa10c00")],
    host: { name: "Neha", joined: "2019" },
    amenities: ["Wifi", "Air conditioning", "TV", "Workspace", "Washer"],
    description:
      "Floor-to-ceiling windows, skyline views and designer interiors in the heart of the city. Walk to the best dining and galleries.",
  },
  {
    id: "p4",
    title: "Lakeside Wooden Villa",
    city: "Udaipur", country: "India", category: "lake",
    price: 6700, rating: 4.89, reviews: 154, guests: 8, bedrooms: 4, baths: 3,
    superhost: true,
    images: [IMG("photo-1439066615861-d1af74d74000"), IMG("photo-1499793983690-e29da59ef1c2"), IMG("photo-1513694203232-719a280e022f")],
    host: { name: "Vikram", joined: "2018" },
    amenities: ["Wifi", "Pool", "Kitchen", "Free parking", "Pet friendly"],
    description:
      "A heritage-inspired villa on the lake with private deck and sunset views over the palaces. Space for the whole family.",
  },
  {
    id: "p5",
    title: "Minimalist Farm Retreat",
    city: "Coorg", country: "India", category: "farm",
    price: 3200, rating: 4.78, reviews: 64, guests: 5, bedrooms: 2, baths: 2,
    superhost: false,
    images: [IMG("photo-1505693416388-ac5ce068fe85"), IMG("photo-1469474968028-56623f02e42e"), IMG("photo-1472224371017-08207f84aaae")],
    host: { name: "Maya", joined: "2022" },
    amenities: ["Wifi", "Kitchen", "Free parking", "Workspace"],
    description:
      "Slow mornings on a working coffee estate. Hammocks, birdsong and farm-to-table breakfasts included.",
  },
  {
    id: "p6",
    title: "Azure Infinity Pool Villa",
    city: "Lonavala", country: "India", category: "pool",
    price: 8100, rating: 4.94, reviews: 187, guests: 10, bedrooms: 5, baths: 4,
    superhost: true,
    images: [IMG("photo-1571896349842-33c89424de2d"), IMG("photo-1582268611958-ebfd161ef9cf"), IMG("photo-1564013799919-ab600027ffc6")],
    host: { name: "Kabir", joined: "2017" },
    amenities: ["Wifi", "Pool", "Air conditioning", "Kitchen", "Hot tub", "TV"],
    description:
      "A statement villa built around a glittering infinity pool overlooking the valley. Made for celebrations and long weekends.",
  },
];

// Enrich listings with availability + a "guest favorite" flag (derived from rating).
const _DATE_LABELS = ["12–15 Jul", "3–6 Aug", "21–24 Jul", "8–12 Sep", "1–4 Aug", "18–22 Jul"];
PROPERTIES.forEach((p, i) => {
  p.dates = p.dates || _DATE_LABELS[i % _DATE_LABELS.length];
  p.guestFavorite = p.rating >= 4.9;
});

export const HOST_STATS = {
  revenueBooked: 124500,
  cashCollected: 86200,
  outstanding: 38300,
  commissionSaved: 18675,
  occupancy: 72,
  currency: "₹",
};

export const HOST_BOOKINGS = [
  { id: "b1", guest: "Asha Rao", property: "Sunset Cottage by the Sea", checkIn: "2026-07-14", checkOut: "2026-07-16", total: 9000, status: "confirmed" },
  { id: "b2", guest: "Dev Patel", property: "The Glass Penthouse", checkIn: "2026-07-20", checkOut: "2026-07-23", total: 27600, status: "checked_in" },
  { id: "b3", guest: "Sara Khan", property: "Lakeside Wooden Villa", checkIn: "2026-08-01", checkOut: "2026-08-04", total: 20100, status: "pending" },
  { id: "b4", guest: "Imran Ali", property: "Pine Ridge Mountain Cabin", checkIn: "2026-06-10", checkOut: "2026-06-12", total: 7600, status: "completed" },
];

const _img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const DESTINATIONS = [
  { id: "d1", title: "Sunset Cottage by the Sea", place: "Goa, India", price: 4500, rating: 4.92, nights: "2 Nights · 3 Days", image: _img("photo-1502672260266-1c1ef2d93688"), desc: "Sea-view cottage minutes from North Goa's beaches — booked directly, zero commission." },
  { id: "d2", title: "Pine Ridge Mountain Cabin", place: "Manali, India", price: 3800, rating: 4.85, nights: "2 Nights · 3 Days", image: _img("photo-1449158743715-0a90ebb6d2d8"), desc: "A cozy cabin wrapped in Himalayan pine forest — perfect for a quiet workation." },
  { id: "d3", title: "Lakeside Wooden Villa", place: "Udaipur, India", price: 6700, rating: 4.89, nights: "3 Nights · 4 Days", image: _img("photo-1439066615861-d1af74d74000"), desc: "Heritage-inspired villa on the lake with private deck and sunset palace views." },
  { id: "d4", title: "Azure Infinity Pool Villa", place: "Lonavala, India", price: 8100, rating: 4.94, nights: "2 Nights · 3 Days", image: _img("photo-1571896349842-33c89424de2d"), desc: "A statement villa built around a glittering infinity pool overlooking the valley." },
];

export const DEALS = [
  { id: "w1", title: "The Glass Penthouse", place: "Mumbai, India", price: 9200, rating: 4.97, tag: "Pay 20% now", date: "Direct", nights: 2, guests: 4, image: _img("photo-1502005229762-cf1b2da7c5d6") },
  { id: "w2", title: "Minimalist Farm Retreat", place: "Coorg, India", price: 3200, rating: 4.78, tag: "Zero commission", date: "Direct", nights: 3, guests: 5, image: _img("photo-1505693416388-ac5ce068fe85") },
  { id: "w3", title: "Sunset Cottage by the Sea", place: "Goa, India", price: 4500, rating: 4.92, tag: "Free cancellation", date: "Direct", nights: 2, guests: 4, image: _img("photo-1512917774080-9991f1c4c750") },
  { id: "w4", title: "Lakeside Wooden Villa", place: "Udaipur, India", price: 6700, rating: 4.89, tag: "Balance at property", date: "Direct", nights: 3, guests: 8, image: _img("photo-1499793983690-e29da59ef1c2") },
];

export const FAQS = [
  {
    q: "How does booking directly work?",
    points: [
      "You book directly with the host — no aggregator in between",
      "Zero third-party commission, so you get a better price",
      "Pay a small deposit online to confirm your stay",
      "Pay the remaining balance directly at the property on arrival",
      "Get instant email confirmation with all the details",
      "Message the host directly and become a returning guest",
      "Cancellation follows the host's clearly-stated policy",
    ],
  },
  { q: "Do I pay the full amount upfront?", a: "No — you pay a deposit online to confirm the booking, and the balance directly at the property when you arrive." },
  { q: "Why book on Padharo Homes instead of an aggregator?", a: "You book directly with the host with zero platform commission — better prices for you, and a real relationship for repeat stays." },
  { q: "Is my payment secure?", a: "Yes. Your deposit is processed securely through the payment gateway and every booking is confirmed instantly by email." },
  { q: "Can I cancel my booking?", a: "Cancellation follows the host's policy shown on each listing. Deposits may be non-refundable as clearly stated at the time of booking." },
  { q: "How do I list my property?", a: "Sign up as a host, add your units with photos and pricing, set availability on the calendar, and start taking direct bookings — commission-free." },
  { q: "Which locations can I book?", a: "Hosts list unique stays across India — from Goa beaches and Himalayan cabins to heritage lake villas in Udaipur." },
];

export const formatMoney = (n, currency = "₹") =>
  `${currency}${Number(n).toLocaleString("en-IN")}`;

export const getProperty = (id) => PROPERTIES.find((p) => p.id === id);
