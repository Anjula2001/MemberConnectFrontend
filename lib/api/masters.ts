import { apiClient } from "@/lib/api/client";

const BASE_PATH = "/api/masters";

/**
 * One row of a simple master list. `usesZone` is only meaningful for working
 * location types: it says whether a location of that type sits inside an
 * educational zone (a Government School does, the Ministry of Education does not).
 */
export interface MasterOption {
  id: number;
  name: string;
  usesZone?: boolean;
}

/**
 * The real Working Location Type master.
 *
 * Screens used to hard-code "School / Office / University", none of which are
 * values this master holds — the server compares the filter to the stored name, so
 * every one of them matched nothing.
 */
export async function getWorkingLocationTypes() {
  const { data } = await apiClient.get<MasterOption[]>(`${BASE_PATH}/working-location-types`);
  return data;
}
