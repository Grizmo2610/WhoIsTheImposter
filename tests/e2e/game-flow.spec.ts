import { expect, test } from "@playwright/test";

test("main offline game flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Sẵn sàng chơi offline")).toBeVisible();
  await page.getByRole("button", { name: "CHƠI NGAY" }).click();
  await page.getByRole("button", { name: "TIẾP TỤC" }).click();
  await page.getByRole("button", { name: "BẮT ĐẦU GAME" }).click();

  for (let index = 0; index < 4; index += 1) {
    const hold = page.locator(".secret-card");
    await hold.dispatchEvent("pointerdown", { pointerId: 1 });
    await hold.dispatchEvent("pointerup", { pointerId: 1 });
    await page.getByRole("button", { name: index === 3 ? "BẮT ĐẦU VÒNG ĐỐI CHỨNG" : "CHUYỂN MÁY CHO NGƯỜI TIẾP THEO" }).click();
  }

  await page.getByRole("button", { name: "BẮT ĐẦU BỎ PHIẾU" }).click();
  await page.locator(".player-card").first().click();
  await page.getByRole("button", { name: /XÁC NHẬN NGƯỜI CHƠI/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "XÁC NHẬN" }).click();
  await expect(page.getByText(/DÂN THƯỜNG|KẺ GIẢ DANH/)).toBeVisible();
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
    version: 3,
    gameId: "resume-test",
    phase: "elimination",
    config: { imposterCount: 1, imposterWordMode: "similar", multiRound: true, revealRoleOnElimination: true, timerEnabled: false, selectedTopics: ["Ẩm thực & Đồ uống"] },
    players: [
      { id: "a", name: "An", avatar: "◆", accent: "#38D8FF", eliminated: true, secret: { role: "civilian", word: "Phở", hint: null } },
      { id: "b", name: "Bình", avatar: "●", accent: "#FF9A3D", eliminated: false, secret: { role: "imposter", word: "Bún bò", hint: null } },
      { id: "c", name: "Chi", avatar: "▲", accent: "#FF66B3", eliminated: false, secret: { role: "civilian", word: "Phở", hint: null } },
    ],
    wordSelection: { civilianWord: "Phở", imposterContents: ["Bún bò"], hint: null, mode: "similar", sourceGroupIds: [1] },
    revealIndex: 2,
    revealedPlayerIds: ["a", "b", "c"],
    discussionEndsAt: null,
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
  await expect(page.getByText("DÂN THƯỜNG")).toBeVisible();
  await page.getByRole("button", { name: "TIẾP TỤC VÒNG" }).click();
  await expect(page.getByRole("heading", { name: "Hãy mô tả từ của bạn" })).toBeVisible();
});

test("installed resources can open with the network offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByText("Sẵn sàng chơi offline")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "CHƠI NGAY" })).toBeEnabled();
});
