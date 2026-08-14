import { getLocale } from "$lib/paraglide/runtime.js";

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  return new Intl.DateTimeFormat(getLocale(), options).format(new Date(value));
}

export function compareLocalized(left: string, right: string) {
  return left.localeCompare(right, getLocale());
}
