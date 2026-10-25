namespace UltimaExodus.Engine.State;

public class ActionLog
{
    private const int MaxEntries = 50;

    private readonly List<LogEntry> _entries = [];
    private readonly object _gate = new();

    public void Add(string text)
    {
        lock (_gate)
        {
            _entries.Add(new LogEntry(text));
            if (_entries.Count > MaxEntries)
            {
                _entries.RemoveAt(0);
            }
        }
    }

    public List<LogEntry> GetAll()
    {
        lock (_gate)
        {
            return [.. _entries];
        }
    }
}