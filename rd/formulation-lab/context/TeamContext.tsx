import { useQuery } from "convex/react";
import type React from "react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@flavoneer/backend/api";
import type { Id } from "@flavoneer/backend/data-model";
import { authClient } from "../lib/auth-client";

interface TeamContextType {
  /** Currently active team ID (null = no team selected) */
  activeTeamId: Id<"teams"> | null;
  /** Current user's role in the active team */
  currentRole: string | null;
  /** Set the active team */
  setActiveTeamId: (id: Id<"teams"> | null) => void;
  /** All teams the current user belongs to */
  teams: {
    _id: Id<"teams">;
    autoVersioning?: boolean;
    authOrganizationId?: string;
    name: string;
    role: string;
  }[];
  /** Whether teams are still loading */
  teamsLoading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const STORAGE_KEY = "food-rd-lab-active-team";

export const TeamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const userTeamsQuery = useQuery(api.teams.list);
  const userTeams = userTeamsQuery ?? [];
  const teamsLoading = userTeamsQuery === undefined;

  const [activeTeamId, setActiveTeamIdState] = useState<Id<"teams"> | null>(
    () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (stored as Id<"teams">) : null;
    }
  );

  // Persist to localStorage
  const setActiveTeamId = (id: Id<"teams"> | null) => {
    setActiveTeamIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Auto-select first team if none selected and teams are available
  useEffect(() => {
    if (teamsLoading) {
      return;
    }

    if (userTeams.length === 0) {
      if (activeTeamId) {
        setActiveTeamId(null);
      }
      return;
    }

    if (!activeTeamId && userTeams.length > 0) {
      setActiveTeamId(userTeams[0]._id);
    }
    // If the active team was deleted / user was removed, reset
    if (
      activeTeamId &&
      userTeams.length > 0 &&
      !userTeams.find((t) => t._id === activeTeamId)
    ) {
      setActiveTeamId(userTeams[0]._id);
    }
  }, [userTeams, activeTeamId, teamsLoading]);

  const activeTeam = userTeams.find((team) => team._id === activeTeamId);
  useEffect(() => {
    if (activeTeam?.authOrganizationId) {
      authClient.organization.setActive({
        organizationId: activeTeam.authOrganizationId,
      }).catch(console.error);
    }
  }, [activeTeam?.authOrganizationId]);

  // Derive current role
  const currentRole = activeTeam?.role ?? null;

  return (
    <TeamContext.Provider
      value={{
        teams: userTeams,
        activeTeamId,
        setActiveTeamId,
        currentRole,
        teamsLoading,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
};
