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

import AddressFields
from "@/src/components/location/address-fields";

import { countries }
from "@/src/constants/countries";

import {
  isValidEmail,
  isValidPhone
}
from "@/src/lib/business-settings-validator";

import { validatePassword }
from "@/src/lib/password-validator";

type Schedule = {
  day: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
};

const scheduleDays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo"
];

function createDefaultSchedules(): Schedule[] {
  return scheduleDays.map((day) => ({
    day,
    enabled: false,
    openTime: "03:00 PM",
    closeTime: "11:00 PM"
  }));
}

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

const [schedules,
  setSchedules] =
  useState<Schedule[]>(createDefaultSchedules);

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
    galleryUrls: [] as string[],
    schedules: createDefaultSchedules()
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
        const loadedSchedules: Schedule[] = profile.schedules?.length
          ? profile.schedules.map(
              (schedule: {
                dayOfWeek: number;
                enabled: boolean;
                openTime: string | null;
                closeTime: string | null;
              }) => ({
                day: scheduleDays[schedule.dayOfWeek - 1],
                enabled: schedule.enabled,
                openTime: schedule.openTime ?? "03:00 PM",
                closeTime: schedule.closeTime ?? "11:00 PM"
              })
            )
          : createDefaultSchedules();

        setSchedules(loadedSchedules);

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
          galleryUrls: profile.galleryUrls || [],
          schedules: loadedSchedules.map((schedule) => ({ ...schedule }))
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

    galleryUrls,

    schedules

  }) !==

  JSON.stringify({

    ...initialProfile,

    schedules:
      initialProfile.schedules ?? []
  });


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
              schedules,
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
        galleryUrls,
        schedules
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

  const timeOptions = [

  "12:00 AM",
  "01:00 AM",
  "02:00 AM",
  "03:00 AM",
  "04:00 AM",
  "05:00 AM",

  "06:00 AM",
  "07:00 AM",
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",

  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",

  "06:00 PM",
  "07:00 PM",
  "08:00 PM",
  "09:00 PM",
  "10:00 PM",
  "11:00 PM",
];


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
      Branding
    </h2>

    <div className="grid gap-6 md:grid-cols-2">
      <label
  className="
    relative
    block
    aspect-square
    w-full
    overflow-hidden
    rounded-2xl
    border-2
    border-dashed
    border-slate-300
    cursor-pointer
  "
  onDragOver={(event) =>
    event.preventDefault()
  }
  onDrop={(event) => {

    event.preventDefault();

    const file =
      event.dataTransfer.files[0];

    if (file) {

      uploadAsset(
        file,
        "logo"
      );
    }
  }}
>

  <input
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(event) => {

      const file =
        event.target.files?.[0];

      if (file) {

        uploadAsset(
          file,
          "logo"
        );
      }
    }}
  />

  {logoUrl ? (

    <>
      <Image
        src={logoUrl}
        alt="Logo del negocio"
        fill
        sizes="320px"
        className="object-cover"
      />

      <div
        className="
          absolute
          inset-0
          flex
          items-center
          justify-center
          bg-black/50
          opacity-0
          transition-opacity
          hover:opacity-100
        "
      >

        <div className="text-center text-white">

          <p className="font-semibold">

            Actualizar logo

          </p>

          <p className="text-sm">

            Clic o arrastra una nueva imagen

          </p>

        </div>

      </div>
    </>

  ) : (

    <div
      className="
        flex
        h-full
        flex-col
        items-center
        justify-center
        text-center
      "
    >

      <div className="text-5xl">

        🖼️

      </div>

      <p className="mt-4 font-semibold">

        Haz clic para subir tu logo

      </p>

      <p className="text-sm text-slate-500">

        o arrastra la imagen aquí

      </p>

      <p className="mt-2 text-xs text-slate-400">

        PNG, JPG o WEBP · Máx. 5 MB

      </p>

    </div>

  )}

      </label>

      <label
  className="
    relative
    block
    aspect-video
    w-full
    overflow-hidden
    rounded-2xl
    border-2
    border-dashed
    border-slate-300
    cursor-pointer
  "
  onDragOver={(event)=>
    event.preventDefault()
  }
  onDrop={(event)=>{

    event.preventDefault();

    const file =
      event.dataTransfer.files[0];

    if(file){

      uploadAsset(
        file,
        "banner"
      );
    }
  }}
