import { apiClient } from "./client";

export interface UserProfileData {
  id: number;
  username: string;
  fullName: string;
  role: string;
  profilePictureUrl?: string | null;
  active: boolean;
  createdAt: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  profilePictureUrl?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export async function fetchUserProfile(): Promise<UserProfileData> {
  const { data } = await apiClient.get<UserProfileData>("/api/profile");
  return data;
}

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<UserProfileData> {
  const { data } = await apiClient.put<UserProfileData>("/api/profile", payload);
  return data;
}

export async function changeUserPassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>("/api/profile/change-password", payload);
  return data;
}

export async function uploadProfileAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const response = await fetch(`${baseUrl}/api/file/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to upload profile picture");
  }

  const s3FileName = await response.text();
  // Return the previewable URL path
  return `/api/documents/file/${s3FileName.trim()}`;
}
