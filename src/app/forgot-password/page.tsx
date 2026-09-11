"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { validatePassword } from "@/src/lib/password-validator";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [debugCode, setDebugCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRules = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const passwordValid = Object.values(passwordRules).every(Boolean);

  async function sendCode() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "No se pudo enviar el código");
        return;
      }

      setCodeSent(true);
      setMessage(data.message || "Revisa tu correo electrónico");

      if (data.debugCode) {
        setDebugCode(data.debugCode);
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, code })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "El código no es válido");
        return;
      }

      setCodeVerified(true);
      setMessage("Código validado. Crea tu nueva contraseña.");
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError("");
    setMessage("");

    if (!password) {
      setError("Debes de agregar una nueva contraseña");
      return;
    }

    if (!passwordValid || !passwordsMatch) {
      setError("La contraseña no cumple las validaciones");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password, confirmPassword })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "No se pudo actualizar la contraseña");
        return;
      }

      setMessage("Contraseña actualizada correctamente.");
      setCodeVerified(false);
      setCodeSent(false);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-lg border p-6">
        <h1 className="mb-2 text-2xl font-bold">Recuperar contraseña</h1>
        <p className="mb-6 text-sm text-slate-600">
          Ingresa tu correo electrónico para recibir un código de seguridad.
        </p>

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Ingresa tu correo electrónico"
            disabled={codeVerified}
            className="w-full border p-2"
          />

          {!codeSent && (
            <button
              type="button"
              onClick={sendCode}
              disabled={!email || loading}
              className="w-full rounded bg-action p-2 text-white disabled:bg-gray-400"
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          )}

          {codeSent && !codeVerified && (
            <>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Ingresa el código"
                className="w-full border p-2"
              />
              <button
                type="button"
                onClick={verifyCode}
                disabled={!code || loading}
                className="w-full rounded bg-action p-2 text-white disabled:bg-gray-400"
              >
                {loading ? "Validando..." : "Validar código"}
              </button>
            </>
          )}

          {codeVerified && (
            <>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Agrega tu nueva contraseña"
                  className="w-full border p-2 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirma tu nueva contraseña"
                  className="w-full border p-2 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-red-600">Las contraseñas no coinciden</p>
              )}

              <div className="rounded border p-3 text-sm">
                <p>{passwordRules.minLength ? "✅" : "❌"} Mínimo 8 caracteres</p>
                <p>{passwordRules.uppercase ? "✅" : "❌"} Una letra mayúscula</p>
                <p>{passwordRules.lowercase ? "✅" : "❌"} Una letra minúscula</p>
                <p>{passwordRules.number ? "✅" : "❌"} Un número</p>
                <p>{passwordRules.special ? "✅" : "❌"} Un carácter especial</p>
              </div>

              <button
                type="button"
                onClick={resetPassword}
                disabled={!passwordValid || !passwordsMatch || loading}
                className="w-full rounded bg-action p-2 text-white disabled:bg-gray-400"
              >
                {loading ? "Guardando..." : "Guardar nueva contraseña"}
              </button>
            </>
          )}

          {message && <p className="text-green-600">{message}</p>}
          {message && !codeVerified && (
            <Link
              href="/login"
              className="block text-center text-[#D95D39] hover:underline"
            >
              Iniciar sesión
            </Link>
          )}
          {debugCode && (
            <p className="rounded border border-yellow-400 bg-yellow-50 p-3 text-sm">
              Código de desarrollo: <strong>{debugCode}</strong>
            </p>
          )}
          {error && <p className="text-red-600">{error}</p>}

          <Link href="/login" className="block text-center text-sm text-slate-600 hover:underline">
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}