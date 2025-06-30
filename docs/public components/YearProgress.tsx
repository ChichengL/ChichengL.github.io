import React, { useEffect, useRef } from "react";
import "../public/public.scss";
// 计算 今年 年已过天数和剩余天数、进度
function getYearProgress() {
  const thisYear = new Date().getFullYear();
  const startOfYear = new Date(thisYear, 0, 1); // xxxx 年 1 月 1 日 00:00:00
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor(
    (now.getTime() - startOfYear.getTime()) / oneDay
  );
  const totalDaysInYear = now.getFullYear() % 4 === 0 ? 366 : 365; // 闰年 366 天，平年 365 天
  const progress = (daysPassed / totalDaysInYear) * 100;
  const daysRemaining = totalDaysInYear - daysPassed;
  return { daysPassed, progress, daysRemaining, thisYear };
}

export default function YearProgress() {
  const { daysPassed, progress, daysRemaining, thisYear } = getYearProgress();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    let letters = ref.current?.textContent?.split("") || [];
    ref.current.textContent = "";
    letters.forEach((letter, index) => {
      let span = document.createElement("span");
      span.textContent = letter;
      span.style.animationDelay = `${-20 + index * 0.2}s`;
      ref.current?.append(span);
    });
  }, []);
  return (
    <div
      style={{
        width: "400px",
        backgroundColor: "#f7f7f7",
        borderRadius: "16px",
        padding: "16px",
        margin: "auto",
      }}
    >
      <div
        style={{
          margin: 0,
          textAlign: "center",
          fontSize: "24px",
          fontWeight: "bold",
        }}
        className="rainbow"
        ref={ref}
      >
        {thisYear} Progress Bar
      </div>
      <p style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
        📅 Today is {new Date().toLocaleDateString()}
      </p>
      <div
        style={{
          height: "12px",
          backgroundColor: "#ddd",
          borderRadius: "4px",
          overflow: "hidden",
          marginTop: "8px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: "#bfa",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <p
        style={{
          marginTop: "8px",
          marginBottom: "4px",
          textAlign: "center",
          fontSize: "24px",
          fontWeight: "700",
        }}
      >
        {progress.toFixed(1)}%
      </p>
      <div
        style={{
          backgroundColor: "#e4e4e4",
          padding: "8px",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          margin: "0 30px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          {daysPassed} days have passed
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          {daysRemaining} days remaining ✨
        </p>
      </div>
      <p
        style={{
          marginTop: "12px",
          fontSize: "14px",
          color: "#999",
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        Time flies so fast! Keep going strong~ 🏄‍♂️🚀
      </p>
    </div>
  );
}
