import "server-only";

import { AuthConfigurationError } from "@/src/features/auth/config";
import type { TutorFlowUser } from "@/src/features/auth/types";

export interface UserDirectory {
  findByGoogleSubject(googleSubject: string): Promise<TutorFlowUser | null>;
}

const denyAllUserDirectory: UserDirectory = {
  async findByGoogleSubject() {
    return null;
  },
};

function getDevelopmentUserDirectory(): UserDirectory {
  const googleSubject = process.env.TUTOR_FLOW_DEV_USER_GOOGLE_SUB?.trim();
  if (!googleSubject) return denyAllUserDirectory;

  const userId = process.env.TUTOR_FLOW_DEV_USER_ID?.trim();
  const email = process.env.TUTOR_FLOW_DEV_USER_EMAIL?.trim();
  const name = process.env.TUTOR_FLOW_DEV_USER_NAME?.trim();
  const status = process.env.TUTOR_FLOW_DEV_USER_STATUS?.trim() || "ACTIVE";
  if (
    !userId
    || !email
    || !name
    || (status !== "ACTIVE" && status !== "SUSPENDED" && status !== "DISABLED")
  ) {
    throw new AuthConfigurationError();
  }

  const timestamp = new Date().toISOString();
  const user: TutorFlowUser = {
    userId,
    googleSubject,
    email,
    name,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    async findByGoogleSubject(subject) {
      return subject === user.googleSubject ? user : null;
    },
  };
}

function getProductionUserDirectory(): UserDirectory {
  const configuredUsers = process.env.TUTOR_FLOW_PROVISIONED_USERS_JSON?.trim();
  if (!configuredUsers) throw new AuthConfigurationError();

  let parsedUsers: unknown;
  try {
    parsedUsers = JSON.parse(configuredUsers);
  } catch {
    throw new AuthConfigurationError();
  }
  if (!Array.isArray(parsedUsers)) throw new AuthConfigurationError();

  const timestamp = new Date().toISOString();
  const users = parsedUsers.map((value): TutorFlowUser => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new AuthConfigurationError();
    }

    const record = value as Record<string, unknown>;
    const userId = typeof record.userId === "string" ? record.userId.trim() : "";
    const googleSubject = typeof record.googleSubject === "string" ? record.googleSubject.trim() : "";
    const email = typeof record.email === "string" ? record.email.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const status = record.status === undefined
      ? "ACTIVE"
      : typeof record.status === "string"
        ? record.status.trim()
        : "";

    if (
      !userId
      || !googleSubject
      || !email
      || !name
      || (status !== "ACTIVE" && status !== "SUSPENDED" && status !== "DISABLED")
    ) {
      throw new AuthConfigurationError();
    }

    return {
      userId,
      googleSubject,
      email,
      name,
      status,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  const subjects = new Set<string>();
  for (const user of users) {
    if (subjects.has(user.googleSubject)) throw new AuthConfigurationError();
    subjects.add(user.googleSubject);
  }

  return {
    async findByGoogleSubject(subject) {
      return users.find((user) => user.googleSubject === subject) ?? null;
    },
  };
}

export function getUserDirectory(): UserDirectory {
  return process.env.NODE_ENV === "development"
    ? getDevelopmentUserDirectory()
    : getProductionUserDirectory();
}

export async function findProvisionedUserByGoogleSubject(googleSubject: string) {
  if (!googleSubject.trim()) return null;
  return getUserDirectory().findByGoogleSubject(googleSubject);
}
