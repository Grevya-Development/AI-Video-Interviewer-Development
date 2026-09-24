import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Returns the current HR User row, or null if not authenticated.
 *
 * Wrapped in React `cache()` so multiple callers within a single server
 * render share ONE result (no repeated auth + DB round-trips per request).
 *
 * Read-mostly: we look the user up by authUserId (cheap read) and only write
 * (create) the mirror row the first time we ever see this auth user — instead
 * of upserting on every request.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Extract avatar URL and display name from Google OAuth metadata
  const avatarUrl =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    null;

  const name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    null;

  const existing = await prisma.user.findUnique({
    where: { authUserId: user.id },
  });

  if (existing) {
    // If user has no avatarUrl or name yet, backfill from metadata
    if ((avatarUrl && !existing.avatarUrl) || (name && !existing.name)) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          avatarUrl: existing.avatarUrl ?? avatarUrl,
          name: existing.name ?? name,
        },
      });
    }
    return existing;
  }

  // First sight of this auth user — create the mirror row once with avatarUrl.
  try {
    return await prisma.user.create({
      data: {
        authUserId: user.id,
        email: user.email ?? "",
        name: name ?? null,
        avatarUrl: avatarUrl ?? null,
      },
    });
  } catch {
    // If concurrent requests raced to create the record, return the created record
    return prisma.user.findUnique({
      where: { authUserId: user.id },
    });
  }
});

/** Throws (for API routes) if not authenticated. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}
