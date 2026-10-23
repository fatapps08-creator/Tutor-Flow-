import "server-only";

import type { TutorIdentity, TutorIdentityProvider } from "./types";

export class DevelopmentTutorIdentityProvider implements TutorIdentityProvider {
  async getCurrentTutor(): Promise<TutorIdentity | null> {
    const tutorId = process.env.TUTOR_FLOW_DEV_TUTOR_ID?.trim();
    if (!tutorId) return null;

    return {
      tutorId,
      email: process.env.TUTOR_FLOW_DEV_TUTOR_EMAIL?.trim() || undefined,
      displayName: process.env.TUTOR_FLOW_DEV_TUTOR_NAME?.trim() || undefined,
    };
  }
}
