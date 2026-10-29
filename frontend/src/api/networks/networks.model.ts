export type {
  BackendForwardingKind,
  DiffLine,
  ForwardingMode,
  Network,
  NetworkBackendCandidate,
  NetworkCandidates,
  NetworkChangeResult,
  NetworkFileChange,
  NetworkMember,
  NetworkPlan,
  NetworkPlanNote,
  NetworkProxyCandidate,
  NetworkServerRef,
  NetworkWizardProps,
  NewBackendProps,
  NewProxyProps,
  VelocitySettings,
} from "@shared/types/network.types";
export { NEW_BACKEND_REF, NetworkErrorCode } from "@shared/types/network.types";

export interface NetworkTaskRef {
  taskId: string;
}
