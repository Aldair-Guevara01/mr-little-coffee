"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/api";
import { authPageHref, postLoginDestination } from "@/lib/auth";
import { registerSchema } from "@/lib/auth-validation";
import { errorStyle, field, label, panel, primary } from "./styles";

export function RegisterForm() {
  const { registerAccount, user, ready } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  useEffect(() => { if (ready && user) router.replace(postLoginDestination(user.role, next)); }, [ready, user, router, next]);
  const submit = handleSubmit(async ({ name, email, password }) => {
    setError("");
    try { await registerAccount({ name, email, password }); }
    catch (failure) { setError(errorMessage(failure)); }
  });
  if (!ready || user) return <p className="py-12 text-center text-[#e5d8c7]" role="status">{!ready ? "Comprobando tu sesión…" : "Redirigiendo…"}</p>;
  return <form className={panel + " mx-auto w-full max-w-lg space-y-5"} onSubmit={submit} noValidate>
    <div><span className="text-xs tracking-widest text-[#d4ae6e]">TU ESPACIO EN MR. LITTLE COFFEE</span><h1 className="my-3 text-4xl">Crea tu cuenta</h1><p className="text-sm text-[#c8b9a8]">Guarda tus datos y organiza tus próximas visitas.</p></div>
    <label className={label} htmlFor="register-name">Nombre completo<input id="register-name" className={field} autoComplete="name" maxLength={100} {...register("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "register-name-error" : undefined} /></label>
    {errors.name && <p id="register-name-error" className="text-sm text-red-200" role="alert">{errors.name.message}</p>}
    <label className={label} htmlFor="register-email">Correo electrónico<input id="register-email" className={field} type="email" autoComplete="email" maxLength={254} {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "register-email-error" : undefined} /></label>
    {errors.email && <p id="register-email-error" className="text-sm text-red-200" role="alert">{errors.email.message}</p>}
    <label className={label} htmlFor="register-password">Contraseña<input id="register-password" className={field} type={show ? "text" : "password"} autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} aria-describedby="register-password-help register-password-error" /></label>
    <p id="register-password-help" className="text-xs text-[#c8b9a8]">Usa al menos 8 caracteres y hasta 72 bytes. Los símbolos y acentos pueden ocupar más de un byte.</p>
    <p id="register-password-error" className="text-sm text-red-200" role={errors.password ? "alert" : undefined}>{errors.password?.message}</p>
    <label className={label} htmlFor="register-confirm">Confirmar contraseña<input id="register-confirm" className={field} type={show ? "text" : "password"} autoComplete="new-password" {...register("confirm")} aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? "register-confirm-error" : undefined} /></label>
    {errors.confirm && <p id="register-confirm-error" className="text-sm text-red-200" role="alert">{errors.confirm.message}</p>}
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} /> Mostrar contraseñas</label>
    {error && <p className={errorStyle} role="alert">{error}</p>}
    <button className={primary + " w-full"} disabled={isSubmitting || !ready}>{isSubmitting ? "Creando cuenta…" : "Crear cuenta"}</button>
    <p className="text-center text-sm">¿Ya tienes cuenta? <Link className="text-[#d4ae6e] underline" href={authPageHref("/login", next)}>Inicia sesión</Link></p>
  </form>;
}
