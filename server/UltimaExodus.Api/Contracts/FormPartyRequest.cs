namespace UltimaExodus.Api.Contracts;

/// <summary>Four roster entries (1-20), in party order: first = position 1.</summary>
public record FormPartyRequest(IReadOnlyList<int>? Entries);