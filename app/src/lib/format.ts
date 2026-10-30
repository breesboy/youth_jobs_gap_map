export const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
export const num = (value: number) => value.toLocaleString("en-US");
