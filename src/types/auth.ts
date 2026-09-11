export type UserRole = "admin" | "customer";
export type DemoUser = { id: string; username: string; name: string; email?: string; role: UserRole };
export type LoginResult = { success: boolean; user?: DemoUser };
