// Modal registry - extended via declaration merging in each modal file
// Each modal should add an entry: { props: {...}; result: ... }
//
// Example:
//   declare module '@/shared/types/modal-registry' {
//     interface ModalRegistry {
//       'shared/confirm': { props: ConfirmProps; result: boolean };
//     }
//   }

export interface ModalRegistry {}

export type ModalId = keyof ModalRegistry & string;

export type PropsOf<K extends string> = K extends keyof ModalRegistry
  ? ModalRegistry[K] extends { props: infer P }
    ? P
    : Record<string, never>
  : Record<string, any>;

export type ResultOf<K extends string> = K extends keyof ModalRegistry
  ? ModalRegistry[K] extends { result: infer R }
    ? R
    : void
  : any;
