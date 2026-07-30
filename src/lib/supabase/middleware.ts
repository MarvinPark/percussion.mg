import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath } from "@/lib/permissions";
import { fetchUserRole } from "@/lib/profile";
import { isProfileComplete } from "@/types/profile";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isSignupPage = request.nextUrl.pathname.startsWith("/signup");
  const isAuthCallbackPage = request.nextUrl.pathname.startsWith("/auth/");
  const isProfileSetupPage =
    request.nextUrl.pathname.startsWith("/profile/setup");
  const isAuthPage =
    isLoginPage || isSignupPage || isProfileSetupPage || isAuthCallbackPage;

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && isSignupPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && !isProfileSetupPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, job_title, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (!isProfileComplete(profile)) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile/setup";
      return NextResponse.redirect(url);
    }

    const role = await fetchUserRole(supabase, user.id);
    if (!canAccessPath(role, request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
