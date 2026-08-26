export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border p-6">
        <h1 className="mb-4 text-xl font-semibold">Login SaaS</h1>

        <form>
          <input
            type="email"
            placeholder="Correo"
            className="mb-3 w-full border p-2"
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="mb-3 w-full border p-2"
          />
          <button
            type="submit"
            className="w-full rounded bg-blue-500 p-2 text-white"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}