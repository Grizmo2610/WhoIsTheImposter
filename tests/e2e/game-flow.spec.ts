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
    await page.getByRole("button", { name: index === 4 ? "BẮT ĐẦU THẢO LUẬN" : "TÔI ĐÃ ĐƯA MÁY" }).click();
  }

  await page.getByRole("button", { name: "BẮT ĐẦU BỎ PHIẾU" }).click();
  await page.locator(".player-card").first().click();
  await page.getByRole("button", { name: /XÁC NHẬN NGƯỜI CHƠI/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "XÁC NHẬN" }).click();
  await expect(page.getByText("NHIỀU PHIẾU NHẤT")).toBeVisible();
});

test("player-name XSS payload stays text", async ({ page }) => {
  const payload = '<img src=x onerror=alert(1)>';
  await page.goto("/");
  await page.getByRole("button", { name: "CHƠI NGAY" }).click();
  await page.getByLabel("Tên người chơi 1").fill(payload);
  await expect(page.locator("img[src='x']")).toHaveCount(0);
  await expect(page.getByLabel("Tên người chơi 1")).toHaveValue("<img src=x onerror=a");
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
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "CHƠI NGAY" })).toBeEnabled();
});
