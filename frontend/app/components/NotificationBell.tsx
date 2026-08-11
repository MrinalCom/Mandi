"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";

interface Notification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !token) return;
    api
      .get<{ notifications: Notification[]; unreadCount: number }>("/api/notifications", token)
      .then((res) => {
        setItems(res.notifications);
        setUnread(res.unreadCount);
      });

    const socket = getSocket();
    socket.emit("user:subscribe", user.id);
    function onNew(n: Notification) {
      setItems((prev) => [n, ...prev].slice(0, 30));
      setUnread((prev) => prev + 1);
    }
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [user, token]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
    await api.patch(`/api/notifications/${id}/read`, undefined, token);
  }

  return (
    <div className="notif-bell" ref={ref}>
      <button className="notif-bell-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">Notifications</div>
          {items.length === 0 && <div className="notif-empty">Nothing yet.</div>}
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.link ?? "#"}
              className={`notif-item ${n.read ? "" : "notif-item-unread"}`}
              onClick={() => {
                if (!n.read) markRead(n.id);
                setOpen(false);
              }}
            >
              <p style={{ margin: 0 }}>{n.message}</p>
              <span className="notif-time">{new Date(n.created_at).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
