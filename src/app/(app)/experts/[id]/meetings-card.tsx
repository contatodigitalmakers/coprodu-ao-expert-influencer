import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { getExpertMeetings } from "@/lib/meetings/queries";
import { scheduleMeetingAction } from "../../agenda/actions";
import { MeetingBadge } from "../../agenda/_components/meeting-badge";
import { MeetingForm } from "../../agenda/_components/meeting-form";

type Meetings = Awaited<ReturnType<typeof getExpertMeetings>>;

// Reuniões de diagnóstico do lead e agendamento de uma nova.
export function MeetingsCard({
  expertId,
  meetings,
  users,
  currentUserId,
  today,
}: {
  expertId: string;
  meetings: Meetings;
  users: { id: string; name: string }[];
  currentUserId: string;
  today: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {meetings.length > 0 && (
          <ul className="flex flex-col gap-1.5" aria-label="Reuniões do lead">
            {meetings.map((meeting) => (
              <li key={meeting.id} className="flex items-center justify-between gap-2">
                <Link href={`/agenda/${meeting.id}`} className="hover:underline">
                  {formatDateTime(meeting.scheduledAt)} · {meeting.closerName}
                </Link>
                <MeetingBadge status={meeting.status} />
              </li>
            ))}
          </ul>
        )}
        <details open={meetings.length === 0}>
          <summary className="cursor-pointer font-medium">Agendar diagnóstico</summary>
          <div className="pt-3">
            <MeetingForm
              action={scheduleMeetingAction.bind(null, expertId)}
              users={users}
              defaults={{ date: today, time: "10:00", link: "", closerId: currentUserId }}
              submitLabel="Agendar diagnóstico"
            />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
