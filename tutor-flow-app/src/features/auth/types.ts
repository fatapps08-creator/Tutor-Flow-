export type UserStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";

export type TutorFlowUser = {
  userId: string;
  googleSubject: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type CurrentUser =
  | {
      userId: string;
      googleSubject: string;
      email: string;
      name: string;
      status: UserStatus;
      authMethod: "supabase";
    }
  | {
      userId: "dev:tutor-demo";
      googleSubject: null;
      email: null;
      name: "Development Tutor";
      status: "ACTIVE";
      authMethod: "development";
    };
