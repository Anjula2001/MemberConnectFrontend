import { apiClient } from "@/lib/api/client";

const BASE_PATH = "/api/education";

export async function getEducationalDistricts() {
  const { data } = await apiClient.get<string[]>(`${BASE_PATH}/districts`);
  return data;
}

export async function getEducationalZonesByDistrict(district: string) {
  const { data } = await apiClient.get<string[]>(`${BASE_PATH}/zones`, {
    params: { district },
  });
  return data;
}
