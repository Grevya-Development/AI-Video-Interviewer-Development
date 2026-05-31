import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

/**
 * Mint a LiveKit access token for a participant joining a room.
 * The identity is what we use to label transcript segments by speaker.
 */
export async function createLiveKitToken(params: {
  roomName: string;
  identity: string;
  name: string;
  // HR can publish + subscribe; candidate too. Both publish A/V.
  metadata?: string;
}): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: params.identity,
    name: params.name,
    metadata: params.metadata,
    ttl: "4h",
  });

  at.addGrant({
    room: params.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
}
