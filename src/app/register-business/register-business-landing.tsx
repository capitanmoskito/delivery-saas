"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Bike,
  CakeSlice,
  Check,
  ChefHat,
  ChevronDown,
  CircleDollarSign,
  Coffee,
  CreditCard,
  Eye,
  EyeOff,
  ForkKnife,
  Hamburger,
  LayoutDashboard,
  Menu,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { faqs } from "@/src/constants/faqs";
import { validatePassword } from "@/src/lib/password-validator";
import { TestimonialsCarousel } from "./testimonials-carousel";

const benefits = [
  { icon: ShoppingBag, title: "Pedidos en línea", description: "Recibe pedidos en tu tienda digital, abierta para tus clientes a cualquier hora." },
  { icon: CreditCard, title: "Pagos a tu manera", description: "Ofrece alternativas de pago y lleva cada venta en un mismo lugar." },
  { icon: ReceiptText, title: "Comanda digital", description: "Consulta pedidos claros y mantén a tu equipo en sintonía." },
  { icon: Bike, title: "Delivery sin complicaciones", description: "Organiza pedidos para entrega o recolección desde tu panel." },
  { icon: Sparkles, title: "Promociones y paquetes", description: "Arma ofertas atractivas para impulsar tus platillos favoritos." },
  { icon: BarChart3, title: "Información para crecer", description: "Revisa tus ventas y entiende mejor el movimiento de tu negocio." },
];

const businessTypes = [
  { label: "Taquerías", icon: UtensilsCrossed },
  { label: "Torterías", icon: SandwichIcon },
  { label: "Cafeterías", icon: Coffee },
  { label: "Postres", icon: CakeSlice },
  { label: "Loncherías", icon: Hamburger },
  { label: "Cocinas económicas", icon: ChefHat },
  { label: "Fondas", icon: ForkKnife },
  { label: "Hamburgueserías", icon: Hamburger },
];

const initialForm = {
  businessName: "",
  firstName: "",
  lastNamePaternal: "",
  lastNameMaternal: "",
  email: "",
  password: "",
  referralCode: "",
  gender: "unspecified",
};

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const fieldClassName =
  "h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-[#d95d39] focus:ring-4 focus:ring-[#d95d39]/10";

type RegistrationForm = typeof initialForm;

