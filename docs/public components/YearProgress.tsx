import React, { useEffect, useRef } from "react";
import "../public/public.scss";

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
        maxWidth: "400px",
        backgroundColor: "var(--year-progress-bg)", // 使用CSS变量
        borderRadius: "16px",
        padding: "16px",
        margin: "auto",
        color: "var(--year-progress-text)", // 使用CSS变量
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
      <p
        style={{
          fontSize: "14px",
          color: "var(--year-progress-secondary-text)", // 使用CSS变量
          textAlign: "center",
        }}
      >
        📅 Today is {new Date().toLocaleDateString()}
      </p>
      <div
        style={{
          height: "12px",
          backgroundColor: "var(--year-progress-bar-bg)", // 使用CSS变量
          borderRadius: "4px",
          overflow: "hidden",
          marginTop: "8px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: "var(--year-progress-fill)", // 使用CSS变量
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
          backgroundColor: "var(--year-progress-stats-bg)", // 使用CSS变量
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
            color: "var(--year-progress-stats-text)", // 使用CSS变量
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
            color: "var(--year-progress-stats-text)", // 使用CSS变量
          }}
        >
          {daysRemaining} days remaining ✨
        </p>
      </div>
      <p
        style={{
          marginTop: "12px",
          fontSize: "14px",
          color: "var(--year-progress-footer-text)", // 使用CSS变量
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        Time flies so fast! Keep going strong~ 🏄‍♂️🚀
      </p>
    </div>
  );
}
