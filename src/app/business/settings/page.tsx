"use client";

import {
  useEffect,
  useState
} from "react";

import { useRouter }
from "next/navigation";

import Image
from "next/image";

import {
  Eye,
  EyeOff
} from "lucide-react";

import PasswordConfirmModal
from "@/src/components/settings/password-confirm-modal";

import { countries }
from "@/src/constants/countries";

import {
  isValidEmail,
  isValidPhone
}
from "@/src/lib/business-settings-validator";

import { validatePassword }
from "@/src/lib/password-validator";

export default function SettingsPage() {

  const router = useRouter();

  const [locked,
    setLocked] =
    useState(true);

  const [showOtp,
    setShowOtp] =
    useState(false);

  const [otp,
    setOtp] =
    useState("");

  const [debugOtp,
    setDebugOtp] =
    useState("");

  const [error,
    setError] =
    useState("");

  const [saveMessage,
    setSaveMessage] =
    useState("");

  const [saving,
    setSaving] =
    useState(false);

  const [showPasswordModal,
    setShowPasswordModal] =
    useState(false);

  const [showSaveModal,
    setShowSaveModal] =
    useState(false);

const [newPassword,
  setNewPassword] =
  useState("");

const [confirmPassword,
  setConfirmPassword] =
  useState("");

const [showNewPassword,
  setShowNewPassword] =
  useState(false);

const [showConfirmPassword,
  setShowConfirmPassword] =
  useState(false);

const [businessName,
  setBusinessName] =
  useState("");

const [description,
  setDescription] =
  useState("");

const [phonePrefix,
  setPhonePrefix] =
  useState("+52");

const [phoneNumber,
  setPhoneNumber] =
  useState("");

const [contactEmail,
  setContactEmail] =
  useState("");

const [adminEmail,
  setAdminEmail] =
  useState("");

const [postalCode,
  setPostalCode] =
  useState("");

const [country,
  setCountry] =
  useState("México");

const [state,
  setState] =
  useState("");

const [city,
  setCity] =
  useState("");

const [neighborhood,
  setNeighborhood] =
  useState("");

const [addressLine,
  setAddressLine] =
  useState("");

const [currency,
  setCurrency] =
  useState("MXN");

const [initialProfile,
  setInitialProfile] =
  useState({
    businessName: "",
    description: "",
    phonePrefix: "+52",
    phoneNumber: "",
    contactEmail: "",
    postalCode: "",
    country: "México",
    state: "",
    city: "",
    neighborhood: "",
    addressLine: "",
    currency: "MXN",
    latitude: "",
    longitude: "",
    logoUrl: "",
    bannerUrl: "",
    galleryUrls: [] as string[]
  });

const [lastModification,
  setLastModification] =
  useState<{
    createdAt: string;
    user: string;
    modifiedSections: string[];
  } | null>(null);

const [history,
  setHistory] =
  useState<Array<{
    id: string;
    createdAt: string;
    field: string;
    previousValue: string | null;
    newValue: string;
    user: string;
  }>>([]);

const [latitude,
  setLatitude] =
  useState("");

const [longitude,
  setLongitude] =
  useState("");

const [logoUrl,
  setLogoUrl] =
  useState("");

const [bannerUrl,
  setBannerUrl] =
  useState("");

const [galleryUrls,
  setGalleryUrls] =
  useState<string[]>([]);

const [passwordOtp,
  setPasswordOtp] =
  useState("");

const [passwordOtpSent,
  setPasswordOtpSent] =
  useState(false);

const [passwordUnlocked,
  setPasswordUnlocked] =
  useState(false);

const [passwordError,
  setPasswordError] =
  useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response =
          await fetch(
            "/api/settings/profile"
          );

        const data =
          await response.json();

        if (!response.ok || !data.success || !data.profile) {
          if (response.status !== 404) {
            setError(
              data.message ||
                "No se pudo consultar la configuración"
            );
          }

          return;
        }

        const profile = data.profile;

        setBusinessName(profile.businessName || "");
        setDescription(profile.description || "");
        setPhonePrefix(profile.phonePrefix || "+52");
        setPhoneNumber(profile.phoneNumber || "");
        setContactEmail(profile.contactEmail || "");
        setAdminEmail(profile.adminEmail || "");
        setPostalCode(profile.postalCode || "");
        setCountry(profile.country || "México");
        setState(profile.state || "");
        setCity(profile.city || "");
        setNeighborhood(profile.neighborhood || "");
        setAddressLine(profile.addressLine || "");
        setCurrency(profile.currency || "MXN");
        setLatitude(
          profile.latitude === null || profile.latitude === undefined
            ? ""
            : String(profile.latitude)
        );
        setLongitude(
          profile.longitude === null || profile.longitude === undefined
            ? ""
            : String(profile.longitude)
        );
        setLogoUrl(profile.logoUrl || "");
        setBannerUrl(profile.bannerUrl || "");
        setGalleryUrls(profile.galleryUrls || []);

        setLastModification(
          data.lastModification ||
            null
        );

        setInitialProfile({
          businessName: profile.businessName || "",
          description: profile.description || "",
          phonePrefix: profile.phonePrefix || "+52",
          phoneNumber: profile.phoneNumber || "",
          contactEmail: profile.contactEmail || "",
          postalCode: profile.postalCode || "",
          country: profile.country || "México",
          state: profile.state || "",
          city: profile.city || "",
          neighborhood: profile.neighborhood || "",
          addressLine: profile.addressLine || "",
          currency: profile.currency || "MXN",
          latitude: profile.latitude === null || profile.latitude === undefined
            ? ""
            : String(profile.latitude),
          longitude: profile.longitude === null || profile.longitude === undefined
            ? ""
            : String(profile.longitude),
          logoUrl: profile.logoUrl || "",
          bannerUrl: profile.bannerUrl || "",
          galleryUrls: profile.galleryUrls || []
        });
      } catch {
        setError(
          "No se pudo consultar la configuración"
        );
      }
    }

    async function loadHistory() {
      const response = await fetch("/api/settings/history");
      const data = await response.json();

      if (response.ok && data.success) {
        setHistory(data.rows || []);
      }
    }

    loadProfile();
    loadHistory();
  }, []);

  const validPhone =
  isValidPhone(
    phoneNumber
  );

