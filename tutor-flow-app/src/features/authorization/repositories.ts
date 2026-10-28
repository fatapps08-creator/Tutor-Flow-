import "server-only";

import type {
  TutorFlowUser,
  UserStatus,
} from "@/src/features/auth/types";
import type {
  Center,
  CenterMembership,
  CenterMembershipRole,
  CenterMembershipStatus,
  CenterStatus,
  Entitlement,
} from "@/src/features/authorization/types";
import type { Tutor } from "@/src/types";

export type ProvisionUserInput = Omit<TutorFlowUser, "userId" | "createdAt" | "updatedAt">;
export type CreateCenterInput = Omit<Center, "centerId" | "createdAt" | "updatedAt">;
export type CreateTutorInput = Omit<Tutor, "id" | "createdAt">;
export type CreateCenterMembershipInput = Omit<
  CenterMembership,
  "membershipId" | "createdAt" | "updatedAt"
>;
export type CreateEntitlementInput = Omit<Entitlement, "entitlementId" | "createdAt" | "updatedAt">;

export interface UserRepository {
  findByGoogleSubject(googleSubject: string): Promise<TutorFlowUser | null>;
  getByUserId(userId: string): Promise<TutorFlowUser | null>;
  provisionUser(input: ProvisionUserInput): Promise<TutorFlowUser>;
  updateStatus(userId: string, status: UserStatus): Promise<TutorFlowUser | null>;
}

export interface CenterRepository {
  getByCenterId(centerId: string): Promise<Center | null>;
  createCenter(input: CreateCenterInput): Promise<Center>;
  updateStatus(centerId: string, status: CenterStatus): Promise<Center | null>;
}

export interface TutorRepository {
  getByTutorId(tutorId: string): Promise<Tutor | null>;
  createTutor(input: CreateTutorInput): Promise<Tutor>;
}

export interface CenterMembershipRepository {
  findActiveMembershipsByUserId(userId: string): Promise<CenterMembership[]>;
  getByMembershipId(membershipId: string): Promise<CenterMembership | null>;
  createMembership(input: CreateCenterMembershipInput): Promise<CenterMembership>;
  updateRole(membershipId: string, role: CenterMembershipRole): Promise<CenterMembership | null>;
  updateStatus(
    membershipId: string,
    status: CenterMembershipStatus,
  ): Promise<CenterMembership | null>;
  updateTutorLink(membershipId: string, tutorId: string | null): Promise<CenterMembership | null>;
}

export interface EntitlementRepository {
  getEffectiveEntitlementByCenterId(centerId: string): Promise<Entitlement | null>;
  createEntitlement(input: CreateEntitlementInput): Promise<Entitlement>;
}

export class AuthorizationPersistenceUnavailableError extends Error {
  constructor() {
    super("Authorization persistence is unavailable until the Apps Script adapter is implemented.");
    this.name = "AuthorizationPersistenceUnavailableError";
  }
}

export function createUnavailableAuthorizationRepositories() {
  const unavailable = async (): Promise<never> => {
    throw new AuthorizationPersistenceUnavailableError();
  };

  return {
    users: {
      findByGoogleSubject: unavailable,
      getByUserId: unavailable,
      provisionUser: unavailable,
      updateStatus: unavailable,
    } satisfies UserRepository,
    centers: {
      getByCenterId: unavailable,
      createCenter: unavailable,
      updateStatus: unavailable,
    } satisfies CenterRepository,
    tutors: {
      getByTutorId: unavailable,
      createTutor: unavailable,
    } satisfies TutorRepository,
    memberships: {
      findActiveMembershipsByUserId: unavailable,
      getByMembershipId: unavailable,
      createMembership: unavailable,
      updateRole: unavailable,
      updateStatus: unavailable,
      updateTutorLink: unavailable,
    } satisfies CenterMembershipRepository,
    entitlements: {
      getEffectiveEntitlementByCenterId: unavailable,
      createEntitlement: unavailable,
    } satisfies EntitlementRepository,
  };
}
