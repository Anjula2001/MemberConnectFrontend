import { apiClient } from "./client";

export interface AdminUserItem {
  id: number;
  username: string;
  fullName: string;
  role: string;
  profilePictureUrl?: string | null;
  assignedDistrict?: string | null;
  active: boolean;
  createdAt: string;
}

export interface CreateAdminUserPayload {
  username: string;
  password: string;
  fullName: string;
  role: string;
  assignedDistrict?: string | null;
}

export interface UpdateAdminUserPayload {
  fullName?: string;
  role?: string;
  assignedDistrict?: string | null;
  isActive?: boolean;
}

export async function fetchAdminUsers(): Promise<AdminUserItem[]> {
  const { data } = await apiClient.get<AdminUserItem[]>("/api/admin/users");
  return data;
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUserItem> {
  const { data } = await apiClient.post<AdminUserItem>("/api/admin/users", payload);
  return data;
}

export async function updateAdminUser(
  id: number,
  payload: UpdateAdminUserPayload
): Promise<AdminUserItem> {
  const { data } = await apiClient.put<AdminUserItem>(`/api/admin/users/${id}`, payload);
  return data;
}

export async function resetAdminUserPassword(
  id: number,
  newPassword: string
): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>(
    `/api/admin/users/${id}/reset-password`,
    { newPassword }
  );
  return data;
}

export async function toggleAdminUserStatus(id: number): Promise<AdminUserItem> {
  const { data } = await apiClient.patch<AdminUserItem>(
    `/api/admin/users/${id}/toggle-status`
  );
  return data;
}
