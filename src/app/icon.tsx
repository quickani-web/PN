import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Browser tab icon — amber play on dark (Vidora). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontSize: 20,
            color: "#f59e0b",
            lineHeight: 1,
            marginLeft: 2,
          }}
        >
          ▶
        </div>
      </div>
    ),
    { ...size },
  );
}
