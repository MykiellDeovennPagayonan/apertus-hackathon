#!/usr/bin/env python3
"""Fetch pinned artifacts once; verify hashes and the GGUF template before startup."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import urllib.request

ROOT = Path(__file__).resolve().parent


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def fetch_artifact(model, artifact, target, verify_only):
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and sha256(target) == artifact["sha256"]:
        return
    if verify_only:
        raise RuntimeError(f"Missing or changed artifact: {target}")
    url = f'https://huggingface.co/{model["repo"]}/resolve/{model["revision"]}/{artifact["path"]}'
    partial = target.with_suffix(target.suffix + ".part")
    print(f"Downloading {artifact['path']} ({artifact['size']:,} bytes)", flush=True)
    try:
        with urllib.request.urlopen(url, timeout=120) as response, partial.open("wb") as output:
            while True:
                block = response.read(1024 * 1024)
                if not block:
                    break
                output.write(block)
        if partial.stat().st_size != artifact["size"] or sha256(partial) != artifact["sha256"]:
            raise RuntimeError(f"Artifact checksum mismatch: {target}")
        os.replace(partial, target)
    finally:
        partial.unlink(missing_ok=True)


def gguf_metadata(path):
    """Read selected GGUF metadata without loading tensor weights or token arrays."""
    formats = {0: "B", 1: "b", 2: "H", 3: "h", 4: "I", 5: "i", 6: "f", 7: "?", 10: "Q", 11: "q", 12: "d"}
    keep = {"general.architecture", "general.file_type", "tokenizer.chat_template"}
    with path.open("rb") as handle:
        def number(fmt):
            size = struct.calcsize("<" + fmt)
            raw = handle.read(size)
            if len(raw) != size:
                raise ValueError("Truncated GGUF header")
            return struct.unpack("<" + fmt, raw)[0]

        def string(retain=True):
            size = number("Q")
            if size > 128 * 1024 * 1024:
                raise ValueError("Invalid GGUF string length")
            if not retain:
                handle.seek(size, 1)
                return None
            raw = handle.read(size)
            if len(raw) != size:
                raise ValueError("Truncated GGUF string")
            return raw.decode("utf-8")

        def value(kind, retain):
            if kind == 8:
                return string(retain)
            if kind == 9:
                subtype, count = number("I"), number("Q")
                if count > 10_000_000 or subtype == 9:
                    raise ValueError("Invalid GGUF array")
                for _ in range(count):
                    value(subtype, False)
                return None
            if kind not in formats:
                raise ValueError(f"Unsupported GGUF metadata type: {kind}")
            result = number(formats[kind])
            return result if retain else None

        if handle.read(4) != b"GGUF" or number("I") not in {2, 3}:
            raise ValueError("Expected GGUF v2/v3")
        number("Q")  # tensor count
        count = number("Q")
        if count > 10000:
            raise ValueError("Invalid GGUF metadata count")
        result = {}
        for _ in range(count):
            key, kind = string(), number("I")
            entry = value(kind, key in keep)
            if key in keep:
                result[key] = entry
        return result


def normalize_tokenizer(source):
    config = json.loads(source.read_text())
    if isinstance(config.get("extra_special_tokens"), list):
        config["extra_special_tokens"] = {
            f"extra_{index}": token for index, token in enumerate(config["extra_special_tokens"])
        }
    return json.dumps(config, indent=2) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-only", action="store_true", help="Verify existing files without network access")
    parser.add_argument("--model", choices=["all", "apertus", "laya"], default="all")
    args = parser.parse_args()
    lock = json.loads((ROOT / "models.lock.json").read_text())
    for name, model in lock.items():
        if args.model not in {"all", name}:
            continue
        for artifact in model["files"]:
            target = ROOT / "models" / name / artifact["path"]
            if name == "laya" and artifact["path"] == "tokenizer/tokenizer_config.json":
                # Keep verified source bytes separately; normalize once for a read-only runtime mount.
                source = target.with_suffix(".source.json")
                fetch_artifact(model, artifact, source, args.verify_only)
                normalized = normalize_tokenizer(source)
                if args.verify_only:
                    if not target.exists() or target.read_text() != normalized:
                        raise RuntimeError("Changed normalized Laya tokenizer configuration")
                else:
                    target.write_text(normalized)
            else:
                fetch_artifact(model, artifact, target, args.verify_only)

    if args.model == "laya":
        print("Pinned Laya files verified and tokenizer normalized.")
        return
    gguf = ROOT / "models/apertus" / lock["apertus"]["files"][0]["path"]
    metadata = gguf_metadata(gguf)
    if metadata.get("general.architecture") != "apertus" or metadata.get("general.file_type") != 15:
        raise RuntimeError("Expected Apertus Q4_K_M GGUF metadata")
    template = metadata.get("tokenizer.chat_template")
    if not isinstance(template, str) or not template.strip() or "messages" not in template:
        raise RuntimeError("Missing embedded chat template; do not silently substitute ChatML")
    template_path = ROOT / "models/apertus/embedded-chat-template.jinja"
    if args.verify_only:
        if not template_path.exists() or template_path.read_text() != template:
            raise RuntimeError("Changed extracted Apertus template")
    else:
        template_path.write_text(template)
    print("All pinned model files verified. Embedded Apertus template extracted for review.")


if __name__ == "__main__":
    main()
