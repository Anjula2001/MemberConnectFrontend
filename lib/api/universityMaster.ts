import { apiClient } from "@/lib/api/client";

const BASE_PATH = "/api/admin/university-master";

/**
 * One row of University Scholarship master data.
 *
 * A single shape for all three lists, mirroring UniversityMasterDto on the backend:
 * universities and programmes use `id` + `name`, pairings use the university/programme
 * ids plus duration and scholarship amount.
 */
export interface UniversityMasterDTO {
  id?: number;
  name?: string;
  universityId?: number;
  universityName?: string;
  programId?: number;
  programName?: string;
  duration?: number;
  scholarshipAmount?: number;
}

// ---- Universities ---------------------------------------------------------

export async function getUniversities() {
  const { data } = await apiClient.get<UniversityMasterDTO[]>(`${BASE_PATH}/universities`);
  return data;
}

export async function createUniversity(payload: UniversityMasterDTO) {
  const { data } = await apiClient.post<UniversityMasterDTO>(`${BASE_PATH}/universities`, payload);
  return data;
}

export async function updateUniversity(id: number, payload: UniversityMasterDTO) {
  const { data } = await apiClient.put<UniversityMasterDTO>(
    `${BASE_PATH}/universities/${id}`,
    payload
  );
  return data;
}

// ---- Programmes -----------------------------------------------------------

export async function getPrograms() {
  const { data } = await apiClient.get<UniversityMasterDTO[]>(`${BASE_PATH}/programs`);
  return data;
}

export async function createProgram(payload: UniversityMasterDTO) {
  const { data } = await apiClient.post<UniversityMasterDTO>(`${BASE_PATH}/programs`, payload);
  return data;
}

export async function updateProgram(id: number, payload: UniversityMasterDTO) {
  const { data } = await apiClient.put<UniversityMasterDTO>(`${BASE_PATH}/programs/${id}`, payload);
  return data;
}

// ---- University / Programme pairings --------------------------------------

export async function getUniversityPrograms() {
  const { data } = await apiClient.get<UniversityMasterDTO[]>(`${BASE_PATH}/university-programs`);
  return data;
}

export async function createUniversityProgram(payload: UniversityMasterDTO) {
  const { data } = await apiClient.post<UniversityMasterDTO>(
    `${BASE_PATH}/university-programs`,
    payload
  );
  return data;
}

export async function updateUniversityProgram(id: number, payload: UniversityMasterDTO) {
  const { data } = await apiClient.put<UniversityMasterDTO>(
    `${BASE_PATH}/university-programs/${id}`,
    payload
  );
  return data;
}
