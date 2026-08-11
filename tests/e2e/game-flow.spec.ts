import { expect, test } from "@playwright/test";

test("main offline game flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Sẵn sàng chơi offline")).toBeVisible();
  await page.getByRole("button", { name: "CHƠI NGAY" }).click();
  await page.getByRole("button", { name: "TIẾP TỤC" }).click();
  await page.getByRole("button", { name: "BẮT ĐẦU GAME" }).click();

  for (let index = 0; index < 5; index += 1) {
    const hold = page.getByRole("button", { name: "GIỮ ĐỂ XEM" });
    await hold.dispatchEvent("pointerdown", { pointerId: 1 });
    await hold.dispatchEvent("pointerup", { pointerId: 1 });
    await page.getByRole("button", { name: "ĐÃ XEM" }).click();
    if (index === 0) await expect(page.getByRole("button", { name: "Tùy chọn ván" })).toBeVisible();
    await page.getByRole("button", { name: index === 4 ? "BẮT ĐẦU THẢO LUẬN" : "TÔI ĐÃ ĐƯA MÁY" }).click();
  }

  await expect(page.getByRole("button", { name: "Tùy chọn ván" })).toBeVisible();
  await page.getByRole("button", { name: "BẮT ĐẦU BỎ PHIẾU" }).click();
  await expect(page.getByRole("button", { name: "Tùy chọn ván" })).toBeVisible();
  await page.locator(".player-card").first().click();
  await page.getByRole("button", { name: /XÁC NHẬN NGƯỜI CHƠI/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "XÁC NHẬN" }).click();
  await expect(page.getByText("QUYẾT ĐỊNH ĐỒNG THUẬN")).toBeVisible();
});

test("player-name XSS payload stays text", async ({ page }) => {
  const payload = '<img src=x onerror=alert(1)>';
  await page.goto("/");
  await page.getByRole("button", { name: "CHƠI NGAY" }).click();
  await page.getByLabel("Tên người chơi 1").fill(payload);
  await expect(page.locator("img[src='x']")).toHaveCount(0);
  await expect(page.getByLabel("Tên người chơi 1")).toHaveValue("<img src=x onerror=a");
});

test("game options can pause or end a game early without a winner", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "CHƠI NGAY" }).click();
  await page.getByRole("button", { name: "TIẾP TỤC" }).click();
  await page.getByRole("button", { name: "BẮT ĐẦU GAME" }).click();

  await expect(page.getByRole("button", { name: "Tùy chọn ván" })).toBeVisible();
  const hold = page.getByRole("button", { name: "GIỮ ĐỂ XEM" });
  await hold.dispatchEvent("pointerdown", { pointerId: 1 });
  await expect(page.getByText("TỪ CỦA BẠN")).toBeVisible();
  await page.getByRole("button", { name: "Tùy chọn ván" }).click();
  await expect(page.getByText("TỪ CỦA BẠN")).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "TẠM RỜI" }).click();
  await expect(page.getByRole("button", { name: "TIẾP TỤC" })).toBeVisible();
  await page.getByRole("button", { name: "TIẾP TỤC" }).click();

  await page.getByRole("button", { name: "Tùy chọn ván" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "KẾT THÚC SỚM" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "HỦY" }).click();
  await expect(page.getByRole("button", { name: "Tùy chọn ván" })).toBeVisible();

  await page.getByRole("button", { name: "Tùy chọn ván" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "KẾT THÚC SỚM" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "KẾT THÚC & XEM ĐÁP ÁN" }).click();
  await expect(page.getByText("VÁN ĐÃ DỪNG SỚM")).toBeVisible();
  await expect(page.getByRole("heading", { name: "KHÔNG XÁC ĐỊNH PHE THẮNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tùy chọn ván" })).toHaveCount(0);

  await page.reload();
  await page.getByRole("button", { name: "TIẾP TỤC" }).click();
  await expect(page.getByText("VÁN ĐÃ DỪNG SỚM")).toBeVisible();
  await page.getByRole("button", { name: "VỀ TRANG CHỦ" }).click();
  await expect(page.getByRole("button", { name: "CHƠI NGAY" })).toBeVisible();
  await expect(page.getByRole("button", { name: "TIẾP TỤC" })).toHaveCount(0);
});

