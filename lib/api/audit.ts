import { apiClient } from "@/lib/api/client";

const BASE_PATH = "/api/audit";

/** One entry in the Progress/history trail. */
export interface AuditDTO {
  id?: number;
  moduleName?: string;
  referenceId?: number;
  actionName?: string;
  oldValue?: string | null;
  newValue?: string | null;
  remarks?: string | null;
  /** Display name of whoever triggered the action. */
  actionBy?: string;
  actionAt?: string;
}

/**
 * Newest audit entries across every module, for the dashboard's Recent Activity card.
 * The backend clamps `limit` to 1..50.
 */
export async function getRecentActivity(limit = 5) {
  const { data } = await apiClient.get<AuditDTO[]>(`${BASE_PATH}/recent`, {
    params: { limit },
  });
  return data;
}

export async function getApplicationHistory(applicationId: number) {
  const { data } = await apiClient.get<AuditDTO[]>(`${BASE_PATH}/application/${applicationId}`);
  return data;
}

/** Member history, already merged with the originating application's entries. */
export async function getMemberHistory(memberId: number) {
  const { data } = await apiClient.get<AuditDTO[]>(`${BASE_PATH}/member/${memberId}`);
  return data;
}
