import React from "react";

export const CodePreview = ({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
    >
      <pre
        style={{
          background: "#1e1e1e",
          color: "#d4d4d4",
          padding: "12px",
          borderRadius: "8px",
          overflow: "auto",
          fontSize: "14px",
        }}
      >
        <code>{code}</code>
      </pre>
      <div
        style={{
          border: "1px solid #eee",
          padding: "12px",
          borderRadius: "8px",
          background: "#fff",
          color: "#1e1e1e",
        }}
      >
        {children}
      </div>
    </div>
  );
};
