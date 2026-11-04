"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, errorMessage } from "@/lib/api";
import { contactSchema, ContactValues } from "./contact.schema";

export function ContactForm() {
  const [success, setSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  async function submit(values: ContactValues) {
    setSuccess(false);
    setRequestError(null);
    try {
      await apiRequest<{ message: string }>("/contact", { method: "POST", body: JSON.stringify(values) });
      reset();
      setSuccess(true);
    } catch (error) {
      setRequestError(errorMessage(error));
    }
  }

  const inputClass = "mt-2 block min-h-[44px] w-full rounded border border-[#765a36] bg-[#100d0b] p-3 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--light-gold)]";
  return <form className="border border-[var(--border)] bg-[#16120f] p-6 md:p-8" noValidate onSubmit={handleSubmit(submit)} onChange={() => { setSuccess(false); setRequestError(null); }}>
    <h2 className="mb-6 text-3xl">Envíanos un mensaje</h2>
    <fieldset disabled={isSubmitting} className="m-0 space-y-5 border-0 p-0">
      <legend className="sr-only">Datos del mensaje. Todos los campos son obligatorios.</legend>
      <div><label htmlFor="contact-name" className="text-sm">Nombre</label><input id="contact-name" autoComplete="name" maxLength={100} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "contact-name-error" : undefined} className={inputClass} {...register("name")} />{errors.name && <p id="contact-name-error" role="alert" className="mt-2 text-sm text-[#edb1a7]">{errors.name.message}</p>}</div>
      <div><label htmlFor="contact-email" className="text-sm">Correo</label><input id="contact-email" type="email" autoComplete="email" maxLength={254} required aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} className={inputClass} {...register("email")} />{errors.email && <p id="contact-email-error" role="alert" className="mt-2 text-sm text-[#edb1a7]">{errors.email.message}</p>}</div>
      <div><label htmlFor="contact-message" className="text-sm">Mensaje</label><textarea id="contact-message" rows={6} maxLength={3000} required aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error contact-message-hint" : "contact-message-hint"} className={inputClass} {...register("message")} /><p id="contact-message-hint" className="mt-2 text-xs text-[#bdb1a4]">Entre 10 y 3000 caracteres.</p>{errors.message && <p id="contact-message-error" role="alert" className="text-sm text-[#edb1a7]">{errors.message.message}</p>}</div>
      <button className="goldButton" type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando mensaje…" : "Enviar mensaje"}</button>
    </fieldset>
    {success && <p role="status" className="mb-0 mt-6 rounded border border-[#659772] p-4 text-sm text-[#b9ddbf]">Recibimos tu mensaje. Gracias por escribirnos.</p>}
    {requestError && <p role="alert" className="mb-0 mt-6 rounded border border-[#a75045] p-4 text-sm text-[#edb1a7]">No se pudo guardar el mensaje. {requestError}</p>}
  </form>;
}
