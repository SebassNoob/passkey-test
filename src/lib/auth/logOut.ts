"use server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/app/auth/constants";

export async function logOut() {
  const cookieJar = await cookies();
  cookieJar.delete(SESSION_COOKIE_NAME);
}