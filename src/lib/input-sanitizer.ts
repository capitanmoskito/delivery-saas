export function sanitizeInput(
  value: string
) {

  return value

    .replace(
      /[\u200B-\u200D\uFEFF]/g,
      ""
    )

    .replace(
      /\u00A0/g,
      " "
    )

    .trim();
}