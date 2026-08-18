import type { NextConfig } from "next";

/**
 * GitHub Pages 용 정적 빌드는 NEXT_OUTPUT=export 로 켠다.
 * 평소 빌드는 그대로 서버 렌더링 + ISR 이라, 배포 대상이 늘어도 기본 동작이 바뀌지 않는다.
 *
 * Pages 는 https://yju3943.github.io/my-links/ 에서 저장소 루트를 서빙하므로,
 * 내보낸 파일을 web/ 아래에 두고 basePath 를 /my-links/web 으로 맞춘다.
 */
const isExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = isExport
  ? {
      output: "export",
      basePath: "/my-links/web",
      // 정적 호스팅에는 이미지 최적화 서버가 없다.
      images: { unoptimized: true },
      // 폴더마다 index.html 을 만들어 /market/ 같은 주소가 그대로 열리게 한다.
      trailingSlash: true,
    }
  : {};

export default nextConfig;
