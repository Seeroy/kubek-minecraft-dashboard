import { useSocketState } from "@/shared/context/socket-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const SocketStatusBar = () => {
  const [show, setShow] = useState(false);
  const { status } = useSocketState();
  const isConnecting = status !== "connected";
  const { t } = useTranslation("modules.sockets.statusBar");

  // Short reconnects stay silent, the bar shows up only after a delay
  useEffect(() => {
    if (!isConnecting) return;
    const timeoutId = setTimeout(() => setShow(true), 2000);
    return () => {
      clearTimeout(timeoutId);
      setShow(false);
    };
  }, [isConnecting]);

  // Hidden is the resting state, a plain transition never plays on page load the way
  // an exit keyframe animation did
  return (
    <div
      data-show={show || undefined}
      className="pointer-events-none fixed top-0 left-0 z-50 flex w-full -translate-y-full items-center justify-center gap-4 overflow-hidden bg-yellow-400 py-1.5 text-center text-black opacity-0 transition-[translate,opacity] duration-300 ease-out data-show:translate-y-0 data-show:opacity-100"
    >
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{t("connectionSlow")}</span>
    </div>
  );
};
