// Modal registry - extended via declaration merging in each modal file
// Each modal should add an entry: { props: {...}; result: ... }
//
// Example:
//   declare module '@/shared/types/modal-registry' {
//     interface ModalRegistry {
//       'shared/confirm': { props: ConfirmProps; result: boolean };
//     }
//   }

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled by declaration merging
export interface ModalRegistry {}

export type ModalId = keyof ModalRegistry & string;

// For modals that take nothing besides isOpen/onClose
export type NoModalProps = Record<never, never>;

export type PropsOf<K extends ModalId> = ModalRegistry[K] extends { props: infer P } ? P : NoModalProps;

export type ResultOf<K extends ModalId> = ModalRegistry[K] extends { result: infer R } ? R : void;

// props can be skipped when every field is optional
export type OpenModalArgs<K extends ModalId> = NoModalProps extends PropsOf<K> ? [props?: PropsOf<K>] : [props: PropsOf<K>];
