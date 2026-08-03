export function detectLocale(language) {
  return String(language || "")
    .toLowerCase()
    .startsWith("it")
    ? "it"
    : "en";
}
