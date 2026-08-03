export interface TurnOwner {
  name: string;
  days: number;
}

export interface TurnStatus {
  isMyTurn: boolean;
  ownerName: string;
  turnEndTime: Date;
  hoursRemaining: number;
  daysRemaining: number;
  endsToday: boolean;
  endingSoon: boolean; // within 4 hours
}

export function calculateCurrentTurn(
  startDate: string,
  startOwner: string,
  startOwnerDays: number,
  partners: Array<{ name: string; days: number }>
): TurnStatus | null {
  if (!startDate || !startOwner) return null;

  // Build participants list
  const participants: TurnOwner[] = [{ name: startOwner, days: startOwnerDays }, ...partners];

  if (participants.length === 0) return null;

  // Turn STARTS at 6 PM on start date
  const firstTurnStart = new Date(startDate);
  firstTurnStart.setHours(18, 0, 0, 0);

  const now = new Date();

  // If before first turn start - first person hasn't started yet
  if (now < firstTurnStart) {
    const hoursUntilStart = Math.ceil((firstTurnStart.getTime() - now.getTime()) / (1000 * 60 * 60));
    return {
      isMyTurn: startOwner === "me",
      ownerName: startOwner,
      turnEndTime: new Date(firstTurnStart.getTime() + participants[0].days * 24 * 60 * 60 * 1000),
      hoursRemaining: hoursUntilStart + participants[0].days * 24,
      daysRemaining: participants[0].days,
      endsToday: false,
      endingSoon: false,
    };
  }

  // Walk through turns to find current
  let currentStart = new Date(firstTurnStart);
  let participantIndex = 0;
  let iterations = 0;

  while (iterations < 365) {
    const participant = participants[participantIndex % participants.length];

    // Turn ends at 6 PM after N days (turnEnd is already at 18:00 since currentStart is at 18:00)
    const turnEnd = new Date(currentStart);
    turnEnd.setDate(turnEnd.getDate() + participant.days);

    if (now < turnEnd) {
      // Found current turn!
      const msRemaining = turnEnd.getTime() - now.getTime();
      const hoursRemaining = msRemaining / (1000 * 60 * 60);
      const daysRemaining = Math.floor(hoursRemaining / 24);

      const endsToday = turnEnd.toDateString() === now.toDateString();

      // Ending within 4 hours
      const endingSoon = hoursRemaining <= 4;

      return {
        isMyTurn: participant.name === "me",
        ownerName: participant.name,
        turnEndTime: turnEnd,
        hoursRemaining,
        daysRemaining,
        endsToday,
        endingSoon,
      };
    }

    // Move to next turn
    currentStart = new Date(turnEnd);
    participantIndex++;
    iterations++;
  }

  return null;
}

// Helper: format remaining time
export function formatTurnRemaining(status: TurnStatus, language: string): string {
  const L = (en: string, ta: string) => (language === "ta" ? ta : en);

  if (status.endingSoon) {
    const hours = Math.ceil(status.hoursRemaining);
    return L(`Ends in ${hours} hour${hours > 1 ? "s" : ""}`, `${hours} மணியில் முடியும்`);
  }

  if (status.endsToday) {
    return L("Ends today at 6 PM", "இன்று மாலை 6 மணிக்கு முடியும்");
  }

  if (status.daysRemaining === 0) {
    const hours = Math.ceil(status.hoursRemaining);
    return L(`${hours} hour${hours > 1 ? "s" : ""} left`, `${hours} மணி நேரம் மட்டுமே`);
  }

  return L(
    `${status.daysRemaining} day${status.daysRemaining > 1 ? "s" : ""} remaining`,
    `${status.daysRemaining} நாள் உள்ளது`
  );
}

// Helper: get next turn info
export function getNextTurnInfo(
  startDate: string,
  startOwner: string,
  startOwnerDays: number,
  partners: Array<{ name: string; days: number }>
): {
  nextOwner: string;
  hoursUntilMyTurn: number;
  daysUntilMyTurn: number;
} | null {
  if (!startDate || !startOwner) return null;

  const participants: TurnOwner[] = [{ name: startOwner, days: startOwnerDays }, ...partners];

  const firstTurnStart = new Date(startDate);
  firstTurnStart.setHours(18, 0, 0, 0);

  const now = new Date();
  let currentStart = new Date(firstTurnStart);
  let participantIndex = 0;
  let iterations = 0;
  let foundCurrent = false;

  while (iterations < 365) {
    const participant = participants[participantIndex % participants.length];

    const turnEnd = new Date(currentStart);
    turnEnd.setDate(turnEnd.getDate() + participant.days);

    if (!foundCurrent && now < turnEnd) {
      // This is current turn
      foundCurrent = true;
      // Get next turn
      const nextIndex = (participantIndex + 1) % participants.length;
      const nextParticipant = participants[nextIndex];

      const msUntilMyTurn = turnEnd.getTime() - now.getTime();
      const hoursUntilMyTurn = msUntilMyTurn / (1000 * 60 * 60);

      return {
        nextOwner: nextParticipant.name,
        hoursUntilMyTurn,
        daysUntilMyTurn: Math.ceil(hoursUntilMyTurn / 24),
      };
    }

    currentStart = new Date(turnEnd);
    participantIndex++;
    iterations++;
  }

  return null;
}
