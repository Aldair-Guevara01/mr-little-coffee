"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/api";
import { authPageHref, postLoginDestination } from "@/lib/auth";
import { loginSchema } from "@/lib/auth-validation";
import { errorStyle, field, label, panel, primary } from "@/components/auth/styles";

export function LoginForm() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  useEffect(() => { if (ready && user) router.replace(postLoginDestination(user.role, next)); }, [ready, user, router, next]);
  const submit = handleSubmit(async (values) => {
    setError("");
    try { await login(values.email, values.password); }
    catch (failure) { setError(errorMessage(failure)); }
  });
  if (!ready || user) return <p className="py-12 text-center text-[#e5d8c7]" role="status">{!ready ? "Comprobando tu sesión…" : "Redirigiendo…"}</p>;
  return <form className={panel + " mx-auto w-full max-w-lg space-y-5"} onSubmit={submit} noValidate>
    <Image className="mx-auto" src="/images/brand/mr-little-coffee-mascot.png" width={88} height={88} alt="Mascota de Mr. Little Coffee" />
    <div><span className="text-xs tracking-widest text-[#d4ae6e]">BIENVENIDO DE NUEVO</span><h1 className="my-3 text-4xl">Tu mesa te espera.</h1><p className="text-sm text-[#c8b9a8]">Inicia sesión para gestionar tu perfil y tus reservas.</p></div>
    <label className={label} htmlFor="login-email">Correo o usuario<input id="login-email" className={field} type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "login-email-error" : undefined} /></label>
    {errors.email && <p id="login-email-error" className="text-sm text-red-200" role="alert">{errors.email.message}</p>}
    <label className={label} htmlFor="login-password">Contraseña<input id="login-password" className={field} type={show ? "text" : "password"} autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} aria-describedby={errors.password ? "login-password-error" : undefined} /></label>
    {errors.password && <p id="login-password-error" className="text-sm text-red-200" role="alert">{errors.password.message}</p>}
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} /> Mostrar contraseña</label>
    {error && <p className={errorStyle} role="alert">{error}</p>}
    <button className={primary + " w-full"} disabled={isSubmitting || !ready}>{isSubmitting ? "Ingresando…" : "Iniciar sesión"}</button>
    <p className="text-center text-sm">¿No tienes cuenta? <Link className="text-[#d4ae6e] underline" href={authPageHref("/registro", next)}>Regístrate</Link></p>
  </form>;
}