>

  <input
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(event)=>{

      const file =
        event.target.files?.[0];

      if(file){

        uploadAsset(
          file,
          "banner"
        );
      }
    }}
  />

  {bannerUrl ? (

    <>
      <Image
        src={bannerUrl}
        alt="Banner principal del negocio"
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
      />

      <div
        className="
          absolute
          inset-0
          flex
          items-center
          justify-center
          bg-black/50
          opacity-0
          transition-opacity
          hover:opacity-100
        "
      >

        <div className="text-center text-white">

          <p className="font-semibold">

            Actualizar banner principal

          </p>

          <p className="text-sm">

            Clic o arrastra una nueva imagen

          </p>

        </div>

      </div>
    </>

  ) : (

    <div
      className="
        flex
        h-full
        flex-col
        items-center
        justify-center
        text-center
      "
    >

      <div className="text-5xl">

        🖼️

      </div>

      <p className="mt-4 font-semibold">

        Haz clic para subir tu banner principal

      </p>

      <p className="text-sm text-slate-500">

        o arrastra la imagen aquí

      </p>

      <p className="mt-2 text-xs text-slate-400">

        PNG, JPG o WEBP · Máx. 5 MB

      </p>

    </div>

  )}

</label>
    </div>

    <label
  className="
    mt-6
    flex
    min-h-48
    cursor-pointer
    flex-col
    items-center
    justify-center
    rounded-2xl
    border-2
    border-dashed
    border-slate-300
    text-center
  "
  onDragOver={(event)=>
    event.preventDefault()
  }
  onDrop={(event)=>{

    event.preventDefault();

    [...event.dataTransfer.files]
      .forEach((file)=>{

        uploadAsset(
          file,
          "gallery"
        );
      });
  }}
>

  <input
    type="file"
    multiple
    accept="image/*"
    className="hidden"
    onChange={(event)=>{

      const files =
        [
          ...(event.target.files ?? [])
        ];

      files.forEach((file)=>{

        uploadAsset(
          file,
          "gallery"
        );
      });
    }}
  />

  <div className="text-5xl">

    📸

  </div>

  <p className="mt-4 font-semibold">

    Agregar imágenes a la galería

  </p>

  <p className="text-sm text-slate-500">

    Clic o arrastra imágenes aquí

  </p>

  <p className="mt-2 text-xs text-slate-400">

    PNG, JPG o WEBP · Máx. 5 MB

  </p>

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

      Dirección

    </h2>

    <AddressFields
      disabled={locked}
      includeContact={false}
      value={{
        street: addressLine,
        postalCode,
        neighborhood,
        city,
        state,
        country,
        reference: "",
        contactPhone: "",
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null
      }}
      onChange={(address) => {
        setAddressLine(address.street);
        setPostalCode(address.postalCode);
        setNeighborhood(address.neighborhood);
        setCity(address.city);
        setState(address.state);
        setCountry(address.country);
        setLatitude(address.latitude === null ? "" : String(address.latitude));
        setLongitude(address.longitude === null ? "" : String(address.longitude));
      }}
    />

  </section>
  
  <section className="rounded-3xl border p-8">

  <h2 className="mb-6 text-2xl font-bold">

    Horario de Servicio

  </h2>

  <p className="mb-6 text-sm text-slate-500">

    Este horario determinará cuándo el negocio
    estará disponible para recibir pedidos.

  </p>

  <div className="space-y-4">

    {schedules.map(
      (
        schedule,
        index
      ) => (

        <div
          key={schedule.day}
          className="rounded-xl border p-4"
        >

          <div className="flex flex-wrap items-center gap-4">

            <label className="flex items-center gap-2">

              <input
                type="checkbox"
                checked={
                  schedule.enabled
                }
                onChange={(e) => {

                  const updated =
                    [...schedules];

                  updated[index] = {
                    ...updated[index],
                    enabled: e.target.checked
                  };

                  setSchedules(
                    updated
                  );
                }}
              />

              <span className="font-medium">

                {schedule.day}

              </span>

            </label>

            {

              schedule.enabled && (

                <>

                  <span>
                    De:
                  </span>

                  <select
                    value={
                      schedule.openTime
                    }
                    onChange={(e) => {

                      const updated =
                        [...schedules];

                      updated[index] = {
                        ...updated[index],
                        openTime: e.target.value
                      };

                      setSchedules(
                        updated
                      );
                    }}
                    className="border p-2"
                  >

                    {timeOptions.map(
                      (time) => (

                        <option
                          key={time}
                        >
                          {time}
                        </option>

                      )
                    )}

                  </select>

                  <span>
                    a
                  </span>

                  <select
                    value={
                      schedule.closeTime
                    }
                    onChange={(e) => {

                      const updated =
                        [...schedules];

                      updated[index] = {
                        ...updated[index],
                        closeTime: e.target.value
                      };

                      setSchedules(
                        updated
                      );
                    }}
                    className="border p-2"
                  >

                    {timeOptions.map(
                      (time) => (

                        <option
                          key={time}
                        >
                          {time}
                        </option>

                      )
                    )}

                  </select>

                </>

              )

            }

          </div>

        </div>

      )
    )}

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

    Regresar

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