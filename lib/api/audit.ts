import { apiClient } from "@/lib/api/client";

const BASE_PATH = "/api/audit";

/** One entry in the Progress/history trail. */
export interface AuditDTO {
  id?: number;
  moduleName?: "MEMBER_APPLICATION" | "MEMBER";
  referenceId?: number;
  actionName?: string;
  oldValue?: string | null;
  newValue?: string | null;
  remarks?: string | null;
  /** Display name of whoever triggered the action. */
  actionBy?: string;
  actionAt?: string;
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
