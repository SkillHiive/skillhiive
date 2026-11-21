import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const signUp = vi.fn();
const upsert = vi.fn();
const usernameCount = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { signUp: (...args: unknown[]) => signUp(...args) },
    from: () => ({
      select: () => ({ eq: (_column: string, value: string) => usernameCount(value) }),
      upsert: (...args: unknown[]) => upsert(...args),
    }),
  },
}));

import Register from "./Register";

function show(url = "/register") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Register />
    </MemoryRouter>,
  );
}

async function fillIn(user: ReturnType<typeof userEvent.setup>, username = "  RohanS ") {
  await user.type(screen.getByLabelText("Display name"), "Rohan");
  await user.type(screen.getByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Email address"), "r@example.com");
  await user.type(screen.getByLabelText("Password"), "Secret123");
  await user.type(screen.getByLabelText("Confirm password"), "Secret123");
}

beforeEach(() => {
  vi.resetAllMocks();
  usernameCount.mockResolvedValue({ count: 0, error: null });
});

describe("Register", () => {
  it("labels every field and submits on Enter with one lower-cased username", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: { user: { id: "u1" }, session: { access_token: "t" } }, error: null });
    upsert.mockResolvedValue({ error: null });
    show();
    await fillIn(user);
    await user.keyboard("{Enter}");
    expect(signUp).toHaveBeenCalledTimes(1);
    expect(signUp.mock.calls[0]![0].options.data).toEqual({ username: "rohans", displayname: "Rohan" });
    expect(upsert).toHaveBeenCalledWith({ id: "u1", username: "rohans", displayname: "Rohan" }, { onConflict: "id" });
    expect(usernameCount).toHaveBeenCalledWith("rohans");
  });

  it("shows a failed profile write instead of only logging it", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: { user: { id: "u1" }, session: { access_token: "t" } }, error: null });
    upsert.mockResolvedValue({ error: { code: "23505", message: 'duplicate key value violates unique constraint "profiles_username_key"' } });
    show();
    await fillIn(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect((await screen.findByRole("alert")).textContent).toBe("That username is taken. Try another.");
  });

  it("stops before creating the account when the username is taken", async () => {
    const user = userEvent.setup();
    usernameCount.mockResolvedValue({ count: 1, error: null });
    show();
    await fillIn(user);
    await user.keyboard("{Enter}");
    expect((await screen.findByRole("alert")).textContent).toBe("That username is taken. Try another.");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("keeps where the visitor was going through confirmation and back to log in", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ data: { user: { id: "u1" }, session: null }, error: null });
    show("/register?next=%2Flink%3Fcode%3DABCD-2345");
    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login?next=%2Flink%3Fcode%3DABCD-2345");
    await fillIn(user);
    await user.keyboard("{Enter}");
    expect(signUp.mock.calls[0]![0].options.emailRedirectTo).toBe(window.location.origin + "/link?code=ABCD-2345");
    expect(upsert).not.toHaveBeenCalled();
    expect(await screen.findByText("Check your inbox")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Then log in" }).getAttribute("href")).toBe("/login?next=%2Flink%3Fcode%3DABCD-2345");
  });
});
