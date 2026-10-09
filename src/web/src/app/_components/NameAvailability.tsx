"use client";
import { useEffect, useState } from "react";
import { projectFetch } from "../../lib/projects/client";
import type { ProjectType } from "../../lib/projects/types";
export default function NameAvailability({
  name,
  owner,
  type,
  exclude,
  publicName = false,
}: {
  name: string;
  owner: string;
  type: ProjectType;
  exclude?: string;
  publicName?: boolean;
}) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let disposed = false;
    setMessage("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        name,
        type,
        ...(exclude ? { exclude } : {}),
        ...(publicName ? { public: "true" } : {}),
      });
      void projectFetch<{ available: boolean }>(
        `/api/projects/name-check?${params}`,
        owner,
      )
        .then((r) => {
          if (!disposed)
            setMessage(
              r.available
                ? "Name available."
                : "That name already exists. Choose a different name.",
            );
        })
        .catch((e) => {
          if (!disposed) setMessage(e.message);
        });
    }, 350);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [name, owner, type, exclude, publicName]);
  return message ? (
    <output className="name-availability">{message}</output>
  ) : null;
}
