import { expect, test, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => {
    const lab = (window as any).styleLab;
    return lab && lab.getState().ready === true;
  });
}

test.describe("风格实验室", () => {
  test("加载后四种风格与八个空间都可用", async ({ page }) => {
    await ready(page);
    const state = await page.evaluate(() => (window as any).styleLab.getState());
    expect(state.version).toBe("1.0.0");
    expect(state.styles).toEqual(["bauhaus", "midcentury", "wabi", "dopamine"]);
    expect(state.floors).toBe(8);
    expect(state.objects).toBeGreaterThan(80);

    const buttons = page.locator("#styles button");
    await expect(buttons).toHaveCount(4);
    await expect(page.locator("#roomSel option")).toHaveCount(9);
  });

  test("切换风格会改变画面像素与实际状态", async ({ page }) => {
    await ready(page);
    await page.evaluate(() => (window as any).styleLab.setView("all-top"));
    await page.waitForTimeout(400);

    const shots: string[] = [];
    for (const id of ["bauhaus", "midcentury", "wabi", "dopamine"]) {
      const state = await page.evaluate(async (s) => {
        (window as any).styleLab.setStyle(s);
        await new Promise((r) => setTimeout(r, 420));
        return (window as any).styleLab.getState();
      }, id);
      expect(state.style).toBe(id);
      const buf = await page.locator("#view").screenshot();
      shots.push(buf.toString("base64"));
    }
    const unique = new Set(shots);
    expect(unique.size).toBe(4);
  });

  test("日夜三档与空间镜头联动", async ({ page }) => {
    await ready(page);
    await page.locator("#roomSel").selectOption("kitchen");
    await expect(page.locator("#viewSel option")).toHaveCount(2);
    await page.locator("#viewSel").selectOption("kitchen-inside");

    for (const phase of ["night", "cinema", "day"]) {
      await page.locator(`#phases button[data-id="${phase}"]`).click();
      const state = await page.evaluate(() => (window as any).styleLab.getState());
      expect(state.phase).toBe(phase);
    }

    await page.locator("#roomSel").selectOption("master");
    await expect(page.locator("#viewSel option")).toHaveCount(2);
    const state = await page.evaluate(() => (window as any).styleLab.getState());
    expect(state.room).toBe("master");
    expect(state.view).toBe("master-door");
  });

  test("复位与漫游按钮可用，无控制台错误", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("favicon")) errors.push(m.text());
    });

    await ready(page);
    await page.locator("#walkBtn").click();
    await expect(page.locator("#hud")).not.toBeEmpty();
    await page.keyboard.press("Escape");
    await expect(page.locator("#hud")).toBeEmpty();

    await page.locator("#reset").click();
    await page.locator("#togglePanel").click();
    await expect(page.locator("#controls")).toHaveClass(/collapsed/);

    expect(errors).toEqual([]);
  });
});
