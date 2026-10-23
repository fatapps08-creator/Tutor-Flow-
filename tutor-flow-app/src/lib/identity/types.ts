export type TutorIdentity = {
  tutorId: string;
  email?: string;
  displayName?: string;
};

export interface TutorIdentityProvider {
  getCurrentTutor(): Promise<TutorIdentity | null>;
}
