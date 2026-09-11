export function isValidPhone(
  phone: string
) {

  return /^\d{10}$/.test(
    phone
  );
}

export function isValidEmail(
  email: string
) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}