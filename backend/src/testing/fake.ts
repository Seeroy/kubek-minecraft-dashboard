// members are still typechecked, unlike as never
export function fake<T>(members: Partial<T> = {}): T {
  return members as T;
}
