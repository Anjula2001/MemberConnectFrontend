"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Trash2 } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";

type BoardMeeting = {
  id: number;
  date: string;
};

function formatDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}-${month}-${day}`;
}

export default function BoardApprovalsPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const [createdMeetings, setCreatedMeetings] = useState<BoardMeeting[]>([]);

  const nextMeetingId = useMemo(() => {
    if (createdMeetings.length === 0) return 108;
    return Math.max(...createdMeetings.map((meeting) => meeting.id)) + 1;
  }, [createdMeetings]);

  const handleAddMeeting = () => {
    if (!selectedDate) return;

    const isDuplicateDate = createdMeetings.some(
      (meeting) => meeting.date === selectedDate
    );
    if (isDuplicateDate) return;

    setCreatedMeetings((prev) => [
      { id: nextMeetingId, date: selectedDate },
      ...prev,
    ]);
    setSelectedDate("");
  };

  const handleDeleteMeeting = (id: number) => {
    setCreatedMeetings((prev) => prev.filter((meeting) => meeting.id !== id));
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-3xl font-bold text-[#953002]">Board Administration</h1>

      <div className="inline-flex w-fit rounded-md border bg-muted p-1">
        <Button
          type="button"
          variant="secondary"
          className="h-8 rounded-sm bg-white px-3 text-xs text-foreground shadow-sm"
        >
          Board Meetings
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-8 rounded-sm px-3 text-xs text-muted-foreground hover:bg-transparent"
          disabled
        >
          Board Approval Lists
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-xl py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-4 font-bold text-[#953002]">
              Create Board Meeting
            </CardTitle>
            <p className="text-sm text-muted-foreground">Schedule new meetings</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddMeeting}
                disabled={!selectedDate}
                className="bg-[#953002] text-white hover:bg-[#7a2700]"
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl py-0 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-4 font-bold text-[#953002]">
              Board Meetings Created
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {createdMeetings.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                No meetings added yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {createdMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded bg-[#f7ede8] p-1.5 text-[#953002]">
                        <CalendarDays size={14} />
                      </div>
                      <div className="leading-tight">
                        <p className="font-semibold text-foreground">{meeting.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDisplayDate(meeting.date)}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      aria-label={`Delete meeting ${meeting.id}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
