const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { mkdtempSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const cards = require('../cards.json');

const home = process.env.ONCOATLAS_TEST_URL || pathToFileURL(resolve(__dirname, '../index.html')).href;
const nonTnm = new Set(['c025', 'c029', 'c030', 'c031', 'c045', 'c046', 'c050', 'c056', ...cards.filter(card => card.treatmentContexts).map(card => card.id)]);
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
        await page.locator('[data-treatment=surgery]').click();
        assert.equal(await page.locator('.treatment-content:visible').count(), 1);
        assert.ok((await page.locator('.treatment-content:visible').innerText()).trim());
        await page.locator('[data-treatment=drugs]').click();
        assert.equal(await page.locator('.treatment-content:visible').count(), 1);
        assert.match(await page.locator('#app').innerText(), /Лечение по клинической ситуации/);
        contexts++;
        continue;
      }
      const stages = card.stages ?? (card.id === 'c014' ? ['I','II','III'] : ['I','II','III','IV']);
      assert.equal(await page.locator('[data-stage]').count(), stages.length);
      for (const stage of stages) {
        await page.locator('[data-stage="' + stage + '"]').click();
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

    const newCards = cards.filter(card => card.number >= 69 && card.number <= 84);
    const stagingLinks = {
      c071: 'lung', c072: 'adrenal', c073: 'sinonasal', c074: 'kidney', c075: 'sarcoma',
      c077: 'uveal', c078: 'ampullary', c079: 'appendiceal', c083: 'lung', c084: 'sarcoma',
    };
    for (const card of newCards) {
      await page.goto(home + '#card/' + card.id);
      await page.getByRole('heading', {name:card.title, exact:true}).waitFor();
      for (const heading of [/Гистотип и локализация/, /Молекулярные паттерны/, /Диагностика/, /Онкомаркеры/, /^5\. Лечение/]) {
        assert.equal(await page.getByRole('heading', {name:heading}).count(), 1, card.id);
      }
      assert.ok(await page.locator('.sources').getByRole('link', {name:card.references[0][0]}).isVisible());
      const staging = page.getByRole('link', {name:'Открыть стадирование'});
      assert.equal(await staging.count(), stagingLinks[card.id] || card.stageOverview ? 1 : 0, card.id);
      if (stagingLinks[card.id]) assert.equal(await staging.getAttribute('href'), '#tnm/' + stagingLinks[card.id]);
      if (card.stageOverview) {
        assert.equal(await staging.getAttribute('href'), '#card/' + card.id + '/staging');
        await staging.click();
        await page.locator('#card-staging:focus').waitFor();
        assert.equal(await page.locator('#card-staging h2').innerText(), card.stageOverview.title);
        assert.equal(await page.locator('#card-staging p > b').count(), card.stageOverview.items.length);
      }
      await page.locator('[data-treatment=surgery]').click();
      const algorithm = page.getByRole('link', {name:'Подробный хирургический алгоритм'});
      assert.equal(await algorithm.count(), card.treatmentContexts ? 0 : 1, card.id);
      if (!card.treatmentContexts) {
        const stage = card.stages?.at(-1) ?? 'IV';
        await page.locator('[data-stage="' + stage + '"]').click();
        await page.locator('[data-treatment=surgery]').click();
        await algorithm.click();
        await page.getByRole('heading', {name:'Выберите клиническую ситуацию'}).waitFor();
        const returnLink = page.locator('#app .actions').getByRole('link', {name:card.title, exact:true});
        if (card.number >= 77) {
          assert.ok(await page.getByRole('heading', {name:'Операционное видео', exact:true}).isVisible(), card.id);
        }
        await returnLink.click();
        await page.locator('[data-stage="' + stage + '"][aria-pressed=true]').waitFor();
        assert.equal(await page.locator('[data-treatment=surgery]').getAttribute('aria-pressed'), 'true', card.id);
      }
    }

    for (const card of cards.filter(item => item.stageSituations)) {
      for (const [stage, situations] of Object.entries(card.stageSituations)) {
        await page.goto(home + '#card/' + card.id + '/' + stage);
        await page.locator('[data-stage="' + stage + '"][aria-pressed=true]').waitFor();
        for (const [label] of situations) await page.getByText(label + '.', {exact:true}).waitFor();
      }
    }
    await page.goto(home + '#tnm/uveal');
    await page.getByText('Радужка · отдельные критерии T', {exact:true}).click();
    await page.getByText(/T1a ≤3 часовых секторов/).waitFor();

    await page.goto(home + '#card/c073/IV');
    await page.getByText('Паллиативные цисплатин + фторурацил при синоназальном ПКР', {exact:true}).waitFor();
    await page.goto(home + '#card/c076');
    await page.getByText('Вемурафениб + ритуксимаб при рецидивном или рефрактерном классическом ВКЛ с BRAF V600E', {exact:true}).waitFor();

    await page.goto(home + '#home');
    await page.getByRole('textbox', {name:'Поиск по справочнику'}).fill('ВКЛ');
    await page.locator('#quickSearch a[href="#card/c076"]').first().waitFor();
    await page.getByRole('textbox', {name:'Поиск по справочнику'}).fill('синоназальный ПКР');
    await page.locator('#quickSearch a[href="#surgery/c073"]').waitFor();

    await page.goto(home + '#regimens');
    await page.locator('#regimenQuery').fill('ВКЛ вемурафениб');
    await page.locator('#regimenCard').selectOption('c076');
    await page.locator('#regimenResults .regimen-result').getByRole('link').click();
    await page.getByRole('heading', {name:'Волосатоклеточный лейкоз', exact:true}).waitFor();
    assert.match(await page.locator(':focus').innerText(), /Вемурафениб/);

    await page.goto(home + '#regimens');
    await page.locator('#regimenCard').selectOption('c073');
    await page.locator('#regimenPurpose').selectOption('Паллиативная');
    await page.locator('#regimenResults .regimen-result').getByRole('link', {name:'Стадия IV'}).click();
    await page.locator('[data-stage=IV][aria-pressed=true]').waitFor();
    assert.match(await page.locator(':focus').innerText(), /Паллиативные цисплатин/);

    for (const [query, href] of [['ALBI', '#calculators/albi'], ['Довиль', '#scales/deauville'], ['CTCAE', '#scales/ctcae']]) {
      await page.goto(home + '#home');
      await page.getByRole('textbox', {name:'Поиск по справочнику'}).fill(query);
      await page.locator('#quickSearch a[href="' + href + '"]').click();
      await page.locator(':focus').filter({has:page.getByRole('heading', {level:2})}).waitFor();
    }
    await page.goto(home + '#card/c009');
    await page.getByRole('link', {name:'Рассчитать ALBI'}).click();
    await page.locator('#albi_bilirubin').fill('20');
    await page.locator('#albi_albumin').fill('40');
    assert.match(await page.locator('#res_albi').innerText(), /-2,541.*ALBI 2/);
    await page.locator('#albi_albumin').fill('45');
    assert.match(await page.locator('#res_albi').innerText(), /ALBI 1/);
    await page.locator('#albi_albumin').fill('20');
    assert.match(await page.locator('#res_albi').innerText(), /ALBI 3/);
    await page.locator('#albi_bilirubin').fill('0');
    assert.match(await page.locator('#res_albi').innerText(), /Проверьте/);

    await page.goto(home + '#card/c027');
    await page.getByRole('link', {name:'Deauville / Lugano'}).click();
    await page.locator('#deauville-phase').selectOption('interim');
    await page.locator('#deauville-score').selectOption('4');
    await page.locator('#deauville-new').selectOption('no');
    assert.match(await page.locator('#deauville-result').innerText(), /укажите динамику/);
    await page.locator('#deauville-change').selectOption('lower');
    assert.match(await page.locator('#deauville-result').innerText(), /в ходе лечения/);
    await page.locator('#deauville-phase').selectOption('end');
    assert.match(await page.locator('#deauville-result').innerText(), /остаточной метаболически активной/);
    await page.locator('#deauville-new').selectOption('uncertain');
    assert.match(await page.locator('#deauville-result').innerText(), /до классификации ответа/);
    await page.locator('#deauville-score').selectOption('5');
    await page.locator('#deauville-new').selectOption('yes');
    assert.match(await page.locator('#deauville-result').innerText(), /Прогрессирование/);

    await page.goto(home + '#regimens/complications');
    await page.getByRole('link', {name:/Степени токсичности/}).click();
    await page.locator('#ctcae-query').waitFor();
    assert.equal(await page.locator('#ctcae-results details').count(), 7);
    await page.locator('#ctcae-query').fill('пневмонит');
    assert.equal(await page.locator('#ctcae-results details[open]').count(), 1);
    assert.match(await page.locator('#ctcae-results').innerText(), /показан кислород/);
    await page.locator('#ctcae-query').fill('диарея');
    assert.match(await page.locator('#ctcae-results').innerText(), /Изменение консистенции/);
    await page.locator('#ctcae-query').fill('нет такого события');
    assert.match(await page.locator('#ctcae-results').innerText(), /Событие не найдено/);

    for (const [query, href] of [
      ['антрациклины', '#calculators/anthracyclines'], ['MASCC', '#scales/mascc'],
      ['CISNE', '#scales/cisne'], ['R2-ISS', '#scales/r2iss'],
    ]) {
      await page.goto(home + '#home');
      await page.getByRole('textbox', {name:'Поиск по справочнику'}).fill(query);
      await page.locator('#quickSearch a[href="' + href + '"]').click();
      await page.locator(':focus').filter({has:page.getByRole('heading', {level:2})}).waitFor();
    }
    await page.goto(home + '#calculators/anthracyclines');
    await page.locator('#anth-doxorubicin').fill('50');
    await page.locator('#anth-epirubicin').fill('125');
    await page.locator('#anth-mitoxantrone').fill('10');
    assert.match(await page.locator('#anth-result').innerText(), /^255 мг/);
    await page.locator('#anth-idarubicin').fill('-1');
    assert.match(await page.locator('#anth-result').innerText(), /Проверьте/);

    await page.goto(home + '#regimens/complications/febrile-neutropenia');
    await page.getByRole('link', {name:'MASCC', exact:true}).click();
    await page.locator('#mascc-burden').selectOption('5');
    assert.match(await page.locator('#mascc-result').innerText(), /Недостаточно данных/);
    for (const [field, value] of [['bp','5'], ['copd','4'], ['tumor','4'], ['dehydration','3'], ['outpatient','3'], ['age','2']]) {
      await page.locator('#mascc-' + field).selectOption(value);
    }
    assert.match(await page.locator('#mascc-result').innerText(), /26 из 26.*низкий/);
    await page.locator('#mascc-bp').selectOption('0');
    assert.match(await page.locator('#mascc-result').innerText(), /21 из 26.*низкий/);
    await page.locator('#mascc-age').selectOption('0');
    assert.match(await page.locator('#mascc-result').innerText(), /19 из 26.*высокий/);

    await page.goto(home + '#scales/cisne');
    await page.locator('#cisne-eligible').selectOption('no');
    assert.ok(await page.locator('#cisne-factors').isHidden());
    assert.match(await page.locator('#cisne-result').innerText(), /неприменима/);
    await page.locator('#cisne-eligible').selectOption('yes');
    for (const field of ['ecog','copd','cardiac','mucositis','monocytes','glucose']) {
      await page.locator('#cisne-' + field).selectOption('0');
    }
    assert.match(await page.locator('#cisne-result').innerText(), /0 из 8.*низкий/);
    await page.locator('#cisne-ecog').selectOption('2');
    assert.match(await page.locator('#cisne-result').innerText(), /2 из 8.*промежуточный/);
    await page.locator('#cisne-copd').selectOption('1');
    assert.match(await page.locator('#cisne-result').innerText(), /3 из 8.*высокий/);

    await page.goto(home + '#card/c029');
    await page.getByRole('link', {name:'Рассчитать R2-ISS'}).click();
    await page.locator('#r2iss-beta').fill('3');
    await page.locator('#r2iss-albumin').fill('35');
    for (const field of ['ldh','del17p','t414']) await page.locator('#r2iss-' + field).selectOption('0');
    assert.match(await page.locator('#r2iss-result').innerText(), /Недостаточно данных/);
    await page.locator('#r2iss-1q').selectOption('0');
    assert.match(await page.locator('#r2iss-result').innerText(), /ISS I · R2-ISS I · 0/);
    await page.locator('#r2iss-beta').fill('3.5');
    assert.match(await page.locator('#r2iss-result').innerText(), /ISS II · R2-ISS II · 1/);
    await page.locator('#r2iss-beta').fill('5.5');
    assert.match(await page.locator('#r2iss-result').innerText(), /ISS III · R2-ISS III · 1,5/);
    await page.locator('#r2iss-1q').selectOption('0.5');
    await page.locator('#r2iss-ldh').selectOption('1');
    assert.match(await page.locator('#r2iss-result').innerText(), /ISS III · R2-ISS IV · 3/);

    await page.goto(home + '#scales');
    await page.getByRole('link', {name:'Инструментальная диагностика · RADS'}).click();
    await page.locator('#scales-rads:focus').waitFor();
    assert.equal(await page.locator('#imaging-rads-results article').count(), 8);
    await page.getByRole('searchbox', {name:'Поиск системы RADS'}).fill('щитовидная');
    assert.equal(await page.locator('#imaging-rads-results article').count(), 1);
    assert.match(await page.locator('#imaging-rads-results').innerText(), /TI-RADS/);
    await page.getByRole('searchbox', {name:'Поиск системы RADS'}).fill('нет такой системы');
    assert.match(await page.locator('#imaging-rads-results').innerText(), /Система не найдена/);

    for (const [cardId, system] of [
      ['c004','bi-rads'], ['c020','ti-rads'], ['c013','pi-rads'], ['c009','li-rads'],
      ['c001','lung-rads'], ['c016','o-rads'], ['c012','vi-rads'], ['c048','ni-rads'],
    ]) {
      await page.goto(home + '#card/' + cardId);
      await page.locator('#app a[href="#scales/' + system + '"]').click();
      const systemPanel = page.locator('#scales-' + system);
      await page.locator('#scales-' + system + ':focus').waitFor();
      assert.ok(await systemPanel.locator('p a[href^="https://"]').count());
      await systemPanel.locator('details summary').first().click();
      assert.equal(await systemPanel.locator('details[open]').count(), 1);
    }
    await page.goto(home + '#home');
    await page.getByRole('textbox', {name:'Поиск по справочнику'}).fill('тирэдс');
    await page.locator('#quickSearch a[href="#scales/ti-rads"]').click();
    await page.locator('#scales-ti-rads:focus').waitFor();

    for (const [query, href] of [
      ['бирэдс', '#scales/bi-rads'], ['TI‑RADS', '#scales/ti-rads'],
      ['пирэдс', '#scales/pi-rads'], ['лирэдс', '#scales/li-rads'],
      ['lungrads', '#scales/lung-rads'], ['орэдс', '#scales/o-rads'],
      ['вирэдс', '#scales/vi-rads'], ['нирэдс', '#scales/ni-rads'],
      ['альби', '#calculators/albi'], ['r2iss', '#scales/r2iss'],
      ['сисне', '#scales/cisne'], ['масск', '#scales/mascc'],
      ['MALT Lugano', '#card/c082/staging'], ['c081 Lugano', '#card/c081/staging'],
    ]) {
      await page.goto(home + '#home');
      await page.getByRole('textbox', {name:'Поиск по справочнику'}).fill(query);
      await page.locator('#quickSearch a[href="' + href + '"]').first().waitFor({state:'attached'});
    }
    await page.goto(home + '#home');
    await page.getByRole('textbox', {name:'Поиск по справочнику'}).fill('CTCAE v6.0 пневмонит');
    await page.locator('#quickSearch a[href="#scales/ctcae-pneumonitis"]').click();
    await page.locator('#scales-ctcae-pneumonitis[open]:focus').waitFor();
    assert.match(await page.locator('#scales-ctcae-pneumonitis').innerText(), /показан кислород/);
    await page.locator('#ctcae-query').fill('CTCAE v6.0 диарея');
    assert.equal(await page.locator('#ctcae-results details[open]').count(), 1);

    await page.goto(home + '#home');
    await page.getByRole('textbox', {name:'Поиск по справочнику'}).fill('тебентафусп');
    await page.locator('#quickSearch a[href^="#card/c077/IV/"]').first().click();
    await page.locator('.treatment-regimen:focus').waitFor();
    assert.match(await page.locator('.treatment-regimen:focus').innerText(), /Тебентафусп/);

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
