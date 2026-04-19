import { PropsWithChildren } from "react";

export function Alert({ children }: PropsWithChildren) {
  return <div className="alert">{children}</div>;
}
