import React from "react";

// 计算 2025 年已过天数和剩余天数、进度
function getYearProgress() {
  const startOfYear = new Date(2025, 0, 1); // 2025 年 1 月 1 日
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor(
    (now.getTime() - startOfYear.getTime()) / oneDay
  );
  const totalDaysIn2025 = 365; // 2025 不是闰年
  const progress = (daysPassed / totalDaysIn2025) * 100;
  const daysRemaining = totalDaysIn2025 - daysPassed;
  return { daysPassed, progress, daysRemaining };
}

export default function YearProgress() {
  const { daysPassed, progress, daysRemaining } = getYearProgress();
  return (
    <div
      style={{
        width: "400px",
        backgroundColor: "#fff4f1",
        borderRadius: "16px",
        padding: "16px",
        margin: "auto",
      }}
    >
      <h2
        style={{
          margin: 0,
          textAlign: "center",
          fontSize: "24px",
          fontWeight: "bold",
        }}
      >
        <span>&nbsp;🎉&nbsp;</span>
        2025 Progress Bar
        <span>&nbsp;🎉&nbsp;</span>
      </h2>
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
          backgroundColor: "#f8e8e4",
          padding: "8px",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
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
