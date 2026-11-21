import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmProvider from "./ConfirmProvider";
import { useConfirm } from "@/lib/confirm";

function Trigger({ onResult }: { onResult: (r: unknown) => void }) {
  const confirm = useConfirm();
  return (
    <button onClick={async () => onResult(await confirm({ title: "Delete it?", confirmLabel: "Delete" }))}>
      go
    </button>
  );
}

describe("ConfirmProvider", () => {
  it("resolves with the answer and focuses Cancel first", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <Trigger onResult={onResult} />
      </ConfirmProvider>,
    );
    await user.click(screen.getByText("go"));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(document.activeElement?.textContent).toBe("Cancel");
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onResult).toHaveBeenLastCalledWith({ checked: false });

    await user.click(screen.getByText("go"));
    await user.keyboard("{Escape}");
    expect(onResult).toHaveBeenLastCalledWith(null);
  });

  it("closes as a no when its signal is aborted", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    const controller = new AbortController();
    function Aborting() {
      const confirm = useConfirm();
      return (
        <button
          onClick={async () =>
            onResult(await confirm({ title: "Join?", confirmLabel: "Join", tone: "neutral", signal: controller.signal }))
          }
        >
          ask
        </button>
      );
    }
    render(
      <ConfirmProvider>
        <Aborting />
      </ConfirmProvider>,
    );
    await user.click(screen.getByText("ask"));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    act(() => controller.abort());
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(null));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
