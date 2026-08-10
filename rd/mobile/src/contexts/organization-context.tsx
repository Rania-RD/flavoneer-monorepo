import type { Id } from '@flavoneer/backend/data-model';
import { useQuery } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, authClient } from '@/lib/backend';

type Organization = {
  _id: Id<'organizations'>;
  authOrganizationId?: string;
  name: string;
};

type OrganizationContextValue = {
  activeOrganizationId: Id<'organizations'> | null;
  organizations: Organization[];
  organizationsLoading: boolean;
  setActiveOrganizationId: (organizationId: Id<'organizations'>) => void;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);
const ACTIVE_ORGANIZATION_STORAGE_KEY = 'flavoneer.active-organization-id';

export function OrganizationProvider({
  children,
  enabled,
}: PropsWithChildren<{ enabled: boolean }>) {
  const organizationsQuery = useQuery(api.organizations.list, enabled ? {} : 'skip');
  const organizations = useMemo(() => organizationsQuery ?? [], [organizationsQuery]);
  const organizationsLoading = enabled && organizationsQuery === undefined;
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<Id<'organizations'> | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    SecureStore.getItemAsync(ACTIVE_ORGANIZATION_STORAGE_KEY)
      .then((storedOrganizationId) => {
        if (!(cancelled || !storedOrganizationId)) {
          setSelectedOrganizationId(storedOrganizationId as Id<'organizations'>);
        }
      })
      .catch((error) => {
        console.error('Could not restore the active organization:', error);
      })
      .finally(() => {
        if (!cancelled) {
          setStorageReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persistOrganizationId = useCallback((organizationId: Id<'organizations'>) => {
    SecureStore.setItemAsync(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId).catch((error) => {
      console.error('Could not save the active organization:', error);
    });
  }, []);

  const setActiveOrganizationId = useCallback(
    (organizationId: Id<'organizations'>) => {
      if (!organizations.some((organization) => organization._id === organizationId)) {
        return;
      }
      setSelectedOrganizationId(organizationId);
      persistOrganizationId(organizationId);
    },
    [organizations, persistOrganizationId],
  );

  const activeOrganizationId = storageReady
    ? (organizations.find((organization) => organization._id === selectedOrganizationId)?._id ??
      organizations[0]?._id ??
      null)
    : null;
  const activeOrganization = organizations.find(
    (organization) => organization._id === activeOrganizationId,
  );

  useEffect(() => {
    if (!(enabled && storageReady && !organizationsLoading)) {
      return;
    }

    if (activeOrganizationId) {
      persistOrganizationId(activeOrganizationId);
      return;
    }

    SecureStore.deleteItemAsync(ACTIVE_ORGANIZATION_STORAGE_KEY).catch((error) => {
      console.error('Could not clear the active organization:', error);
    });
  }, [activeOrganizationId, enabled, organizationsLoading, persistOrganizationId, storageReady]);

  useEffect(() => {
    if (!activeOrganization?.authOrganizationId) {
      return;
    }

    authClient.organization
      .setActive({ organizationId: activeOrganization.authOrganizationId })
      .catch((error) => {
        console.error('Could not activate the selected organization:', error);
      });
  }, [activeOrganization?.authOrganizationId]);

  const value = useMemo(
    () => ({ activeOrganizationId, organizations, organizationsLoading, setActiveOrganizationId }),
    [activeOrganizationId, organizations, organizationsLoading, setActiveOrganizationId],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
