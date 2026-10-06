const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
const { canonicalDocument } = load("src/simulations/builder/document/canonical.ts");
const recipe = require("../src/simulations/pre-made/gas/gas-pressure.recipe.json");
const authored = structuredClone(recipe.document);
authored.nodes.find(node => node.id === "canvas").configuration.showNavigation = true;
authored.presentation = convertToBoard(authored);
authored.presentation.items[0].rect = {x:0,y:0,width:600,height:320};
authored.presentation.items[1].rect = {x:640,y:0,width:320,height:100};
authored.presentation.items[2].rect = {x:640,y:130,width:320,height:240};
authored.presentation.startView = {x:-40,y:-80,width:1040,height:500};
const document = canonicalDocument(authored);
(async () => {
  const browser = await chromium.launch({ headless:true, ...(fs.existsSync(chromium.executablePath()) ? {} : {executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}) });
  const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:"reduce"});
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", error=>errors.push(error.message));
  try {
    await page.addInitScript(document=>localStorage.setItem("apertus-builder-draft-v1",JSON.stringify({document,valid:document})),document);
    await page.goto(`${process.env.UX_TEST_URL || "http://localhost:43100"}/experiments/builder`);
    await page.getByRole("button",{name:"Build",exact:true}).click();
    const scene = page.locator('[data-board-component="canvases/physical"]');
    const slider = page.locator('[data-board-component="controls/Slider"]');
    const result = page.locator('[data-board-component="displays/Readout"]');
    await scene.locator("[data-gas-volume]").waitFor();
    await page.getByRole("button",{name:"Fit content",exact:true}).click();
    const idle = async item => {
      assert.equal(await item.locator(".board-item-tools").isVisible(),false);
      assert.equal(await item.locator(".board-resize").isVisible(),false);
    };
    const selected = async item => {
      await item.locator(".board-item-tools").waitFor({state:"visible"});
      assert.equal(await item.locator(".board-item-tools").getByRole("button",{name:/^Move /}).isVisible(),true);
      assert.equal(await item.getByRole("button",{name:/^Edit /}).isVisible(),true);
      assert.equal(await item.getByRole("button",{name:/^Resize /}).isVisible(),true);
    };
    const blank = async () => {
      const bounds = await page.locator(".board-viewport").boundingBox();
      await page.mouse.click(bounds.x+bounds.width-24,bounds.y+bounds.height-70);
    };
    await idle(scene); await idle(slider); await idle(result);
    const toolbar = scene.getByRole("toolbar");
    assert.equal(await toolbar.isVisible(),false);
    const bounds = await scene.boundingBox();
    await scene.locator(".composition-display").click({position:{x:100,y:100}});
    await selected(scene);
    await toolbar.waitFor({state:"visible"});
    assert.deepEqual(await scene.boundingBox(),bounds,"Selecting must not shift or shrink the canvas");
    await toolbar.getByRole("button",{name:"Zoom in",exact:true}).click();
    await selected(scene);
    assert.equal(await toolbar.isVisible(),true);
    await slider.getByRole("slider",{name:"Volume",exact:true}).fill("1.5");
    await selected(slider);
    await idle(scene);
    assert.equal(await toolbar.isVisible(),false);
    await page.getByLabel("Pressure",{exact:true}).filter({hasText:/1.66/}).waitFor();
    await slider.getByRole("button",{name:/^Edit /}).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button",{name:"Done",exact:true}).click();
    await selected(slider);
    await blank(); await idle(slider);
    await result.click(); await selected(result); await idle(slider);
    await page.keyboard.press("Escape"); await idle(result);
    await scene.focus(); await selected(scene); await toolbar.waitFor({state:"visible"});
    await page.keyboard.press("Tab");
    assert.equal(await scene.locator(".board-item-tools").getByRole("button",{name:/^Move /}).evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press("Escape"); await idle(scene);
    assert.equal(await toolbar.isVisible(),false);
    await scene.focus(); // A new focus event restores the entire interface.
    await selected(scene);
    fs.mkdirSync("/tmp/apertus-component-tools",{recursive:true});
    await page.screenshot({path:"/tmp/apertus-component-tools/selected.png"});
    await blank();
    await page.screenshot({path:"/tmp/apertus-component-tools/idle.png"});
    assert.deepEqual(errors,[]);
    console.log("Component tools: idle, click selection, zoom, live slider, edit return, click away, Escape, keyboard access and stable canvas geometry passed.");
  } catch (error) {
    console.error((await page.locator("body").innerText()).slice(-2500));
    await page.screenshot({path:"/tmp/apertus-component-tools-failure.png"});
    throw error;
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
