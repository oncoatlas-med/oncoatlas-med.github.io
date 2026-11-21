const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { mkdtempSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const cards = require('../cards.json');

const home = process.env.ONCOATLAS_TEST_URL || pathToFileURL(resolve(__dirname, '../index.html')).href;
const nonTnm = new Set(['c025', 'c029', 'c030', 'c031', 'c045', 'c046']);
const options = { executablePath: process.env.CHROMIUM_EXECUTABLE || undefined };
const pdfDir = mkdtempSync(resolve(tmpdir(), 'oncoatlas-pdf-'));

async function main() {
  const browser = await chromium.launch(options);
  const errors = [];
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(home);
    const warning = page.getByRole('button', {name:'Закрыть предупреждение'});
    if (await warning.isVisible()) await warning.click();
    await page.getByRole('button', {name:/Карточки ЗНО/}).click();
    await page.locator('#cardList .item').last().waitFor();
    assert.equal(await page.locator('#cardList .item').count(), cards.length);
    await page.locator('#find').fill('торипалимаб');
    assert.equal(await page.locator('#cardList .item').count(), 1);
    await page.locator('#find').fill('EGFR осимертиниб');
    assert.ok(await page.locator('#cardList .item').count() >= 1);
    await page.locator('#find').fill('несуществующее-название');
    assert.equal(await page.locator('#cardList').innerText(), 'Совпадений нет');
    await page.locator('#find').fill('');
    await page.locator('#group').selectOption('Онкогематология');
    assert.equal(await page.locator('#cardList .item').count(), cards.filter(card => card.group === 'Онкогематология').length);

    let contexts = 0;
    let renderedRegimens = 0;
    for (const card of cards) {
      await page.goto(home + '#card/' + card.id);
      await page.getByRole('heading', {name:card.title, exact:true}).waitFor();
      if (nonTnm.has(card.id)) {
        assert.equal(await page.locator('[data-stage]').count(), 0);
        assert.ok(await page.locator('.treatment-regimen:visible').count());
        contexts++;
        continue;
      }
      const stages = card.id === 'c014' ? ['I','II','III'] : ['I','II','III','IV'];
      assert.equal(await page.locator('[data-stage]').count(), stages.length);
      for (const stage of stages) {
        await page.locator('[data-stage=' + stage + ']').click();
        assert.ok((await page.locator('#stageContent').innerText()).startsWith(stage + ':'));
        await page.locator('[data-treatment=surgery]').click();
        assert.equal(await page.locator('.treatment-content:visible').count(), 1);
        assert.ok((await page.locator('.treatment-content:visible').innerText()).trim());
        await page.locator('[data-treatment=drugs]').click();
        assert.ok((await page.locator('.treatment-content:visible').innerText()).trim());
        renderedRegimens += await page.locator('.treatment-regimen:visible').count();
        contexts++;
      }
    }

    await page.goto(home + '#card/c038');
    await page.locator('[data-stage=III]').click();
    assert.match(await page.locator('.treatment-content:visible').innerText(), /Индукционная ХТ/);
    await page.locator('[data-stage=IV]').click();
    assert.doesNotMatch(await page.locator('.treatment-content:visible').innerText(), /Индукционная ХТ/);
    await page.getByRole('button', {name:'☆ В избранное'}).click();
    await page.goto(home + '#favorites');
    assert.match(await page.locator('#app').innerText(), /Рак носоглотки/);
    await page.reload();
    await page.getByRole('button', {name:'Рак носоглотки'}).click();
    await page.getByRole('heading', {name:'Рак носоглотки', exact:true}).waitFor();
    assert.equal(await page.locator('[data-stage=I]').getAttribute('aria-pressed'), 'true');
    await page.goBack();
    await page.getByRole('heading', {name:'Избранное', exact:true}).waitFor();
    await page.goForward();
    await page.getByRole('heading', {name:'Рак носоглотки', exact:true}).waitFor();

    await page.goto(home + '#card/missing');
    await page.getByRole('heading', {name:'Карточка не найдена', exact:true}).waitFor();
    await page.goto(home + '#%ZZ');
    await page.getByRole('heading', {name:'ОнкоАтлас', exact:true}).waitFor();

    await page.goto(home + '#card/c034');
    await page.locator('[data-stage=II]').click();
    await page.locator('[data-treatment=surgery]').click();
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.treatment-regimen:visible').count(), 2);
    assert.equal(await page.locator('.treatment-content:visible').count(), 2);
    const pdf = resolve(pdfDir, 'card.pdf');
    await page.pdf({path:pdf, format:'A4'});
    const text = execFileSync('pdftotext', [pdf, '-'], {encoding:'utf8'});
    assert.match(text, /4000\s+мг/);
    assert.match(text, /Независимая медицинская проверка/);
    await page.emulateMedia({media:'screen'});

    await page.goto(home);
    await page.getByRole('link', {name:/Библиотека знаний/}).click();
    await page.getByRole('link', {name:'← ОнкоАтлас'}).click();
    await page.getByRole('heading', {name:'ОнкоАтлас', exact:true}).waitFor();

    const mobile = await browser.newPage({viewport:{width:360,height:780},isMobile:true,hasTouch:true});
    mobile.on('pageerror', error => errors.push(error.message));
    for (const card of cards) {
      await mobile.goto(home + '#card/' + card.id);
      await mobile.getByRole('heading', {name:card.title, exact:true}).waitFor();
      if (!nonTnm.has(card.id)) await mobile.locator('[data-stage]').last().click();
      assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), card.id + ' overflows mobile');
    }
    assert.deepEqual(errors, []);
    console.log(`${cards.length} desktop cards, ${contexts} treatment views, ${renderedRegimens} stage regimen renderings, ${cards.length} mobile cards, navigation, search, favorites and PDF passed.`);
  } finally {
    await browser.close();
    rmSync(pdfDir,{recursive:true,force:true});
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