test("non-playing moderator guides clue turns and open discussion", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "CHƠI NGAY" }).click();
  await page.getByRole("button", { name: "TIẾP TỤC" }).click();
  await page.getByRole("button", { name: "Có quản trò điều phối" }).click();
  await page.getByLabel("Tên quản trò").fill("Minh");
  await page.getByRole("button", { name: "CÀI ĐẶT NÂNG CAO ›" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hẹn giờ thảo luận" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "XONG" }).click();
  await page.getByRole("button", { name: "BẮT ĐẦU GAME" }).click();

  for (let index = 0; index < 5; index += 1) {
    const hold = page.getByRole("button", { name: "GIỮ ĐỂ XEM" });
    await hold.dispatchEvent("pointerdown", { pointerId: 1 });
    await hold.dispatchEvent("pointerup", { pointerId: 1 });
    await page.getByRole("button", { name: "ĐÃ XEM" }).click();
    await page.getByRole("button", { name: "TÔI ĐÃ ĐƯA MÁY" }).click();
  }

  await expect(page.getByRole("heading", { name: "Đưa máy cho Minh" })).toBeVisible();
  await page.getByRole("button", { name: "TÔI LÀ QUẢN TRÒ" }).click();
  await expect(page.getByRole("button", { name: "BỎ QUA" })).toHaveCount(0);
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "CHUYỂN NGƯỜI TIẾP" }).click();
  }
  await expect(page.getByRole("heading", { name: "Ai đang giả vờ?" })).toBeVisible();
  await expect(page.locator('[data-screen-key="discussion:open-floor"]')).toBeVisible();
  await page.waitForTimeout(350);
  const initialTimer = await page.locator('[data-live="discussion-timer"]').textContent();
  const initialScrollTop = await page.locator(".screen").evaluate((screen) => {
    screen.scrollTop = screen.scrollHeight - screen.clientHeight;
    (window as typeof window & { discussionScreen?: Element }).discussionScreen = screen;
    return screen.scrollTop;
  });
  await page.waitForTimeout(3200);
  const liveState = await page.locator(".screen").evaluate((screen) => ({
    sameNode: (window as typeof window & { discussionScreen?: Element }).discussionScreen === screen,
    scrollTop: screen.scrollTop,
  }));
  expect(liveState.sameNode).toBe(true);
  expect(Math.abs(liveState.scrollTop - initialScrollTop)).toBeLessThanOrEqual(2);
  await expect(page.locator('[data-live="discussion-timer"]')).not.toHaveText(initialTimer ?? "");
  await expect(page.locator(".screen__inner")).not.toHaveClass(/is-entering/);

  const firstQueueButton = page.locator('[data-player-id]').first();
  await firstQueueButton.focus();
  await firstQueueButton.click();
  await expect(firstQueueButton).toBeFocused();
  const actionScrollTop = await page.locator(".screen").evaluate((screen) => screen.scrollTop);
  await page.getByRole("button", { name: "NGƯỜI TIẾP THEO" }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByText("Đang được mời nói")).toBeVisible();
  await expect(page.locator(".speaker-spotlight").getByText("Người chơi 1", { exact: true })).toBeVisible();
  expect(Math.abs(await page.locator(".screen").evaluate((screen) => screen.scrollTop) - actionScrollTop)).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "TẠM DỪNG" }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByRole("button", { name: "TIẾP TỤC" })).toBeVisible();
  await page.getByRole("button", { name: "+30 GIÂY" }).evaluate((button: HTMLButtonElement) => button.click());
  await page.getByRole("button", { name: "TIẾP TỤC" }).evaluate((button: HTMLButtonElement) => button.click());
  await page.getByRole("button", { name: "HẠ NHIỆT 10 GIÂY" }).evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator('[data-live="cooldown"]')).toBeVisible();
  const patchedState = await page.locator(".screen").evaluate((screen) => ({
    sameNode: (window as typeof window & { discussionScreen?: Element }).discussionScreen === screen,
    scrollTop: screen.scrollTop,
  }));
  expect(patchedState.sameNode).toBe(true);
  expect(Math.abs(patchedState.scrollTop - actionScrollTop)).toBeLessThanOrEqual(2);
  await page.waitForTimeout(10_500);
  await expect(page.locator('[data-live="cooldown"]')).toBeHidden();
  await expect(page.getByRole("button", { name: "TẠM DỪNG" })).toBeVisible();

  await page.getByRole("button", { name: "BẮT ĐẦU BỎ PHIẾU" }).click();
  await expect(page.locator('[data-screen-key="vote"]')).toBeVisible();
  const voteScreen = await page.locator(".screen").evaluate((screen) => ({
    isNewNode: (window as typeof window & { discussionScreen?: Element }).discussionScreen !== screen,
    scrollTop: screen.scrollTop,
    focused: document.activeElement === screen,
  }));
  expect(voteScreen).toEqual({ isNewNode: true, scrollTop: 0, focused: true });
});

test("restores an elimination phase after reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("who-is-the-imposter:game:v2", JSON.stringify({
    version: 2,
    gameId: "resume-test",
    phase: "elimination",
    config: { imposterCount: 1, imposterWordMode: "similar", multiRound: true, revealRoleOnElimination: true, timerEnabled: false, timerMinutes: 3 },
    players: [
      { id: "a", name: "An", avatar: "◆", accent: "#38D8FF", eliminated: true, secret: { role: "civilian", word: "Phở", hint: null, meaning: "Món ăn" } },
      { id: "b", name: "Bình", avatar: "●", accent: "#FF9A3D", eliminated: false, secret: { role: "imposter", word: "Bún bò", hint: null, meaning: null } },
      { id: "c", name: "Chi", avatar: "▲", accent: "#FF66B3", eliminated: false, secret: { role: "civilian", word: "Phở", hint: null, meaning: "Món ăn" } },
    ],
    wordSelection: { civilianWord: "Phở", civilianMeaning: "Món ăn", imposterWord: "Bún bò", imposterHint: null, mode: "similar", source: "pair" },
    revealIndex: 2,
    revealedPlayerIds: ["a", "b", "c"],
    round: 2,
    vote: { votes: { a: "a", b: "a", c: "a" }, pendingTargetId: "a" },
    lastElimination: { playerId: "a", voteCount: 3, role: "civilian", gameOver: false, winner: null },
    gameOver: false,
    winner: null,
    createdAt: 1,
    updatedAt: 2,
  })));
  await page.reload();
  await page.getByRole("button", { name: "TIẾP TỤC" }).click();
  await expect(page.getByText("An là")).toBeVisible();
  await page.getByRole("button", { name: "TIẾP TỤC VÁN" }).click();
  await expect(page.getByRole("heading", { name: "Ai đang giả vờ?" })).toBeVisible();
});

test("installed resources can open with the network offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByText("Sẵn sàng chơi offline")).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.getByText("Sẵn sàng chơi offline")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "CHƠI NGAY" })).toBeEnabled();
});
