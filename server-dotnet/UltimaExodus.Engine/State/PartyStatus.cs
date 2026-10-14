using System.Collections.Generic;

namespace UltimaExodus.Engine.State;

public record PartyMemberStatus(
    int Slot,
    string Name,
    string Condition,
    string Type,
    int Magic,
    int Level,
    int Hits,
    int Food
);

public record PartyStatus(
    List<PartyMemberStatus> Members
);
