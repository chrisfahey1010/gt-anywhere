export interface QuickRestartShortcutEvent {
  altKey: boolean;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}

function resolveShortcutTargetElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  return resolveShortcutTargetElement(target)?.closest("input, textarea, [contenteditable]") !== null;
}

export function shouldHandleQuickRestartShortcut(options: {
  event: QuickRestartShortcutEvent;
  phase: string;
}): boolean {
  return !(
    options.event.code !== "Backspace" ||
    options.event.altKey ||
    options.event.ctrlKey ||
    options.event.metaKey ||
    options.event.shiftKey ||
    options.event.repeat ||
    options.phase !== "world-ready" ||
    isEditableShortcutTarget(options.event.target)
  );
}