export function RegisterBusinessLanding() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const passwordRules = validatePassword(form.password);
  const emailsMatch = form.email === confirmEmail;
  const passwordsMatch = form.password === confirmPassword;
  const motionProps = reduceMotion
    ? { initial: false as const, whileInView: undefined, viewport: undefined }
    : { initial: "hidden" as const, whileInView: "visible" as const, viewport: { once: true, amount: 0.18 } };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!emailsMatch || !passwordsMatch) {
      window.alert("Revisa que los correos y las contraseñas coincidan.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/business/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const text = await response.text();
      let data: { success?: boolean; message?: string };

      try {
        data = JSON.parse(text) as { success?: boolean; message?: string };
      } catch {
        console.error("Respuesta inválida:", text);
        window.alert("No pudimos completar el registro. Inténtalo de nuevo.");
        return;
      }

      if (data.success) {
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const loginData: { success?: boolean; message?: string } = await loginResponse.json();

        if (!loginResponse.ok || !loginData.success) {
          window.alert(loginData.message || "Tu negocio se registró, pero no pudimos iniciar sesión. Ingresa con tu correo y contraseña.");
          router.push("/login");
          return;
        }

        router.push("/business/dashboard");
        return;
      }

      window.alert(data.message ?? "Error al registrar negocio");
    } finally {
      setLoading(false);
    }
  }

  function updateForm(field: keyof RegistrationForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function scrollToForm() {
    document.getElementById("registro")?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  }

  return (
    <main className="overflow-hidden bg-[#faf9f6] text-[#2b2118]">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-stone-200/70 bg-[#faf9f6]/85 shadow-sm backdrop-blur-xl" : "bg-transparent"}`}>
        <div className="mx-auto flex h-19 max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#inicio" className="flex items-center gap-2.5" aria-label="DELIM, inicio">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d95d39] text-white"><Store size={19} aria-hidden="true" /></span>
            <span className="text-xl font-extrabold tracking-[0.08em]">DELIM</span>
          </a>
          <nav className="hidden items-center gap-9 text-sm font-medium text-stone-600 md:flex" aria-label="Navegación principal">
            <a className="transition hover:text-[#d95d39]" href="#beneficios">Beneficios</a>
            <a className="transition hover:text-[#d95d39]" href="#precios">Precios</a>
            <a className="transition hover:text-[#d95d39]" href="#preguntas">Preguntas frecuentes</a>
          </nav>
          <button type="button" onClick={scrollToForm} className="hidden h-11 items-center gap-2 rounded-xl bg-[#d95d39] px-5 text-sm font-bold text-white shadow-[0_8px_20px_-10px_#a94327] transition hover:-translate-y-0.5 hover:bg-[#c64e2d] md:flex">
            Comenzar ahora <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white/80 md:hidden" aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="border-t border-stone-200 bg-[#faf9f6] px-5 py-4 md:hidden" aria-label="Navegación móvil">
              <div className="mx-auto flex max-w-7xl flex-col gap-1">
                {[["Beneficios", "#beneficios"], ["Precios", "#precios"], ["Preguntas frecuentes", "#preguntas"]].map(([label, href]) => (
                  <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-stone-700 hover:bg-white">{label}</a>
                ))}
                <button type="button" onClick={scrollToForm} className="mt-2 h-11 rounded-xl bg-[#d95d39] text-sm font-bold text-white">Comenzar ahora</button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <section id="inicio" className="relative scroll-mt-24 px-5 pb-20 pt-32 sm:px-8 sm:pb-24 sm:pt-40">
        <div className="pointer-events-none absolute -right-36 top-12 h-115 w-115 rounded-full bg-[radial-gradient(circle,#f4b94233,transparent_70%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#edd8ca] bg-white/80 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#a94327]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d95d39]" /> Tu negocio, listo para crecer
            </span>
            <h1 className="mt-7 max-w-162.5 text-5xl leading-[1.06] font-extrabold tracking-[-0.045em] text-[#2b2118] sm:text-6xl lg:text-7xl">
              Digitaliza tu negocio y prepárate para <span className="text-[#d95d39]">vender más.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
              Con DELIM, tu negocio obtiene una tienda en línea profesional, gestión de pedidos, pagos digitales y herramientas para crecer sin complicaciones.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={scrollToForm} className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-[#d95d39] px-6 text-sm font-bold text-white shadow-[0_12px_24px_-12px_#a94327] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#c64e2d]">
                Comenzar prueba gratis <ArrowRight size={17} aria-hidden="true" />
              </button>
              <a href="#beneficios" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white/70 px-6 text-sm font-bold text-stone-700 transition duration-200 hover:border-stone-400 hover:bg-white">
                Ver beneficios <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-stone-500">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-700" /> 15 días sin costo</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-700" /> Sin comisión por pedido</span>
            </div>
          </motion.div>
          <motion.div initial={reduceMotion ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, delay: 0.12, ease: "easeOut" }} className="relative mx-auto w-full max-w-152.5">
            <DashboardMockup />
            <div className="absolute -bottom-5 -left-2 flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3.5 shadow-[0_18px_48px_-24px_rgba(43,33,24,0.35)] sm:-left-7 sm:p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f2e7] text-[#367044]"><PackageCheck size={20} /></span>
              <span><span className="block text-xs text-stone-500">Pedido recibido</span><strong className="mt-0.5 block text-sm">#DL-204 · En preparación</strong></span>
            </div>
            <div className="absolute -right-1 top-8 hidden items-center gap-2 rounded-xl bg-[#2b2118] px-3.5 py-3 text-white shadow-xl sm:flex">
              <CircleDollarSign size={19} className="text-[#f4b942]" /><span className="text-xs font-semibold">Tus ventas, bajo control</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="beneficios" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <motion.div {...motionProps} variants={reveal} className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a94327]">Todo en un solo lugar</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#2b2118] sm:text-4xl">¿Por qué elegir DELIM?</h2>
            <p className="mt-4 leading-7 text-stone-600">Menos vueltas en la operación diaria. Más tiempo para enfocarte en tu cocina y tus clientes.</p>
          </motion.div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <motion.article key={title} {...motionProps} variants={reveal} transition={{ delay: index * 0.045, duration: 0.24 }} whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }} className="group rounded-lg border border-stone-200/80 bg-[#fdfcf9] p-6 transition-colors duration-200 hover:border-[#e7b6a4] hover:bg-white sm:p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f7e9df] text-[#b3472b] transition duration-200 group-hover:rotate-[-4deg] group-hover:bg-[#d95d39] group-hover:text-white"><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></span>
                <h3 className="mt-5 text-lg font-bold text-stone-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...motionProps} variants={reveal} className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a94327]">Hecho para tu cocina</p><h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Diseñado para negocios como el tuyo</h2></div>
            <p className="max-w-sm text-sm leading-6 text-stone-600">La tecnología debe adaptarse a tu negocio, no al revés.</p>
          </motion.div>
          <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0">
            {businessTypes.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-w-41 snap-start items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-4 transition duration-200 hover:-translate-y-1 hover:border-[#e7b6a4] hover:shadow-lg sm:min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f0e9] text-[#7b5b36]"><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span>
                <span className="text-sm font-bold text-stone-800">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="scroll-mt-24 bg-[#f2eee7] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
          <motion.div {...motionProps} variants={reveal}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a94327]">Precio claro, operación sencilla</p>
            <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Todo en uno. Sin comisiones ocultas.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-stone-600">Conserva tus ventas y mantén el control de tus clientes.</p>
            <div className="mt-8 flex items-center gap-3 text-sm text-stone-600"><ShieldCheck size={20} className="text-[#42744b]" /> Sin sorpresas: un precio mensual fijo.</div>
          </motion.div>
          <motion.article {...motionProps} variants={reveal} className="relative rounded-lg border border-[#ead4c7] bg-white p-7 shadow-[0_28px_80px_-46px_rgba(43,33,24,0.35)] sm:p-9">
            <span className="absolute right-6 top-6 rounded-full bg-[#f4b942] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#493718]">Más popular</span>
            <p className="text-sm font-bold text-stone-500">Plan DELIM</p>
            <p className="mt-5 flex items-baseline gap-2"><span className="text-5xl font-extrabold tracking-tight text-[#2b2118]">$399</span><span className="text-sm font-medium text-stone-500">MXN / mes</span></p>
            <p className="mt-2 text-sm text-stone-500">Prueba gratis durante 15 días.</p>
            <div className="my-7 h-px bg-stone-100" />
            <ul className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {["Tienda en línea", "Gestión de pedidos", "Clientes", "Promociones", "Menú digital", "Marketplace DELIM", "Actualizaciones", "Soporte"].map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-stone-700"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7f2e7] text-[#367044]"><Check size={13} strokeWidth={3} /></span>{feature}</li>
              ))}
            </ul>
            <button type="button" onClick={scrollToForm} className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d95d39] text-sm font-bold text-white transition duration-200 hover:scale-[1.02] hover:bg-[#c64e2d]">Contratar ahora <ArrowRight size={16} /></button>
            <p className="mt-3 text-center text-xs text-stone-500">Sin comisión por pedido. Cancela cuando quieras.</p>
          </motion.article>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...motionProps} variants={reveal} className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a94327]">Historias por venir</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Negocios que ya crecen con DELIM</h2>
          </motion.div>
          <TestimonialsCarousel testimonials={[]} />
        </div>
      </section>

      <section id="preguntas" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
          <motion.div {...motionProps} variants={reveal}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a94327]">Resolvemos tus dudas</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-stone-600">Todo lo que necesitas saber antes de llevar tu negocio a DELIM.</p>
          </motion.div>
          <div className="divide-y divide-stone-200 border-y border-stone-200">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={faq.question}>
                  <button type="button" className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-bold text-stone-800 sm:text-base" aria-expanded={isOpen} onClick={() => setActiveFaq(isOpen ? null : index)}>
                    {faq.question}<ChevronDown size={19} className={`shrink-0 text-stone-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="overflow-hidden"><p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-stone-600">{faq.answer}</p></motion.div>}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#2b2118] px-5 py-14 text-white sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl px-1 text-center sm:px-4">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#f4b942]"><Sparkles size={23} /></span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Comienza hoy mismo</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">Prueba DELIM durante 15 días sin costo y descubre cómo vender más, organizar mejor tu negocio y acercarte a nuevos clientes.</p>
          <button type="button" onClick={scrollToForm} className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f4b942] px-6 text-sm font-extrabold text-[#2b2118] transition duration-200 hover:scale-[1.02] hover:bg-[#ffca5d]">Crear mi negocio <ArrowRight size={16} /></button>
        </div>
      </section>

      <section id="registro" className="scroll-mt-20 bg-[#f2eee7] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
          <motion.div {...motionProps} variants={reveal}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a94327]">Tu siguiente paso</p>
            <h2 className="mt-3 max-w-lg text-3xl font-extrabold tracking-tight sm:text-4xl">Abre tu tienda en DELIM</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-stone-600">Crea tu cuenta y comienza tus 15 días de prueba. Tu negocio y tus clientes, conectados desde el primer día.</p>
            <div className="mt-7 space-y-4">
              {["Configuración guiada para comenzar", "Tu menú disponible en línea", "Herramientas para operar y crecer"].map((item) => <p key={item} className="flex items-center gap-3 text-sm font-medium text-stone-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#367044]"><Check size={14} strokeWidth={3} /></span>{item}</p>)}
            </div>
          </motion.div>
          <motion.div {...motionProps} variants={reveal} className="rounded-lg border border-stone-200/80 bg-white p-6 shadow-[0_26px_75px_-46px_rgba(43,33,24,0.32)] sm:p-9 lg:sticky lg:top-24">
            <div className="mb-7">
              <p className="text-lg font-extrabold text-stone-900">Crea tu cuenta</p>
              <p className="mt-1 text-sm text-stone-500">Empieza gratis. No necesitas tarjeta.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Nombre del negocio"><input className={fieldClassName} autoComplete="organization" required value={form.businessName} onChange={(event) => updateForm("businessName", event.target.value)} placeholder="Ej. Taquería El Comal" /></FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Nombre(s)"><input className={fieldClassName} autoComplete="given-name" required value={form.firstName} onChange={(event) => updateForm("firstName", event.target.value)} placeholder="Tu nombre" /></FormField>
                <FormField label="Apellido paterno"><input className={fieldClassName} autoComplete="family-name" required value={form.lastNamePaternal} onChange={(event) => updateForm("lastNamePaternal", event.target.value)} placeholder="Tu apellido" /></FormField>
              </div>
              <FormField label="Apellido materno"><input className={fieldClassName} required value={form.lastNameMaternal} onChange={(event) => updateForm("lastNameMaternal", event.target.value)} placeholder="Tu apellido" /></FormField>
              <FormField label="Género (opcional)">
                <select className={fieldClassName} value={form.gender} onChange={(event) => updateForm("gender", event.target.value)}>
                  <option value="unspecified">Prefiero no decirlo</option><option value="female">Mujer</option><option value="male">Hombre</option>
                </select>
              </FormField>
              <FormField label="Correo electrónico"><input className={fieldClassName} type="email" autoComplete="email" required value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="tu@negocio.com" /></FormField>
              <FormField label="Confirma tu correo"><input className={fieldClassName} type="email" autoComplete="email" required value={confirmEmail} onChange={(event) => setConfirmEmail(event.target.value)} placeholder="Repite tu correo" />{confirmEmail && !emailsMatch && <FieldError>Los correos no coinciden.</FieldError>}</FormField>
              <FormField label="Contraseña">
                <div className="relative"><input className={`${fieldClassName} pr-12`} type={showPassword ? "text" : "password"} autoComplete="new-password" required value={form.password} onChange={(event) => updateForm("password", event.target.value)} placeholder="Crea una contraseña" /><button type="button" className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              </FormField>
              <FormField label="Confirma tu contraseña">
                <div className="relative"><input className={`${fieldClassName} pr-12`} type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repite tu contraseña" /><button type="button" className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100" onClick={() => setShowConfirmPassword((show) => !show)} aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                {confirmPassword && !passwordsMatch && <FieldError>Las contraseñas no coinciden.</FieldError>}
              </FormField>
              <div className="rounded-xl bg-[#faf9f6] p-4">
                <p className="mb-2 text-xs font-bold text-stone-700">Tu contraseña debe incluir:</p>
                <div className="grid gap-2 text-xs text-stone-500 sm:grid-cols-2">
                  <PasswordRule valid={passwordRules.minLength}>Mínimo 8 caracteres</PasswordRule>
                  <PasswordRule valid={passwordRules.uppercase}>Una letra mayúscula</PasswordRule>
                  <PasswordRule valid={passwordRules.lowercase}>Una letra minúscula</PasswordRule>
                  <PasswordRule valid={passwordRules.number}>Un número</PasswordRule>
                  <PasswordRule valid={passwordRules.special}>Un carácter especial</PasswordRule>
                </div>
              </div>
              <FormField label="Código de referido (opcional)"><input className={fieldClassName} value={form.referralCode} onChange={(event) => updateForm("referralCode", event.target.value)} placeholder="Ej. 012-ABC-245" /></FormField>
              <button type="submit" disabled={loading || !emailsMatch || !passwordsMatch || !passwordRules.minLength || !passwordRules.uppercase || !passwordRules.lowercase || !passwordRules.number || !passwordRules.special} className="mt-2 inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#d95d39] px-5 text-sm font-bold text-white transition duration-200 hover:bg-[#c64e2d] disabled:cursor-not-allowed disabled:bg-stone-300">
                {loading ? "Registrando…" : "Crear mi negocio"}{!loading && <ArrowRight size={17} />}
              </button>
              <p className="text-center text-xs leading-5 text-stone-500">Al crear tu cuenta, aceptas nuestros términos y el aviso de privacidad.</p>
            </form>
          </motion.div>
        </div>
      </section>

    </main>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="block text-xs font-bold text-stone-700">{label}</span>{children}</label>;
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-xs text-red-600">{children}</span>;
}

function PasswordRule({ valid, children }: { valid: boolean; children: React.ReactNode }) {
  return <span className={`flex items-center gap-1.5 ${valid ? "text-emerald-700" : ""}`}><Check size={13} className={valid ? "" : "text-stone-300"} aria-hidden="true" />{children}</span>;
}

function DashboardMockup() {
  return (
    <div className="relative rounded-[26px] border border-stone-200/80 bg-white p-3 shadow-[0_34px_90px_-40px_rgba(43,33,24,0.32)] sm:p-5">
      <div className="flex items-center justify-between border-b border-stone-100 px-2 pb-4">
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d95d39] text-white"><Store size={16} /></span><span className="text-sm font-extrabold">DELIM <span className="font-medium text-stone-400">/ Panel</span></span></div>
        <div className="flex items-center gap-2"><span className="hidden rounded-full bg-[#e7f2e7] px-2.5 py-1 text-[10px] font-bold text-[#367044] sm:inline">Tienda abierta</span><span className="h-7 w-7 rounded-full bg-[#f4dfc8]" /></div>
      </div>
      <div className="grid grid-cols-[44px_1fr] gap-3 pt-4 sm:grid-cols-[150px_1fr] sm:gap-5">
        <aside className="space-y-3 border-r border-stone-100 pr-2 sm:pr-4">
          <div className="flex h-8 items-center justify-center gap-2 rounded-lg bg-[#f8ece5] text-[#a94327] sm:justify-start sm:px-2"><LayoutDashboard size={15} /><span className="hidden text-[10px] font-bold sm:inline">Resumen</span></div>
          {[{ Icon: ReceiptText, label: "Pedidos" }, { Icon: Store, label: "Mi tienda" }, { Icon: BarChart3, label: "Estadísticas" }].map(({ Icon, label }) => <div key={label} className="flex h-8 items-center justify-center gap-2 text-stone-400 sm:justify-start sm:px-2"><Icon size={15} /><span className="hidden text-[10px] font-medium sm:inline">{label}</span></div>)}
          <div className="mt-5 hidden rounded-lg bg-[#f8f6f1] p-2 sm:block"><p className="text-[9px] font-bold text-stone-500">CRECIMIENTO</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200"><div className="h-full w-3/4 rounded-full bg-[#f4b942]" /></div><p className="mt-1.5 text-[9px] text-stone-500">Tu tienda está lista</p></div>
        </aside>
        <div className="min-w-0">
          <div className="flex items-start justify-between"><div><p className="text-[10px] text-stone-500 sm:text-xs">Jueves, 12 de junio</p><p className="mt-1 text-sm font-extrabold sm:text-lg">¡Hola, María! <span className="hidden sm:inline">👋</span></p></div><span className="rounded-lg border border-stone-200 px-2 py-1 text-[9px] font-semibold text-stone-500 sm:text-[10px]">Esta semana⌄</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
            <div className="rounded-xl bg-[#f8f6f1] p-3 sm:p-4"><div className="flex items-center justify-between"><span className="text-[9px] font-medium text-stone-500 sm:text-[10px]">Ventas</span><CircleDollarSign size={14} className="text-[#d95d39]" /></div><p className="mt-2 text-base font-extrabold sm:text-xl">$8,420</p><p className="mt-1 text-[9px] font-semibold text-[#367044]">↑ 12.8% <span className="font-normal text-stone-400">vs. semana pasada</span></p></div>
            <div className="rounded-xl bg-[#f8f6f1] p-3 sm:p-4"><div className="flex items-center justify-between"><span className="text-[9px] font-medium text-stone-500 sm:text-[10px]">Pedidos</span><ShoppingBag size={14} className="text-[#b78225]" /></div><p className="mt-2 text-base font-extrabold sm:text-xl">48</p><p className="mt-1 text-[9px] font-semibold text-[#367044]">↑ 8 esta semana</p></div>
          </div>
          <div className="mt-3 rounded-xl border border-stone-100 p-3 sm:mt-4 sm:p-4">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold sm:text-xs">Actividad de ventas</p><p className="mt-0.5 text-[9px] text-stone-400">Tus pedidos recientes</p></div><span className="flex items-center gap-1 text-[9px] font-bold text-[#367044]"><span className="h-1.5 w-1.5 rounded-full bg-[#65a76e]" /> En vivo</span></div>
            <div className="mt-4 flex h-19.5 items-end gap-1.5 sm:h-24 sm:gap-2">
              {[33, 54, 43, 76, 57, 91, 67, 83, 49, 72, 96, 68, 87].map((height, index) => <div key={index} className="flex-1 rounded-t-sm bg-[#edc8b7] transition-colors hover:bg-[#d95d39]" style={{ height: `${height}%` }} />)}
            </div>
            <div className="mt-2 flex justify-between text-[8px] text-stone-400"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fff8e9] px-3 py-2.5 sm:mt-4 sm:px-4"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f4b942]/30"><ReceiptText size={14} className="text-[#8b661b]" /></span><span><span className="block text-[9px] font-bold">Orden #204</span><span className="block text-[8px] text-stone-500">2 productos · Hace 2 min</span></span></div><span className="rounded-md bg-white px-2 py-1 text-[8px] font-bold text-[#8b661b]">Nuevo</span></div>
        </div>
      </div>
    </div>
  );
}

function SandwichIcon({ size = 20 }: { size?: number }) {
  return <ForkKnife size={size} aria-hidden="true" />;
}