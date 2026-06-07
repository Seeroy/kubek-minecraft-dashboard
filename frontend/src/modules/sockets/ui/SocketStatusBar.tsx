import { useSocketState } from "@/shared/context/socket-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const SocketStatusBar = () => {
  const [show, setShow] = useState(false);
  const { status } = useSocketState();
  const isConnecting = status !== "connected";
  const { t } = useTranslation("modules.sockets.statusBar");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isConnecting) {
      timeoutId = setTimeout(() => setShow(true), 2000);
    } else {
      setShow(false);
    }

    return () => clearTimeout(timeoutId);
  }, [isConnecting]);

  return (
    <div
      className={`pointer-events-none fixed top-0 left-0 z-50 flex w-full origin-top transform items-center justify-center gap-4 overflow-hidden bg-yellow-400 py-1.5 text-center text-black transition-all duration-300 ease-out ${show && "animate-in opacity-100 slide-in-from-top"} ${!show && "animate-out opacity-0 slide-out-to-top"} `}
    >
      <Loader2 className="h-5 w-5 animate-spin text-black" />
      <span>{t("connectionSlow")}</span>
    </div>
  );
};
