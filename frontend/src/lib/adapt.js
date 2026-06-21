// Maps a backend public unit into the shape the UI components expect.
// Backend units don't carry ratings/host-name/dates, so those are left null
// and the components render gracefully without them.

export const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80";

export function adaptUnit(u) {
  return {
    id: u.id,
    title: u.title,
    city: u.city,
    state: u.state,
    country: u.country,
    description: u.description,
    price: Number(u.base_price),
    weekendPrice: u.weekend_price ? Number(u.weekend_price) : null,
    depositPercent: Number(u.deposit_percent),
    currency: u.currency || "INR",
    capacity: u.capacity,
    bedrooms: u.bedrooms,
    baths: u.bathrooms,
    minStay: u.min_stay_nights,
    amenities: u.amenities || [],
    images: u.photos && u.photos.length ? u.photos.map((p) => p.url) : [PLACEHOLDER_IMG],
    // Real aggregate ratings from the backend (null until first review).
    rating: u.rating ?? null,
    reviews: u.review_count ?? 0,
    host: null,
    dates: null,
    guestFavorite: false,
    superhost: false,
  };
}
