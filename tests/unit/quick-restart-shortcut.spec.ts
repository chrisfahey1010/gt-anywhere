import { describe, expect, it } from "vitest";
import {
  isEditableShortcutTarget,
  shouldHandleQuickRestartShortcut
} from "../../src/app/bootstrap/quick-restart-shortcut";

describe("quick restart shortcut", () => {
  it("accepts plain Backspace in world-ready when focus is outside editable UI", () => {
    const canvas = document.createElement("canvas");

    expect(
      shouldHandleQuickRestartShortcut({
        event: {
          altKey: false,
          code: "Backspace",
          ctrlKey: false,
          metaKey: false,
          repeat: false,
          shiftKey: false,
          target: canvas
        },
        phase: "world-ready"
      })
    ).toBe(true);
  });

  it("rejects modifier, repeat, wrong-phase, and editable-focus input", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    const editableChild = document.createElement("span");
    const editableText = document.createTextNode("editing");

    editable.setAttribute("contenteditable", "true");
    editable.append(editableChild);
    editableChild.append(editableText);

    expect(isEditableShortcutTarget(input)).toBe(true);
    expect(isEditableShortcutTarget(textarea)).toBe(true);
    expect(isEditableShortcutTarget(editable)).toBe(true);
    expect(isEditableShortcutTarget(editableChild)).toBe(true);
    expect(isEditableShortcutTarget(editableText)).toBe(true);
    expect(
      shouldHandleQuickRestartShortcut({
        event: {
          altKey: true,
          code: "Backspace",
          ctrlKey: false,
          metaKey: false,
          repeat: false,
          shiftKey: false,
          target: document.createElement("canvas")
        },
        phase: "world-ready"
      })
    ).toBe(false);
    expect(
      shouldHandleQuickRestartShortcut({
        event: {
          altKey: false,
          code: "Backspace",
          ctrlKey: false,
          metaKey: false,
          repeat: false,
          shiftKey: false,
          target: editableChild
        },
        phase: "world-ready"
      })
    ).toBe(false);
    expect(
      shouldHandleQuickRestartShortcut({
        event: {
          altKey: false,
          code: "Backspace",
          ctrlKey: false,
          metaKey: false,
          repeat: true,
          shiftKey: false,
          target: document.createElement("canvas")
        },
        phase: "world-ready"
      })
    ).toBe(false);
    expect(
      shouldHandleQuickRestartShortcut({
        event: {
          altKey: false,
          code: "Backspace",
          ctrlKey: false,
          metaKey: false,
          repeat: false,
          shiftKey: false,
          target: input
        },
        phase: "world-ready"
      })
    ).toBe(false);
    expect(
      shouldHandleQuickRestartShortcut({
        event: {
          altKey: false,
          code: "Backspace",
          ctrlKey: false,
          metaKey: false,
          repeat: false,
          shiftKey: false,
          target: document.createElement("canvas")
        },
        phase: "world-loading"
      })
    ).toBe(false);
  });
});
