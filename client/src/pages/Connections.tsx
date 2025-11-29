import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = {
  name: string;
  version?: string;
  chittyConnect?: { configured: boolean };
};

export default function Connections() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [since, setSince] = useState<string>("");
  const [replayMsg, setReplayMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/status");
        const data = await res.json();
        setStatus(data);
        const er = await fetch("/api/integrations/events?source=mercury&limit=10");
        const ed = await er.json();
        setEvents(ed.items || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load status");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function replay() {
    setReplayMsg(null);
    try {
      const qs = new URLSearchParams({ source: 'mercury', limit: '50', ...(since ? { since } : {}) }).toString();
      const res = await fetch(`/api/admin/events/replay?${qs}`, { method: 'POST', headers: { 'content-type': 'application/json' } });
      const data = await res.json();
      setReplayMsg(`Replayed: ${data.succeeded}/${data.attempted} (failed ${data.failed})`);
    } catch (e: any) {
      setReplayMsg(`Replay failed: ${e?.message || e}`);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading…</p>}
          {error && <p className="text-red-600">{error}</p>}
          {status && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Service: {status.name}</div>
              {status.version && <div className="text-sm">Version: {status.version}</div>}
              <div className="text-sm">ChittyConnect: {status.chittyConnect?.configured ? "configured" : "not configured"}</div>
              <div className="pt-4 space-x-3 flex items-center flex-wrap gap-2">
                <a className="underline" href="/connect">Connect Services</a>
                <a className="underline" href="/register">Register a Service</a>
                <label className="text-xs text-muted-foreground">Since:
                  <input type="datetime-local" className="ml-2 border rounded px-1 py-0.5 text-xs bg-background" value={since} onChange={e => setSince(e.target.value)} />
                </label>
                <Button variant="secondary" className="ml-2" onClick={replay}>Replay Last 50</Button>
                {replayMsg && <span className="text-xs text-muted-foreground ml-2">{replayMsg}</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {events.map((e: any) => (
                  <li key={e.id} className="flex justify-between">
                    <span>{e.source}:{e.eventId}</span>
                    <span className="text-muted-foreground">{new Date(e.receivedAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
