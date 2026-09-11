"use client";
import { createContext, useEffect, useState } from "react";
import { demoAccounts } from "@/data/demo-users";
import { DemoUser, LoginResult } from "@/types/auth";
const SESSION_KEY="mr-little-coffee-demo-session";
type AuthContextValue={user:DemoUser|null;isAuthenticated:boolean;isLoading:boolean;isHydrated:boolean;login:(username:string,password:string)=>Promise<LoginResult>;register:(data:Omit<DemoUser,"id"|"role">)=>Promise<DemoUser>;logout:()=>void};
export const DemoAuthContext=createContext<AuthContextValue|null>(null);
export function DemoAuthProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<DemoUser|null>(null),[isHydrated,setHydrated]=useState(false),[isLoading,setLoading]=useState(false);
 useEffect(()=>{try{const value=sessionStorage.getItem(SESSION_KEY);if(value)setUser(JSON.parse(value) as DemoUser)}finally{setHydrated(true)}},[]);
 const persist=(next:DemoUser)=>{setUser(next);sessionStorage.setItem(SESSION_KEY,JSON.stringify(next))};
 const login=async(username:string,password:string)=>{setLoading(true);await new Promise(r=>setTimeout(r,700));const account=demoAccounts.find(a=>a.username===username&&a.password===password);setLoading(false);if(!account)return{success:false};const {password:_,...safeUser}=account;persist(safeUser);return{success:true,user:safeUser}};
 const register=async(data:Omit<DemoUser,"id"|"role">)=>{setLoading(true);await new Promise(r=>setTimeout(r,700));const next:DemoUser={...data,id:`customer-${Date.now()}`,role:"customer"};persist(next);setLoading(false);return next};
 const logout=()=>{sessionStorage.removeItem(SESSION_KEY);setUser(null)};
 return <DemoAuthContext.Provider value={{user,isAuthenticated:!!user,isLoading,isHydrated,login,register,logout}}>{children}</DemoAuthContext.Provider>
}
