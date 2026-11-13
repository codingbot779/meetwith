import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // 개발 중 같은 네트워크의 IP(휴대폰 등)로 접속해도 화면 스크립트가 동작하도록 허용합니다.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
