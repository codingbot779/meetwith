"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarPlus, Check, Clock3, LockKeyhole, MapPin, Plus, X } from "lucide-react";
import type { EventInput, MapRegion } from "@/lib/types";

const week = ["일", "월", "화", "수", "목", "금", "토"];

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function initialDates() {
  return [1, 2, 3].map((offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return localDate(date);
  });
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return `${parsed.getMonth() + 1}월 ${parsed.getDate()}일 (${week[parsed.getDay()]})`;
}

export default function CreateMeeting() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dates, setDates] = useState<string[]>(initialDates);
  const [dateToAdd, setDateToAdd] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("22:00");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [region, setRegion] = useState<MapRegion>("domestic");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const previewDates = useMemo(() => dates.slice(0, 3), [dates]);

  function addDate() {
    if (!dateToAdd) return;
    if (!dates.includes(dateToAdd)) setDates([...dates, dateToAdd].sort());
    setDateToAdd("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim()) return setError("모임 이름을 입력해 주세요.");
    if (!dates.length) return setError("후보 날짜를 하나 이상 선택해 주세요.");
    if (startTime >= endTime) return setError("종료 시간은 시작 시간보다 늦어야 합니다.");
    setSubmitting(true);
    const payload: EventInput = {
      title: title.trim(), description: description.trim(), dates, startTime, endTime, slotMinutes,
      location: locationName.trim() ? { name: locationName.trim(), address: address.trim(), region } : null,
    };
    try {
      const response = await fetch("/api/events", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "모임을 만들지 못했습니다.");
      try { localStorage.setItem(`hanjari:${data.event.id}:admin`, data.adminToken); } catch { /* 저장소를 쓸 수 없으면 삭제 권한만 없어집니다. */ }
      router.push(`/e/${data.event.id}?created=1`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "모임을 만들지 못했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="shell site-header">
        <a className="brand" href="/" aria-label="한자리 홈"><span className="brand-mark" aria-hidden="true" />한자리</a>
        <a className="text-link" href="#how">사용 방법 <ArrowRight size={16} /></a>
      </header>

      <main className="shell">
        <div className="create-layout">
          <section aria-labelledby="create-title">
            <div className="intro">
              <div className="eyebrow">로그인 없이, 바로 시작</div>
              <h1 className="hero-title" id="create-title">함께할 시간,<br />한눈에.</h1>
              <p className="hero-copy">각자 되는 시간을 고르면 가장 많이 겹치는 순간이 선명해집니다. 링크 하나면 충분해요.</p>
            </div>

            <form className="meeting-form" onSubmit={submit}>
              <div>
                <label className="form-label" htmlFor="title">어떤 모임인가요?</label>
                <input className="input" id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 11월 동창 모임" maxLength={80} autoComplete="off" />
                <input className="textarea" style={{ marginTop: 10 }} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="참여자에게 전할 말이 있다면 적어주세요 (선택)" maxLength={500} aria-label="모임 설명" />
              </div>

              <div className="form-section">
                <label className="form-label" htmlFor="date">후보 날짜</label>
                <div className="date-add">
                  <input className="input" id="date" type="date" value={dateToAdd} onChange={(event) => setDateToAdd(event.target.value)} />
                  <button className="secondary-button" type="button" onClick={addDate} aria-label="날짜 추가"><Plus size={18} /> 추가</button>
                </div>
                <div className="date-chips" aria-live="polite">
                  {dates.map((date) => (
                    <span className="date-chip" key={date}>{formatDate(date)}
                      <button className="icon-button" style={{ width: 32, height: 32 }} type="button" onClick={() => setDates(dates.filter((item) => item !== date))} aria-label={`${formatDate(date)} 삭제`}><X size={15} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-section time-grid">
                <div>
                  <label className="field-label" htmlFor="start">시작 시간</label>
                  <select className="select" id="start" value={startTime} onChange={(event) => setStartTime(event.target.value)}>
                    {Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`).map((time) => <option key={time}>{time}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="end">종료 시간</label>
                  <select className="select" id="end" value={endTime} onChange={(event) => setEndTime(event.target.value)}>
                    {Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`).map((time) => <option key={time}>{time}</option>)}
                  </select>
                </div>
                <div className="field-span">
                  <label className="field-label" htmlFor="interval">시간 단위</label>
                  <select className="select" id="interval" value={slotMinutes} onChange={(event) => setSlotMinutes(Number(event.target.value))}>
                    <option value={30}>30분 단위</option><option value={60}>1시간 단위</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <label className="form-label" htmlFor="location">만날 장소 <span className="optional">선택</span></label>
                <div className="segment" role="group" aria-label="지도 서비스 선택">
                  <button type="button" className={region === "domestic" ? "active" : ""} onClick={() => setRegion("domestic")} aria-pressed={region === "domestic"}>국내 · 네이버지도</button>
                  <button type="button" className={region === "overseas" ? "active" : ""} onClick={() => setRegion("overseas")} aria-pressed={region === "overseas"}>해외 · 구글맵스</button>
                </div>
                <input className="input" id="location" value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder={region === "domestic" ? "예: 성수동 카페" : "예: Shibuya Sky"} maxLength={100} />
                <input className="input" style={{ marginTop: 8 }} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="상세 주소 (선택)" maxLength={200} aria-label="상세 주소" />
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button full-button" type="submit" disabled={submitting}>
                {submitting ? "모임을 만드는 중…" : <>모임 만들고 링크 공유하기 <ArrowRight size={19} /></>}
              </button>
              <p className="privacy-note"><LockKeyhole size={14} /> 가입도, 참여자 로그인도 필요 없어요.</p>
            </form>
          </section>

          <aside className="preview-wrap" aria-label="일정 히트맵 미리보기">
            <div className="preview-heading"><h2>이렇게 찾아드려요</h2><span className="live-dot">실시간 겹침</span></div>
            <div className="heatmap-preview">
              <div className="preview-days"><span />{previewDates.map((date) => { const parsed = new Date(`${date}T12:00:00`); return <span key={date}>{week[parsed.getDay()]}<strong>{parsed.getDate()}</strong></span>; })}</div>
              {["18:00", "19:00", "20:00", "21:00"].map((time, row) => (
                <div className="preview-row" key={time}><span className="preview-time">{time.slice(0, 2)}</span>{previewDates.map((date, column) => <div className="preview-cell" key={date} style={{ "--heat": [0.12, 0.28, 0.5, 0.78][Math.min(3, Math.max(0, 3 - Math.abs(row - 2) - Math.abs(column - 1)))] } as React.CSSProperties} />)}</div>
              ))}
            </div>
            <div className="best-time"><div><small><Check size={13} style={{ verticalAlign: -2 }} /> 가장 많이 되는 시간</small><strong>{previewDates[1] ? formatDate(previewDates[1]) : "날짜를 선택해 보세요"} · 20:00</strong></div><span className="best-count">5 / 6명</span></div>
            <div className="mini-people" aria-label="참여자 예시"><span className="avatar">민</span><span className="avatar">서</span><span className="avatar">지</span><span className="avatar">우</span><span className="avatar">+2</span></div>
          </aside>
        </div>

        <section className="how-section" id="how" aria-labelledby="how-title">
          <h2 className="how-title" id="how-title">복잡한 조율은 끝내고, 세 번이면 모여요.</h2>
          <div className="how-grid">
            <div className="how-item"><span className="how-number">01</span><div><h3><CalendarPlus size={17} style={{ verticalAlign: -3 }} /> 후보를 만들어요</h3><p>가능한 날짜와 시간 범위를 정하면 모임 링크가 생깁니다.</p></div></div>
            <div className="how-item"><span className="how-number">02</span><div><h3><Clock3 size={17} style={{ verticalAlign: -3 }} /> 각자 시간을 골라요</h3><p>참여자는 이름만 입력하고 되는 시간을 누릅니다.</p></div></div>
            <div className="how-item"><span className="how-number">03</span><div><h3><MapPin size={17} style={{ verticalAlign: -3 }} /> 가장 진한 시간에 만나요</h3><p>많이 겹칠수록 진해지는 히트맵으로 최적의 시간을 확인하세요. 시간이 확정되면 모임을 삭제해 참여자 정보를 지워 주세요.</p></div></div>
          </div>
        </section>
      </main>
      <footer className="shell site-footer"><span>한자리 · 모두의 시간을 맞추는 가장 간단한 방법</span><span>국내 네이버지도 · 해외 구글맵스</span></footer>
    </>
  );
}
