#!/usr/bin/env python3
"""Measure the full running Pi stack, sequentially, without setting a latency target."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import platform
import subprocess
import threading
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
COMPOSE = ["docker", "compose", "--project-directory", str(ROOT), "-f", str(ROOT / "compose.yaml")]
PROMPTS = [
    "Create a projectile experiment with launch speed and launch angle controls and a trajectory view.",
    "Create a pendulum experiment with a length control and a graph of its motion.",
    "Create an experiment comparing ideal gases at different temperatures with pressure readouts.",
]


def command(args, timeout=20):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "Command failed")
    return result.stdout


def sample_host():
    result = {"time": datetime.now(timezone.utc).isoformat()}
    for name, path in [("meminfo", "/proc/meminfo"), ("vmstat", "/proc/vmstat"), ("temperature", "/sys/class/thermal/thermal_zone0/temp")]:
        file = Path(path)
        if file.exists():
            result[name] = file.read_text()
    try:
        result["throttling"] = command(["vcgencmd", "get_throttled"])
    except (OSError, RuntimeError, subprocess.TimeoutExpired):
        result["throttling"] = "unavailable"
    return result


def internal_fetch(path):
    # Services stay private; make read-only requests from inside the web container.
    script = "fetch(process.argv[1]).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);process.stdout.write(await r.text())}).catch(e=>{console.error(e.message);process.exit(1)})"
    return command(COMPOSE + ["exec", "-T", "web", "node", "-e", script, path])


def generate(base, prompt, request_id, timeout):
    body = {"protocolVersion": 1, "requestId": request_id, "prompt": prompt,
            "destination": "builder", "viewport": {"width": 390, "height": 844}, "active": None}
    request = urllib.request.Request(base + "/api/apertus", data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json", "Accept": "application/x-ndjson"})
    started = time.monotonic()
    record = {"prompt": prompt, "requestId": request_id, "progress": []}
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            record["httpStatus"] = response.status
            if "application/x-ndjson" in response.headers.get("Content-Type", ""):
                for line in response:
                    if not line.strip():
                        continue
                    event = json.loads(line)
                    record["progress"].append({"elapsedMs": round((time.monotonic() - started) * 1000), "event": event})
                    if event.get("type") == "result":
                        record["result"] = event.get("result")
            else:
                record["result"] = json.load(response)
    except urllib.error.HTTPError as error:
        record["httpStatus"] = error.code
        record["error"] = error.read(128000).decode(errors="replace")
    except (OSError, ValueError) as error:
        record["error"] = str(error)
    record["elapsedMs"] = round((time.monotonic() - started) * 1000)
    result = record.get("result") or {}
    record["success"] = result.get("requestId") == request_id and result.get("status") in {"created", "updated"} and isinstance(result.get("recipe"), dict)
    # Server validates generated recipes. Browser acceptance is a separate manual/live-browser check.
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--base-url", default="http://127.0.0.1:43100")
    parser.add_argument("--timeout", type=int, default=660)
    args = parser.parse_args()
    if not 1 <= args.runs <= 10:
        parser.error("--runs must be from 1 to 10")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output = ROOT / "results" / stamp
    output.mkdir(parents=True, exist_ok=False)
    report = {"startedAt": stamp, "platform": platform.platform(), "architecture": platform.machine(),
              "configuration": command(COMPOSE + ["config"]), "services": command(COMPOSE + ["ps", "--format", "json"]),
              "hostBefore": sample_host(), "runs": [], "latencyTarget": None}
    # Include the optional decision sidecar only when it is running.
    laya_enabled = bool(command(COMPOSE + ["ps", "-q", "laya"]).strip())
    report["layaEnabled"] = laya_enabled
    for service in ["web", "apertus"] + (["laya"] if laya_enabled else []):
        container = command(COMPOSE + ["ps", "-q", service]).strip()
        if not container or command(["docker", "inspect", "--format", "{{.State.Health.Status}}", container]).strip() != "healthy":
            raise RuntimeError(f"Full-stack benchmark requires healthy {service}")
    with urllib.request.urlopen(args.base_url.rstrip("/") + "/api/health", timeout=10) as response:
        if not json.load(response).get("offline"):
            raise RuntimeError("Benchmark requires OFFLINE=true")
    report["layaStartup"] = json.loads(internal_fetch("http://laya:43102/api/status")) if laya_enabled else None
    (output / "llama-metrics-before.txt").write_text(internal_fetch("http://apertus:43101/metrics"))
    stop = threading.Event()

    def collect():
        with (output / "telemetry.jsonl").open("w") as log:
            while not stop.is_set():
                sample = sample_host()
                try:
                    ids = command(COMPOSE + ["ps", "-q"]).split()
                    sample["containers"] = command(["docker", "stats", "--no-stream", "--format", "{{json .}}"] + ids)
                except (OSError, RuntimeError, subprocess.TimeoutExpired) as error:
                    sample["error"] = str(error)
                log.write(json.dumps(sample) + "\n")
                log.flush()
                stop.wait(5)

    worker = threading.Thread(target=collect, daemon=True)
    worker.start()
    try:
        for run in range(args.runs):
            for index, prompt in enumerate(PROMPTS):
                print(f"Full-stack generation {run + 1}/{args.runs}, case {index + 1}", flush=True)
                record = generate(args.base_url.rstrip("/"), prompt, f"pi-{stamp}-{run}-{index}", args.timeout)
                report["runs"].append(record)
                (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    finally:
        stop.set()
        worker.join(timeout=25)
        report["hostAfter"] = sample_host()
        report["successfulRequests"] = sum(record["success"] for record in report["runs"])
        report["totalRequests"] = len(report["runs"])
        ids = command(COMPOSE + ["ps", "-aq"]).split()
        report["containerState"] = command(["docker", "inspect", "--format", "{{.Name}} {{json .State}} {{.Image}}", *ids])
        (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
        try:
            (output / "llama-metrics-after.txt").write_text(internal_fetch("http://apertus:43101/metrics"))
        except RuntimeError as error:
            (output / "metrics-error.txt").write_text(str(error))
    print(f"Saved {output}; {report['successfulRequests']}/{report['totalRequests']} successful generations.")
    if report["successfulRequests"] != report["totalRequests"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
