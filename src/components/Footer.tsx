export default function Footer() {
  const version = __APP_VERSION__;
  const buildTime = __BUILD_TIME__;

  return (
    <footer className="border-t border-[#e5e5e5] mt-12">
      <div className="max-w-[1200px] mx-auto py-6 text-center text-[13px] text-[#969696] font-['Pretendard']">
        개발 및 수정문의: DESKER 김선영 | v{version} | {buildTime}
      </div>
    </footer>
  );
}
