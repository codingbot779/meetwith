"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, MapPin, Pencil, Share2, Trash2, UserRound, UsersRound, X } from "lucide-react";
import Link from "next/link";
import type { MeetingEvent } from "@/lib/types";
import { slotKey, timeSlots } from "@/lib/types";

const week = ["일", "월", "화", "수", "목", "금", "토"];
const avatarColors = ["#e7e4d2", "#dceee3", "#eee1d5", "#e3e5ef", "#ece0e8"];

function dateParts(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return { day: parsed.getDate(), week: week[parsed.getDay()], label: `${parsed.getMonth() + 1}월 ${parsed.getDate()}일 (${week[parsed.getDay()]})` };
}

export default function MeetingRoom({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<MeetingEvent | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(false);
  const [participantId, setParticipantId] = useState<string>();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeDate, setActiveDate] = useState(0);
  const [focusedSlot, setFocusedSlot] = useState("");
  const [saving, setSaving] = useState(false);
  const dragValue = useRef<boolean | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const loadEvent = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "모임을 불러오지 못했습니다.");
      setEvent(data.event);
      setPersistent(data.persistent);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "모임을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEvent();
    const savedId = localStorage.getItem(`hanjari:${eventId}:participant`);
    const savedName = localStorage.getItem(`hanjari:${eventId}:name`);
    if (savedId) setParticipantId(savedId);
    if (savedName) setName(savedName);
    if (new URLSearchParams(window.location.search).get("created") === "1") setShareOpen(true);
  }, [eventId, loadEvent]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!shareOpen) return;
    closeButton.current?.focus();
    const close = (keyboard: KeyboardEvent) => { if (keyboard.key === "Escape") setShareOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [shareOpen]);

  const slots = useMemo(() => event ? timeSlots(event.startTime, event.endTime, event.slotMinutes) : [], [event]);
  const counts = useMemo(() => {
    const map = new Map<string, string[]>();
    event?.participants.forEach((person) => person.slots.forEach((slot) => map.set(slot, [...(map.get(slot) ?? []), person.name])));
    return map;
  }, [event]);

  const best = useMemo(() => {
    if (!event) return [];
    const all = event.dates.flatMap((date) => slots.map((time) => ({ key: slotKey(date, time), date, time, people: counts.get(slotKey(date, time)) ?? [] })));
    return all.filter((item) => item.people.length > 0).sort((a, b) => b.people.length - a.people.length || a.key.localeCompare(b.key)).slice(0, 5);
  }, [event, slots, counts]);

  function showToast(message: string) { setToast(message); }

  async function copyLink() {
    const url = window.location.href.split("?")[0];
    try {
      await navigator.clipboard.writeText(url);
      showToast("초대 링크를 복사했어요.");
    } catch {
      const input = document.createElement("textarea");
      input.value = url; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove();
      showToast("초대 링크를 복사했어요.");
    }
  }

  async function nativeShare() {
    if (!event) return;
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try { await navigator.share({ title: `${event.title} · 한자리`, text: "되는 시간을 알려주세요!", url }); } catch { return; }
    } else await copyLink();
  }

  function startEditing(id?: string) {
    if (!event) return;
    const person = id ? event.participants.find((item) => item.id === id) : participantId ? event.participants.find((item) => item.id === participantId) : undefined;
    setParticipantId(person?.id);
    setName(person?.name ?? "");
    setSelected(new Set(person?.slots ?? []));
    setEditing(true);
    setError("");
    window.scrollTo({ top: 180, behavior: "smooth" });
  }

  function toggleSlot(key: string, forced?: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      const add = forced ?? !next.has(key);
      if (add) next.add(key); else next.delete(key);
      return next;
    });
  }

  async function saveAvailability(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!name.trim()) { setError("이름을 먼저 입력해 주세요."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/participants`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, name: name.trim(), slots: [...selected] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "저장하지 못했습니다.");
      setEvent(data.event);
      setParticipantId(data.participant.id);
      localStorage.setItem(`hanjari:${eventId}:participant`, data.participant.id);
      localStorage.setItem(`hanjari:${eventId}:name`, data.participant.name);
      setEditing(false);
      showToast("내 일정을 저장했어요.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장하지 못했습니다.");
    } finally { setSaving(false); }
  }

  async function deleteParticipant(id: string, personName: string) {
    if (!window.confirm(`${personName}님의 응답을 삭제할까요?`)) return;
    const response = await fetch(`/api/events/${eventId}/participants`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId: id }) });
    const data = await response.json();
    if (!response.ok) return showToast(data.error || "삭제하지 못했습니다.");
    setEvent(data.event);
    if (participantId === id) { setParticipantId(undefined); localStorage.removeItem(`hanjari:${eventId}:participant`); }
    showToast("응답을 삭제했어요.");
  }

  function focusBest(key: string, date: string) {
    setActiveDate(Math.max(0, event?.dates.indexOf(date) ?? 0));
    setFocusedSlot(key);
    window.setTimeout(() => document.getElementById(`slot-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }), 30);
  }

  if (loading) return <div className="loading-screen"><div><div className="loading-mark" /><p>모임 일정을 불러오는 중…</p></div></div>;
  if (!event) return <div className="error-screen"><div><h1>모임을 찾을 수 없어요</h1><p className="room-description">{error || "링크가 올바른지 확인해 주세요."}</p><Link className="primary-button" href="/"><ArrowLeft size={18} /> 새 모임 만들기</Link></div></div>;

  const total = event.participants.length;
  const shareUrlLabel = typeof window === "undefined" ? `/e/${event.id}` : `${window.location.host}/e/${event.id}`;
  const mapQuery = encodeURIComponent([event.location?.name, event.location?.address].filter(Boolean).join(" "));
  const mapUrl = event.location?.region === "domestic" ? `https://map.naver.com/p/search/${mapQuery}` : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  return (
    <>
      <header className="room-header"><div className="shell room-top"><Link className="brand" href="/" aria-label="한자리 홈"><span className="brand-mark" aria-hidden="true" />한자리</Link><button className="primary-button share-button" onClick={() => setShareOpen(true)}><Share2 size={17} /> 공유</button></div></header>
      <main className="shell room-main">
        <section className="room-heading">
          <h1>{event.title}</h1>
          {event.description && <p className="room-description">{event.description}</p>}
          <div className="room-meta"><span><CalendarDays size={16} /> {event.dates.length}개 날짜 · {event.startTime}–{event.endTime}</span><span><UsersRound size={16} /> {total}명 참여</span>{event.location && <span><MapPin size={16} /> {event.location.name}</span>}</div>
        </section>

        {!persistent && <div className="demo-banner" role="status">현재 미리보기 저장 모드예요. Supabase 환경 변수를 연결하면 여러 기기에서 응답이 안전하게 유지됩니다.</div>}

        <div className="room-layout">
          <section className="schedule-panel" aria-labelledby="schedule-title">
            <div className="panel-toolbar">
              <h2 className="panel-title" id="schedule-title">{editing ? "내가 되는 시간을 선택하세요" : "모두의 가능한 시간"}</h2>
              <div className="legend" aria-label="참여자가 많을수록 진한 초록색"><span>적음</span><span className="legend-scale">{[.08, .25, .5, .75, 1].map((heat) => <i key={heat} style={{ "--heat": heat } as React.CSSProperties} />)}</span><span>많음</span></div>
            </div>

            <div className="mobile-date-nav">
              <button className="icon-button" onClick={() => setActiveDate(Math.max(0, activeDate - 1))} disabled={activeDate === 0} aria-label="이전 날짜"><ChevronLeft /></button>
              <span className="mobile-date-label">{dateParts(event.dates[activeDate]).label}</span>
              <button className="icon-button" onClick={() => setActiveDate(Math.min(event.dates.length - 1, activeDate + 1))} disabled={activeDate === event.dates.length - 1} aria-label="다음 날짜"><ChevronRight /></button>
            </div>

            <div className="grid-scroll">
              <div className="availability-grid" style={{ "--day-count": event.dates.length } as React.CSSProperties} onPointerUp={() => { dragValue.current = null; }} onPointerLeave={() => { dragValue.current = null; }}>
                <div className="grid-corner" />
                {event.dates.map((date, index) => <div className={`grid-day ${index !== activeDate ? "mobile-day-hidden" : ""}`} key={date}><span>{dateParts(date).week}</span><strong>{dateParts(date).day}</strong></div>)}
                {slots.map((time) => (
                  <div key={time} style={{ display: "contents" }}>
                    <div className="grid-time">{time}</div>
                    {event.dates.map((date, index) => {
                      const key = slotKey(date, time); const people = counts.get(key) ?? [];
                      const ratio = total ? people.length / total : 0;
                      const heat = people.length ? .16 + ratio * .8 : .045;
                      const isSelected = selected.has(key);
                      return <button
                        id={`slot-${key}`} key={key} type="button"
                        className={`slot ${index !== activeDate ? "mobile-day-hidden" : ""} ${editing ? "editing" : ""} ${editing && isSelected ? "selected" : ""} ${focusedSlot === key ? "focused" : ""}`}
                        style={{ "--heat": editing ? (isSelected ? .9 : .045) : heat } as React.CSSProperties}
                        aria-label={`${dateParts(date).label} ${time}, ${editing ? (isSelected ? "가능함" : "불가능함") : `${people.length}명 가능${people.length ? `: ${people.join(", ")}` : ""}`}`}
                        aria-pressed={editing ? isSelected : undefined}
                        onPointerDown={(pointer) => { if (editing) { dragValue.current = !selected.has(key); toggleSlot(key, dragValue.current); } else setFocusedSlot(key); }}
                        onPointerEnter={() => { if (editing && dragValue.current !== null) toggleSlot(key, dragValue.current); }}
                        onClick={() => { if (!editing) { setFocusedSlot(key); if (people.length) showToast(people.join(", ")); } }}
                      >{!editing && people.length > 0 && <span className={`slot-count ${ratio > .55 ? "light" : ""}`}>{people.length}</span>}</button>;
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="grid-help">{editing ? "칸을 누르거나 드래그해서 선택하세요. 한 번 더 누르면 해제됩니다." : "칸을 누르면 그 시간에 가능한 참여자를 확인할 수 있어요."}</p>

            {!editing ? <button className="primary-button full-button" style={{ marginTop: 20 }} onClick={() => startEditing()}><Pencil size={18} /> {participantId ? "내 일정 수정하기" : "내 일정 입력하기"}</button> : (
              <form className="name-editor" onSubmit={saveAvailability}>
                <div><label className="field-label" htmlFor="participant-name">이름 또는 닉네임</label><input className="input" id="participant-name" value={name} onChange={(input) => setName(input.target.value)} placeholder="참여자들에게 보일 이름" maxLength={30} autoComplete="nickname" /></div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="name-editor-actions"><button className="primary-button" type="submit" disabled={saving}><Check size={18} /> {saving ? "저장 중…" : `${selected.size}개 시간 저장`}</button><button className="secondary-button" type="button" onClick={() => { setEditing(false); setError(""); }}>취소</button></div>
              </form>
            )}

            <div className="best-section"><h3>가장 많이 겹치는 시간</h3>{best.length ? best.map((item) => <button className="best-slot" key={item.key} onClick={() => focusBest(item.key, item.date)}><span><strong>{dateParts(item.date).label} · {item.time}</strong><small>{item.people.join(", ")}</small></span><b>{item.people.length} / {total}명</b></button>) : <p className="empty-copy">아직 응답이 없어요. 첫 번째로 가능한 시간을 알려주세요.</p>}</div>
          </section>

          <aside className="room-sidebar">
            <section className="side-section"><div className="side-heading"><h2>참여자 <span style={{ color: "var(--accent)" }}>{total}</span></h2></div><div className="participant-list">
              {event.participants.map((person, index) => <div className="participant-row" key={person.id}><span className="avatar" style={{ background: avatarColors[index % avatarColors.length] }}>{person.name.slice(0, 1)}</span><span className="participant-name">{person.name}</span><span className="participant-count">{person.slots.length}칸</span><button className="icon-button" onClick={() => startEditing(person.id)} aria-label={`${person.name} 일정 수정`}><Pencil size={15} /></button><button className="icon-button" onClick={() => deleteParticipant(person.id, person.name)} aria-label={`${person.name} 응답 삭제`}><Trash2 size={15} /></button></div>)}
              {!total && <p className="empty-copy"><UserRound size={16} style={{ verticalAlign: -3 }} /> 링크를 공유하고 응답을 모아보세요.</p>}
            </div></section>
            {event.location && <section className="side-section"><div className="side-heading"><h2>만날 장소</h2></div><div className="location-card">
              {event.location.region === "overseas" ? <iframe className="map-frame" title={`${event.location.name} 구글맵스`} loading="lazy" src={`https://www.google.com/maps?q=${mapQuery}&output=embed`} referrerPolicy="no-referrer-when-downgrade" /> : <div className="naver-location"><MapPin size={42} strokeWidth={1.4} /></div>}
              <div className="location-copy"><strong>{event.location.name}</strong>{event.location.address && <p>{event.location.address}</p>}<a className="map-link" href={mapUrl} target="_blank" rel="noreferrer">{event.location.region === "domestic" ? "네이버지도" : "구글맵스"}에서 열기 <ExternalLink size={15} /></a></div>
            </div></section>}
          </aside>
        </div>
      </main>

      {shareOpen && <div className="modal-backdrop" onMouseDown={(mouse) => { if (mouse.target === mouse.currentTarget) setShareOpen(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><div className="modal-head"><h2 id="share-title">모임 링크 공유</h2><button ref={closeButton} className="icon-button" onClick={() => setShareOpen(false)} aria-label="공유 창 닫기"><X /></button></div><p>링크를 받은 사람은 로그인 없이 바로 가능한 시간을 선택할 수 있어요.</p><div className="share-url">{shareUrlLabel}</div><div className="modal-actions"><button className="primary-button" onClick={copyLink}><Copy size={18} /> 링크 복사</button><button className="secondary-button" onClick={nativeShare}><Share2 size={18} /> 다른 앱으로 공유</button></div></section></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
