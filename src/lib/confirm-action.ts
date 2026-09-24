type ConfirmRequest = {
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => void;
};

type ConfirmListener = (request: ConfirmRequest | null) => void;

let listener: ConfirmListener | null = null;
let pending: ConfirmRequest | null = null;

export function subscribeConfirm(next: ConfirmListener): () => void {
  listener = next;
  if (pending) next(pending);
  return () => {
    if (listener === next) listener = null;
  };
}

export function requestConfirm(request: ConfirmRequest): void {
  pending = request;
  if (listener) {
    listener(request);
    return;
  }
  if (
    typeof window !== 'undefined' &&
    window.confirm(`${request.title}\n\n${request.description}`)
  ) {
    request.action();
  }
  pending = null;
}

export function dismissConfirm(): void {
  pending = null;
  listener?.(null);
}

export function confirmIf(
  dirty: boolean,
  request: ConfirmRequest,
): void {
  if (!dirty) {
    request.action();
    return;
  }
  requestConfirm(request);
}
