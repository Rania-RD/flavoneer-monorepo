import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { useQuery } from "convex/react";
import type React from "react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { authClient } from "../lib/auth-client";

interface OrganizationContextType {
  /** Currently active organization ID (null = no organization selected) */
  activeOrganizationId: Id<"organizations"> | null;
  /** Current user's role in the active organization */
  currentRole: string | null;
  /** All organizations the current user belongs to */
  organizations: {
    _id: Id<"organizations">;
    autoVersioning?: boolean;
    authOrganizationId?: string;
    avatarUrl?: string;
    name: string;
    role: string;
  }[];
  /** Whether organizations are still loading */
  organizationsLoading: boolean;
  /** Set the active organization */
  setActiveOrganizationId: (id: Id<"organizations"> | null) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

const STORAGE_KEY = "food-rd-lab-active-organization";

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { data: authSession } = authClient.useSession();
  const userOrganizationsQuery = useQuery(api.organizations.list);
  const userOrganizations = userOrganizationsQuery ?? [];
  const organizationsLoading = userOrganizationsQuery === undefined;

  const [activeOrganizationId, setActiveOrganizationIdState] =
    useState<Id<"organizations"> | null>(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (stored as Id<"organizations">) : null;
    });

  // Persist to localStorage
  const setActiveOrganizationId = (id: Id<"organizations"> | null) => {
    setActiveOrganizationIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Auto-select first organization if none selected and organizations are available
  useEffect(() => {
    if (organizationsLoading) {
      return;
    }

    if (userOrganizations.length === 0) {
      if (activeOrganizationId) {
        setActiveOrganizationId(null);
      }
      return;
    }

    if (!activeOrganizationId && userOrganizations.length > 0) {
      setActiveOrganizationId(userOrganizations[0]._id);
    }
    // If the active organization was deleted / user was removed, reset
    if (
      activeOrganizationId &&
      userOrganizations.length > 0 &&
      !userOrganizations.find((t) => t._id === activeOrganizationId)
    ) {
      setActiveOrganizationId(userOrganizations[0]._id);
    }
  }, [userOrganizations, activeOrganizationId, organizationsLoading]);

  const activeOrganization = userOrganizations.find(
    (organization) => organization._id === activeOrganizationId
  );
  useEffect(() => {
    if (
      activeOrganization?.authOrganizationId &&
      activeOrganization.authOrganizationId !==
        authSession?.session.activeOrganizationId
    ) {
      authClient.organization
        .setActive({
          organizationId: activeOrganization.authOrganizationId,
        })
        .catch(console.error);
    }
  }, [
    activeOrganization?.authOrganizationId,
    authSession?.session.activeOrganizationId,
  ]);

  // Derive current role
  const currentRole = activeOrganization?.role ?? null;

  return (
    <OrganizationContext.Provider
      value={{
        organizations: userOrganizations,
        activeOrganizationId,
        setActiveOrganizationId,
        currentRole,
        organizationsLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
};
