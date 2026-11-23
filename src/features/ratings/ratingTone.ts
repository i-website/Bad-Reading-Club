export function ratingTone(rating: number): "low" | "medium" | "high" {
  if (rating < 4) return "low";
  if (rating < 8) return "medium";
  return "high";
}
