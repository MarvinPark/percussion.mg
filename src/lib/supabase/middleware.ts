import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchAuthProfile } from "@/lib/profile-auth";
import { canAccessPath, normalizeRole } from "@/lib/permissions";
import {
  canUseApp,
  needsAdminApproval,
  needsProfileSetup,
} from "@/types/profile";

async function loadAuthProfile(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  return fetchAuthProfile(supabase, userId);
}

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

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname.startsWith("/login");
  const isSignupPage = pathname.startsWith("/signup");
  const isAuthCallbackPage = pathname.startsWith("/auth/");
  const isApiRoute = pathname.startsWith("/api/");
  const isProfileSetupPage = pathname.startsWith("/profile/setup");
  const isPendingApprovalPage = pathname.startsWith("/profile/pending-approval");
  const isProfileFlowPage =
    isProfileSetupPage || isPendingApprovalPage;
  const isAuthPage =
    isLoginPage ||
    isSignupPage ||
    isProfileFlowPage ||
    isAuthCallbackPage;

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (isLoginPage || isSignupPage)) {
    const profile = await loadAuthProfile(supabase, user.id);

    if (needsAdminApproval(profile)) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile/pending-approval";
      return NextResponse.redirect(url);
    }

    if (needsProfileSetup(profile)) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile/setup";
      return NextResponse.redirect(url);
    }

    if (canUseApp(profile)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/profile/pending-approval";
    return NextResponse.redirect(url);
  }

  if (user && !isProfileFlowPage && !isApiRoute) {
    const profile = await loadAuthProfile(supabase, user.id);

    if (needsProfileSetup(profile) && !isProfileSetupPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile/setup";
      return NextResponse.redirect(url);
    }

    if (
      needsAdminApproval(profile) &&
      !isPendingApprovalPage &&
      !isProfileSetupPage
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile/pending-approval";
      return NextResponse.redirect(url);
    }

    if (canUseApp(profile)) {
      const role = normalizeRole(profile?.role);
      if (!canAccessPath(role, pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    } else if (!isProfileSetupPage && !isPendingApprovalPage) {
      const url = request.nextUrl.clone();
      url.pathname = needsAdminApproval(profile)
        ? "/profile/pending-approval"
        : "/profile/setup";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
