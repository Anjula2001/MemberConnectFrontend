import { apiClient } from "@/lib/api/client";

export interface BoardMeetingDTO {
  id?: number;
  boardMeetingId?: string;
  scheduledDate: string;
  actualDate?: string;
}

const BASE_PATH = "/api/board-meetings";

export async function createBoardMeeting(payload: Partial<BoardMeetingDTO>) {
  const { data } = await apiClient.post<BoardMeetingDTO>(
    `${BASE_PATH}/createBoardMeeting`,
    payload
  );
  return data;
}

export async function getBoardMeetings() {
  const { data } = await apiClient.get<BoardMeetingDTO[]>(`${BASE_PATH}/getAllBoardMeetings`);
  return data;
}

export async function getBoardMeetingById(id: number) {
  const { data } = await apiClient.get<BoardMeetingDTO>(`${BASE_PATH}/${id}`);
  return data;
}

export async function getBoardMeetingByBoardMeetingId(boardMeetingId: string) {
  const { data } = await apiClient.get<BoardMeetingDTO>(
    `${BASE_PATH}/getBoardMeetingByBoardMeetingId/${encodeURIComponent(boardMeetingId)}`
  );
  return data;
}

export async function updateBoardMeeting(
  id: number,
  payload: Partial<BoardMeetingDTO>
) {
  const { data } = await apiClient.put<BoardMeetingDTO>(
    `${BASE_PATH}/updateBoardMeeting/${id}`,
    payload
  );
  return data;
}

export async function deleteBoardMeeting(id: number) {
  const { data } = await apiClient.delete<string>(
    `${BASE_PATH}/deleteBoardMeeting/${id}`
  );
  return data;
} 