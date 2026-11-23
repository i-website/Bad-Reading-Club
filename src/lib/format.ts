export const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("ru-RU", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(value))
    : "Уточняется";
export const formatPrice = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);