const validEmail =
  isValidEmail(
    contactEmail
  );

const passwordsMatch =
  newPassword ===
  confirmPassword;

const passwordRules =
  validatePassword(
    newPassword
  );

const passwordValid =
  passwordRules.minLength &&
  passwordRules.uppercase &&
  passwordRules.lowercase &&
  passwordRules.number &&
  passwordRules.special;

const hasProfileChanges =
  JSON.stringify({
    businessName,
    description,
    phonePrefix,
    phoneNumber,
    contactEmail,
    postalCode,
    country,
    state,
    city,
    neighborhood,
    addressLine,
    currency,
    latitude,
    longitude,
    logoUrl,
    bannerUrl,
    galleryUrls
  }) !==
  JSON.stringify(initialProfile);


  async function sendOtp() {

  setError("");

  const response =
    await fetch(
      "/api/settings/send-otp",
      {
        method: "POST",
      }
    );

  const data =
    await response.json();

  if (!response.ok || !data.success) {

    setError(
      data.message ||
        "No se pudo enviar el código"
    );

    return;
  }

  if (data.debugCode) {

    setDebugOtp(
      data.debugCode
    );
  }

  setShowOtp(true);
}


  async function verifyOtp() {

    setError("");

    const response =
      await fetch(
        "/api/settings/verify-otp",
        {
          method: "POST",

          body:
            JSON.stringify({
              code:
                otp
            })
        }
      );

    const data =
      await response.json();

    if (!response.ok || !data.success) {

      setError(
        data.message ||
          "El código no es válido o expiró, intenta nuevamente más tarde"
      );

    } else {

      setLocked(false);
    }
  }

  async function saveSettings() {

    setError("");
    setSaveMessage("");

    if (!businessName.trim()) {

      setError(
        "El nombre comercial es obligatorio"
      );

      return;
    }

    if (phoneNumber && !validPhone) {

      setError(
        "El teléfono debe contener 10 dígitos"
      );

      return;
    }

    if (contactEmail && !validEmail) {

      setError(
        "El correo de contacto no es válido"
      );

      return;
    }

    setSaving(true);

    try {

      const response =
        await fetch(
          "/api/settings/profile",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              businessName,
              description,
              phonePrefix,
              phoneNumber,
              contactEmail,
              postalCode,
              country,
              state,
              city,
              neighborhood,
              addressLine,
              currency,
              latitude: latitude ? Number(latitude) : null,
              longitude: longitude ? Number(longitude) : null,
              logoUrl,
              bannerUrl,
              galleryUrls
            })
          }
        );

      const responseText =
        await response.text();

      let data: {
        success?: boolean;
        message?: string;
        lastModification?: {
          createdAt: string;
          user: string;
          modifiedSections: string[];
        } | null;
      } = {};

      try {

        data = JSON.parse(
          responseText
        );

      } catch {

        data.message =
          `Respuesta inválida del servidor (${response.status})`;
      }

      if (!response.ok || !data.success) {

        setError(
          data.message ||
            "No se pudieron guardar los cambios"
        );

        return;
      }

      setInitialProfile({
        businessName,
        description,
        phonePrefix,
        phoneNumber,
        contactEmail,
        postalCode,
        country,
        state,
        city,
        neighborhood,
        addressLine,
        currency,
        latitude,
        longitude,
        logoUrl,
        bannerUrl,
        galleryUrls
      });

      setSaveMessage(
        "Cambios guardados correctamente"
      );

      setLastModification(
        data.lastModification ||
          null
      );

      const historyResponse =
        await fetch("/api/settings/history");
      const historyData =
        await historyResponse.json();

      if (historyResponse.ok && historyData.success) {
        setHistory(historyData.rows || []);
      }

      router.refresh();

    } catch (error) {

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el servidor"
      );

    } finally {

      setSaving(false);
    }
  }

  async function sendPasswordOtp() {
    setPasswordError("");

    const response = await fetch(
      "/api/settings/password/send-otp",
      { method: "POST" }
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      setPasswordError(
        data.message || "No se pudo enviar el código"
      );
      return;
    }

    if (data.debugCode) {
      setPasswordOtp(data.debugCode);
    }

    setPasswordOtpSent(true);
  }

  async function verifyPasswordOtp() {
    setPasswordError("");

    const response = await fetch(
      "/api/settings/password/verify-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          code: passwordOtp
        })
      }
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      setPasswordError(
        data.message || "El código no es válido"
      );
      return;
    }

    setPasswordUnlocked(true);
  }

  async function savePassword() {
    setPasswordError("");

    const response = await fetch(
      "/api/settings/password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword
        })
      }
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      setPasswordError(
        data.message || "No se pudo cambiar la contraseña"
      );
      return;
    }

    setShowPasswordModal(false);
    setPasswordUnlocked(false);
    setPasswordOtpSent(false);
    setPasswordOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setSaveMessage("Contraseña actualizada correctamente");
  }

  async function uploadAsset(
    file: File,
    kind: "logo" | "banner" | "gallery"
  ) {
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const response = await fetch(
      "/api/upload",
      {
        method: "POST",
        body: formData
      }
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      setError(data.message || "No se pudo subir la imagen");
      return;
    }

    if (kind === "logo") {
      setLogoUrl(data.url);
    } else if (kind === "banner") {
      setBannerUrl(data.url);
    } else {
      setGalleryUrls((current) => [
        ...current,
        data.url
      ]);
    }
  }

  return (

    <div className="max-w-5xl">

      <h1 className="mb-8 text-4xl font-bold">

        Configuración

      </h1>
      

      {locked && !showOtp && (

        <div className="rounded-3xl border p-8">

          <h2 className="text-xl font-semibold">

            Configuración protegida

          </h2>

          <p className="mt-4">

            Debes validar tu identidad para editar.

          </p>

          <button
            onClick={sendOtp}
            className="mt-6 rounded bg-action px-6 py-3 text-white"
          >

            Enviar código

          </button>

        </div>

      )}

    {!locked && (

<div className="space-y-8">

  <section className="rounded-3xl border p-8">

    <h2 className="mb-6 text-2xl font-bold">

      Información General

    </h2>

    <div className="space-y-4">

      <input
        className="w-full border p-3"
        placeholder="Nombre Comercial"
        value={businessName}
        onChange={(e)=>
          setBusinessName(
            e.target.value
          )
        }
      />

      <textarea
        className="w-full border p-3"
        placeholder="Descripción"
        value={description}
        onChange={(e)=>
          setDescription(
            e.target.value
          )
        }
      />

      <div className="flex gap-3">

        <select
          className="border p-3"
          value={phonePrefix}
          onChange={(e)=>
            setPhonePrefix(
              e.target.value
            )
          }
        >

          {countries.map(
            (country) => (

              <option
                key={
                  country.code
                }
                value={
                  country.prefix
                }
              >

                {country.prefix}

              </option>

            )
          )}

        </select>

        <input
          className="flex-1 border p-3"
          placeholder="Teléfono"
          maxLength={10}
          value={
            phoneNumber
          }
          onChange={(e)=>
            setPhoneNumber(
              e.target.value
            )
          }
        />

      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border p-5">

        <strong>
          Historial de cambios
        </strong>

        <table className="mt-4 w-full min-w-180 text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Fecha</th>
              <th className="p-2">Hora</th>
              <th className="p-2">Campo</th>
              <th className="p-2">Valor anterior</th>
              <th className="p-2">Valor nuevo</th>
              <th className="p-2">Usuario</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => {
              const date = new Date(row.createdAt);

              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-2">{date.toLocaleDateString("es-MX")}</td>
                  <td className="p-2">
                    {date.toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td className="p-2">{row.field}</td>
                  <td className="max-w-xs truncate p-2">
                    {row.previousValue || "Sin valor"}
                  </td>
                  <td className="max-w-xs truncate p-2">{row.newValue}</td>
                  <td className="p-2">{row.user}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {history.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            Sin cambios registrados.
          </p>
        )}

      </div>

      {!validPhone &&
      phoneNumber && (

        <p className="text-red-500">

          Debe contener
          10 dígitos

        </p>

      )}

      <input
        className="w-full border p-3"
        placeholder="Correo de contacto"
        value={
          contactEmail
        }
        onChange={(e)=>
          setContactEmail(
            e.target.value
          )
        }
      />

      {!validEmail &&
      contactEmail && (

        <p className="text-red-500">

          Correo inválido

        </p>

      )}

      {validEmail && contactEmail && (

        <p className="text-green-600">

          Correo válido

        </p>

      )}

    </div>

  </section>

  <section className="rounded-3xl border p-8">

    <h2 className="mb-6 text-2xl font-bold">
      Ubicación del Negocio
    </h2>

    <div className="mb-4 flex aspect-video items-center justify-center rounded-xl border bg-slate-100 text-slate-500">
      Mapa Placeholder
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <input
        className="w-full border p-3"
        placeholder="Latitud"
        inputMode="decimal"
        value={latitude}
        onChange={(event) => setLatitude(event.target.value)}
      />
      <input
        className="w-full border p-3"
        placeholder="Longitud"
        inputMode="decimal"
        value={longitude}
        onChange={(event) => setLongitude(event.target.value)}
      />
    </div>

  </section>

  <section className="rounded-3xl border p-8">

    <h2 className="mb-6 text-2xl font-bold">
      Branding
    </h2>

    <div className="grid gap-6 md:grid-cols-2">
      <label
        className="space-y-2 rounded-xl border-2 border-dashed p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) {
            uploadAsset(file, "logo");
          }
        }}
      >
        <span className="font-medium">Logo</span>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              uploadAsset(file, "logo");
            }
          }}
        />
        {logoUrl && (
            <Image
            src={logoUrl}
            alt="Logo del negocio"
              width={128}
              height={128}
            className="h-32 w-32 rounded object-cover"
          />
        )}
      </label>

      <label
        className="space-y-2 rounded-xl border-2 border-dashed p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) {
            uploadAsset(file, "banner");
          }
        }}
      >
        <span className="font-medium">Banner Principal</span>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              uploadAsset(file, "banner");
            }
          }}
        />
        {bannerUrl && (
            <Image
            src={bannerUrl}
            alt="Banner del negocio"
              width={1600}
              height={900}
            className="aspect-video w-full rounded object-cover"
          />
        )}
      </label>
    </div>

    <label
      className="mt-6 block space-y-2 rounded-xl border-2 border-dashed p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        [...event.dataTransfer.files].forEach((file) => {
          uploadAsset(file, "gallery");
        });
      }}
    >
      <span className="font-medium">Galería</span>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          const files = [...(event.target.files || [])];
          files.forEach((file) => uploadAsset(file, "gallery"));
        }}
      />
    </label>

    {galleryUrls.length > 0 && (
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {galleryUrls.map((url) => (
          <Image
            key={url}
            src={url}
            alt="Imagen de galería"
            width={800}
            height={600}
            className="aspect-square w-full rounded object-cover"
          />
        ))}
      </div>
    )}

  </section>

  <section className="rounded-3xl border p-8">

    <h2 className="mb-6 text-2xl font-bold">

      Dirección

    </h2>

    <div className="space-y-4">

      <input
        className="w-full border p-3"
        placeholder="Código Postal"
        value={postalCode}
        onChange={(e)=>
          setPostalCode(
            e.target.value
          )
        }
      />

      <input
        className="w-full border p-3"
        placeholder="Colonia"
        value={
          neighborhood
        }
        onChange={(e)=>
          setNeighborhood(
            e.target.value
          )
        }
      />

      <input
        className="w-full border p-3"
        placeholder="Municipio"
        value={city}
        onChange={(e)=>
          setCity(
            e.target.value
          )
        }
      />

      <input
        className="w-full border p-3"
        placeholder="Estado"
        value={state}
        onChange={(e)=>
          setState(
            e.target.value
          )
        }
      />

      <input
        className="w-full border p-3"
        placeholder="País"
        value={country}
        onChange={(e)=>
          setCountry(
            e.target.value
          )
        }
      />

      <textarea
        className="w-full border p-3"
        placeholder="Dirección"
        value={
          addressLine
        }
        onChange={(e)=>
          setAddressLine(
            e.target.value
          )
        }
      />

    </div>

  </section>

  <section className="rounded-3xl border p-8">

    <h2 className="mb-6 text-2xl font-bold">

      Moneda

    </h2>

    <select
      className="w-full border p-3"
      value={currency}
      onChange={(e)=>
        setCurrency(
          e.target.value
        )
      }
    >

      <option>MXN</option>
      <option>USD</option>
      <option>EUR</option>
      <option>GBP</option>
      <option>CAD</option>
      <option>COP</option>
      <option>ARS</option>
      <option>CLP</option>
      <option>PEN</option>
      <option>BRL</option>

    </select>

  </section>

  <section className="rounded-3xl border p-8">

    <h2 className="mb-6 text-2xl font-bold">

      Seguridad

    </h2>

    <input
      disabled
      className="w-full border p-3 bg-slate-100"
      value={adminEmail}
    />

    <input
      disabled
      type="password"
      className="mt-4 w-full border p-3 bg-slate-100"
      value="***********"
    />

    <button
      onClick={sendPasswordOtp}
      className="mt-4 rounded bg-cancel px-6 py-3 text-white"
    >

      Modificar contraseña

    </button>

    

    {passwordOtpSent && !passwordUnlocked && (

      <div className="mt-6 space-y-4">
        <input
          className="w-full border p-3"
          placeholder="Código OTP"
          value={passwordOtp}
          onChange={(event) => setPasswordOtp(event.target.value)}
        />

        {passwordError && (
          <p className="text-red-600">{passwordError}</p>
        )}

        <button
          onClick={verifyPasswordOtp}
          className="rounded bg-action px-6 py-3 text-white"
        >
          Validar código
        </button>
      </div>
    )}

    {passwordUnlocked && (

      <div className="mt-6 space-y-4">

        <div className="relative">

          <input
            className="w-full border p-3 pr-10"
            placeholder="Nueva contraseña"
            type={
              showNewPassword
                ? "text"
                : "password"
            }
            value={newPassword}
            onChange={(e)=>
              setNewPassword(
                e.target.value
              )
            }
          />

          <button
            type="button"
            className="absolute right-2 top-3"
            onClick={() =>
              setShowNewPassword(
                !showNewPassword
              )
            }
            aria-label={
              showNewPassword
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
          >
            {showNewPassword
              ? <EyeOff size={18} />
              : <Eye size={18} />}
          </button>

        </div>

        <div className="relative">

          <input
            className="w-full border p-3 pr-10"
            placeholder="Confirmar contraseña"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            value={
              confirmPassword
            }
            onChange={(e)=>
              setConfirmPassword(
                e.target.value
              )
            }
          />

          <button
            type="button"
            className="absolute right-2 top-3"
            onClick={() =>
              setShowConfirmPassword(
                !showConfirmPassword
              )
            }
            aria-label={
              showConfirmPassword
                ? "Ocultar contraseña"
                : "Mostrar contraseña"
            }
          >
            {showConfirmPassword
              ? <EyeOff size={18} />
              : <Eye size={18} />}
          </button>

        </div>

        {!passwordsMatch &&
        confirmPassword && (

          <p className="text-red-500">

            Las contraseñas no coinciden

          </p>

        )}

        {passwordUnlocked && !newPassword && (

          <p className="text-red-500">

            Debes de agregar una nueva contraseña

          </p>

        )}

        {newPassword && (

          <div className="rounded border p-3 text-sm">
          <p>{passwordRules.minLength ? "✅" : "❌"} Mínimo 8 caracteres</p>
          <p>{passwordRules.uppercase ? "✅" : "❌"} Una letra mayúscula</p>
          <p>{passwordRules.lowercase ? "✅" : "❌"} Una letra minúscula</p>
          <p>{passwordRules.number ? "✅" : "❌"} Un número</p>
          <p>{passwordRules.special ? "✅" : "❌"} Un carácter especial</p>
        </div>

          

        )}

        {passwordError && (

          <p className="text-red-600">
            {passwordError}
          </p>

        )}

        <div className="flex gap-3">

          <button
            onClick={() =>
              setPasswordUnlocked(false)
            }
            className="rounded bg-cancel px-6 py-3 text-white"
          >

            Cancelar

          </button>

          <button
            onClick={() =>
              setShowPasswordModal(
                true
              )
            }
            disabled={
              !passwordValid ||
              !passwordsMatch
            }
            className="rounded bg-action px-6 py-3 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >

            Guardar nueva contraseña

          </button>

        </div>

      </div>

    )}

  </section>

  <button
    onClick={() =>
      setShowSaveModal(
        true
      )
    }
    disabled={
      saving ||
      !hasProfileChanges
    }
    className="rounded bg-action px-6 py-3 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
  >

    {saving ? "Guardando..." : "Guardar cambios"}

  </button>

  <button
    type="button"
    onClick={() => {
      setLocked(true);
      setShowSaveModal(false);
      setShowPasswordModal(false);
      setError("");
    }}
    className="ml-4 rounded bg-cancel px-6 py-3 text-white"
  >

    Cancelar

  </button>

</div>

)}

      {showOtp && locked && (

        <div className="mt-6 rounded-3xl border p-6">

          <p>

            Revisa el código enviado a tu correo.

          </p>

          <input
            className="mt-4 w-full border p-3"
            placeholder="Código"
            value={otp}
            onChange={(e)=>
              setOtp(
                e.target.value
              )
            }
          />

          <button
            onClick={verifyOtp}
            className="mt-4 rounded bg-action px-6 py-3 text-white"
          >

            Validar

          </button>

        </div>

      )}

      {error && (

        <p className="mt-4 text-red-600">
          {error}
        </p>
      )}

      {saveMessage && (

        <p className="mt-4 text-green-600">
          {saveMessage}
        </p>
      )}

      {
  debugOtp && (

    <div
      className="
        mt-6
        rounded-2xl
        border-2
        border-yellow-400
        bg-yellow-50
        p-4
      "
    >

      <h3
        className="
          font-bold
          text-yellow-800
        "
      >

        MODO DESARROLLO

      </h3>

      <p
        className="
          mt-2
        "
      >

        Código OTP generado:

      </p>

      <div
        className="
          mt-2
          text-3xl
          font-bold
          tracking-widest
        "
      >

        {debugOtp}

      </div>

    </div>

  )
}

      <div className="mt-10 rounded-2xl border p-5">

        <strong>

          Última modificación

        </strong>

        {lastModification ? (

          <>

            <p>
              {new Date(
                lastModification.createdAt
              ).toLocaleDateString(
                "es-MX",
                {
                  dateStyle: "long"
                }
              )}
            </p>

            <p>
              {new Date(
                lastModification.createdAt
              ).toLocaleTimeString(
                "es-MX",
                {
                  hour: "2-digit",
                  minute: "2-digit"
                }
              )} hrs
            </p>

            <p>
              por {lastModification.user}
            </p>

            <p className="mt-3 font-semibold">
              Secciones modificadas:
            </p>

            <ul className="list-disc pl-5">
              {lastModification.modifiedSections.map(
                (section) => (
                  <li key={section}>
                    {section}
                  </li>
                )
              )}
            </ul>

          </>

        ) : (

          <p>
            Sin modificaciones registradas
          </p>
        )}

      </div>

      

      <PasswordConfirmModal

  open={
    showSaveModal
  }

  title="Confirmar cambios"

  message="¿Deseas guardar los cambios de configuración?"

  onCancel={() =>
    setShowSaveModal(
      false
    )
  }

  onAccept={() => {

    setShowSaveModal(
      false
    );

    saveSettings();
  }}
/> 

      <PasswordConfirmModal

  open={
    showPasswordModal
  }

  onCancel={() =>
    setShowPasswordModal(
      false
    )
  }

  onAccept={() => {

    savePassword();
  }}
/>
<div className="mt-8 rounded-lg bg-yellow-50 p-4 text-sm">

⚠️ Recuerda que cualquier modificación de configuración requiere validación mediante código de seguridad enviado al correo administrador del negocio.

</div>
    </div>
    
  );
}