export function validatePassword(
  password: string
) {

  return {

    minLength:
      password.length >= 8,

    uppercase:
      /[A-Z]/.test(password),

    lowercase:
      /[a-z]/.test(password),

    number:
      /\d/.test(password),

    special:
      /[@$!%*?#&._-]/.test(password)
  };
}