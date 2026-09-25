import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
  });

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatarUrl } = body;

    // Validate name
    const sanitizedName =
      typeof name === "string" ? name.trim().slice(0, 100) : undefined;

    // Validate avatarUrl (can be string URL, base64 data URL, or null)
    let sanitizedAvatarUrl: string | null | undefined = undefined;
    if (avatarUrl === null) {
      sanitizedAvatarUrl = null;
    } else if (typeof avatarUrl === "string") {
      if (avatarUrl.length > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Image file is too large (maximum 2MB)." },
          { status: 400 },
        );
      }
      sanitizedAvatarUrl = avatarUrl;
    }

    // Update or create in Prisma database
    const updatedUser = await prisma.user.upsert({
      where: { authUserId: authUser.id },
      update: {
        ...(sanitizedName !== undefined ? { name: sanitizedName } : {}),
        ...(sanitizedAvatarUrl !== undefined ? { avatarUrl: sanitizedAvatarUrl } : {}),
      },
      create: {
        authUserId: authUser.id,
        email: authUser.email ?? "",
        name: sanitizedName ?? null,
        avatarUrl: sanitizedAvatarUrl ?? null,
      },
    });

    // Also sync to Supabase user_metadata if possible
    try {
      await supabase.auth.updateUser({
        data: {
          ...(sanitizedName !== undefined
            ? { full_name: sanitizedName, name: sanitizedName }
            : {}),
          ...(sanitizedAvatarUrl !== undefined
            ? {
                avatar_url: sanitizedAvatarUrl,
                picture: sanitizedAvatarUrl,
              }
            : {}),
        },
      });
    } catch (metaErr) {
      console.warn("Failed to sync metadata to Supabase auth:", metaErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update profile." },
      { status: 500 },
    );
  }
}
