"use client";
import { useContext } from "react";
import { DemoAuthContext } from "@/context/DemoAuthContext";
export function useDemoAuth(){const value=useContext(DemoAuthContext);if(!value)throw new Error("useDemoAuth debe usarse dentro de DemoAuthProvider");return value}
