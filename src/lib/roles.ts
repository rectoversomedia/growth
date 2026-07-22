import type { UserRole } from '@/types/growth/app';

export const ROLE_PERMISSIONS = {
  super_admin: {
    canConfigureApps: true,
    canConfigureApiCredentials: true,
    canTriggerSync: true,
    canViewOverview: true,
    canViewActivationPerformance: true,
    canViewRatingsReviews: true,
    canManageRecommendations: true,
    canViewRawCompetitorData: true,
    canExportReports: true,
    canViewDataSourceHealth: true,
    canViewPersonalOperatorData: true,
  },
  campaign_manager: {
    canConfigureApps: false,
    canConfigureApiCredentials: false,
    canTriggerSync: false,
    canViewOverview: true,
    canViewActivationPerformance: true,
    canViewRatingsReviews: true,
    canManageRecommendations: true,
    canViewRawCompetitorData: false,
    canExportReports: true,
    canViewDataSourceHealth: true,
    canViewPersonalOperatorData: true,
  },
  client_viewer: {
    canConfigureApps: false,
    canConfigureApiCredentials: false,
    canTriggerSync: false,
    canViewOverview: true,
    canViewActivationPerformance: false,
    canViewRatingsReviews: true,
    canManageRecommendations: false,
    canViewRawCompetitorData: false,
    canExportReports: true,
    canViewDataSourceHealth: false,
    canViewPersonalOperatorData: false,
  },
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS.super_admin;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}
