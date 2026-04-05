export function barcodePattern(value: string) {
  const bits = Array.from(value || "").map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0")).join("");
  return `1010${bits}11101`;
}
