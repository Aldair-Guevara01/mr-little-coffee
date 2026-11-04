"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, errorMessage } from "@/lib/api";
import { profileSchema } from "@/lib/auth-validation";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types/auth";
import { ProfileShell } from "./ProfileShell";
import { errorStyle, field, label, panel, primary, secondary, successStyle } from "@/components/auth/styles";

function Editor() {
  const { updateProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register, reset, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { name: "", phone: "" } });
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError("");
    api<{ user: User }>("/profile", { signal: controller.signal }).then(({ user }) => {
      reset({ name: user.name, phone: user.phone || "" }); setEmail(user.email);
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setLoadError(errorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt, reset]);
  const submit = handleSubmit(async (values) => {
    setError(""); setSuccess(false);
    try { await updateProfile({ name: values.name, phone: values.phone || null }); reset(values); setSuccess(true); }
    catch (failure) { setError(errorMessage(failure)); }
  });
  if (loading) return <p role="status">Cargando tus datos…</p>;
  if (loadError) return <div className="space-y-4"><p className={errorStyle} role="alert">{loadError}</p><button className={secondary} onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div>;
  return <form className={panel + " max-w-xl space-y-5"} onSubmit={submit} noValidate><h1 className="text-4xl">Editar mi perfil</h1>
    <label className={label} htmlFor="profile-name">Nombre completo<input className={field} id="profile-name" autoComplete="name" maxLength={100} {...register("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "profile-name-error" : undefined} /></label>
    {errors.name && <p id="profile-name-error" className="text-sm text-red-200" role="alert">{errors.name.message}</p>}
    <label className={label} htmlFor="profile-email">Correo electrónico<input className={field} id="profile-email" type="email" value={email} readOnly aria-describedby="email-help" /></label><p id="email-help" className="text-xs text-[#c8b9a8]">El correo no se puede modificar desde este formulario.</p>
    <label className={label} htmlFor="profile-phone">Teléfono (opcional)<input className={field} id="profile-phone" type="tel" autoComplete="tel" maxLength={25} {...register("phone")} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "profile-phone-error" : undefined} /></label>
    {errors.phone && <p id="profile-phone-error" className="text-sm text-red-200" role="alert">{errors.phone.message}</p>}
    {error && <p className={errorStyle} role="alert">{error}</p>}{success && <p className={successStyle} role="status">Tus datos se guardaron correctamente.</p>}
    <button className={primary} disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar cambios"}</button>
  </form>;
}
export function ProfileEditor() { return <ProfileShell backToProfile><Editor /></ProfileShell>; }
