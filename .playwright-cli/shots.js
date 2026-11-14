async (page) => {
  const dir = 'docs/screenshots/';
  const tab = (name) => page.getByRole('tab', { name }).click();
  const button = (name) => page.getByRole('button', { name });
  const shot = (name) => page.screenshot({ path: dir + name + '.png' });
  const notes = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'light' });
  await button('التالي').or(page.getByRole('tab', { name: 'اليوم' })).first().waitFor();
  await page.waitForTimeout(500);

  if (await button('التالي').count()) {
    await shot('0-welcome');
    await button('التالي').click();
    await page.getByRole('textbox', { name: 'اسم فرد' }).fill('بابا');
    await button('أضف الفرد').click();
    await button('بقوليات').click();
    await shot('0b-welcome-family');
    await button('التالي').click();
    await button('اعمل الخطة وابدأ').click();
  }

  const shut = () => page.getByRole('button', { name: 'اقفل', exact: true }).click({ position: { x: 20, y: 20 } });

  await tab('الوجبات');
  notes.push('first lunch is light=' + (await button(/^غدا: صينية دجاج بالبطاطس/).count()));
  await button(/^غدا: /).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'كبسة دجاج', exact: true }).click();
  await page.waitForTimeout(300);
  notes.push('kabsa facts=' + (await page.getByText(/بيتي، حوالي 75 دقيقة، تنفع بوكس تاني يوم/).count()));
  await button('اقفلها في الخطة').click();
  await button('ضيفها للمفضلة').click();
  await shot('14-meal-sheet');
  await shut();
  await page.waitForTimeout(400);
  await button(/^أضف مكونات/).nth(1).click();
  await button('أضف أكلة').click();
  await page.getByRole('textbox', { name: 'اسم الأكلة' }).fill('محشي ورق عنب');
  await page.getByRole('textbox', { name: 'اسم المكون' }).fill('ورق عنب');
  await button('أضف المكون', ).click();
  await page.waitForTimeout(300);
  await shot('15-new-meal');
  await button('احفظ الأكلة').click();
  await page.waitForTimeout(5500);
  await shot('3-meals');
  notes.push('custom meal listed=' + (await page.getByText('محشي ورق عنب').count()));
  await button('خطة تانية للأسبوع كله').click();
  notes.push('lunch still locked=' + (await button(/^غدا: كبسة دجاج، مقفولة/).count()));

  await tab('القائمة');
  const row = button(/^دجاج، لسه/);
  if (await row.count()) {
    await row.click();
    await page.getByRole('textbox', { name: 'السعر بالريال' }).fill('36.5');
    await button('اشتريته').click();
    await button(/^بصل، لسه/).click();
    await page.getByRole('textbox', { name: 'السعر بالريال' }).fill('4');
    await button('احفظ السعر').click();
  }
  await page.waitForTimeout(5500);
  await shot('2-list');
  await button(/^أرز، لسه/).click();
  await page.waitForTimeout(600);
  await shot('13-item-sheet');
  await shut();
  await page.waitForTimeout(400);

  const drag = async (name, dx) => {
    const box = await button(name).boundingBox();
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx / 2, y, { steps: 8 });
    await page.mouse.move(x + dx, y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(900);
  };
  await drag(/^طماطم، لسه/, -220);
  notes.push('after drag left: tomato rows=' + (await button(/^طماطم،/).count()) + ' undo=' + (await button('تراجع').count()));
  await shot('11-swipe-left');
  if (await button('تراجع').count()) await button('تراجع').click();
  await page.waitForTimeout(400);
  await drag(/^طماطم، لسه/, 220);
  notes.push('after drag right: bought=' + (await button(/^طماطم، اتشترى/).count()));
  if (await button(/^طماطم، اتشترى/).count()) await page.getByRole('checkbox', { name: /^طماطم/ }).click();

  await page.getByRole('button', { name: 'المخزن', exact: true }).click();
  await button('أضف صنف للمخزن').click();
  await page.getByRole('textbox', { name: 'الصنف والحجم' }).fill('رز 10 كيلو');
  await page.getByRole('textbox', { name: 'السعر بالريال' }).fill('60');
  await page.getByRole('textbox', { name: /بيقعد كام يوم/ }).fill('42');
  await button('احفظ في المخزن').click();
  await button('أضف صنف للمخزن').click();
  await page.getByRole('textbox', { name: 'الصنف والحجم' }).fill('كمون');
  await page.getByRole('button', { name: 'توابل وبهارات', exact: true }).click();
  await page.getByRole('textbox', { name: 'السعر بالريال' }).fill('8');
  await button('احفظ في المخزن').click();
  await page.waitForTimeout(600);
  await shot('23-pantry');
  notes.push('pantry weekly share=' + (await page.getByText('نصيب الأسبوع من المخزن: 10 ريال').count()));
  await page.getByRole('button', { name: 'قائمة الأسبوع', exact: true }).click();

  await button('ابعت القائمة للمشتري').click();
  await button('ابدأ المشوار').click();
  await button(/^أرز، لسه/).click();
  await page.getByRole('textbox', { name: /بديل مقترح/ }).fill('أرز مصري');
  await button('مش لاقيه في المتجر').click();
  await page.waitForTimeout(700);
  await page.getByText('قائمة المشتريات').scrollIntoViewIfNeeded();
  await shot('16-trip');
  await button('خلّصت المشوار').click();
  await page.waitForTimeout(400);
  await shot('17-trip-done');
  notes.push('trip summary shown=' + (await page.getByText(/مش موجود: أرز/).count()));
  await button('افتح القائمة من جديد').click();
  await button(/^أرز، لسه/).click();
  await button(/^لقيته/).click();

  await button('أضف صنف').click();
  await page.waitForTimeout(600);
  await shot('10-add-sheet');
  await shut();
  await page.waitForTimeout(400);

  await tab('العروض');
  const samples = [
    ['بنده', 'أرز', '30'],
    ['بنده', 'بصل', '4'],
    ['العثيم', 'أرز', '26'],
    ['العثيم', 'طماطم', '5'],
    ['لولو', 'بصل', '3'],
  ];
  if ((await button(/^احذف عرض/).count()) === 0) {
    await button('أضف عرض').click();
    for (const [store, name, price] of samples) {
      await page.getByRole('textbox', { name: 'المتجر' }).fill(store);
      await page.getByRole('textbox', { name: 'الصنف والحجم' }).fill(name);
      await page.getByRole('textbox', { name: 'السعر بالريال' }).fill(price);
      await button('احفظ العرض').click();
    }
    await shot('12-offer-sheet');
    await shut();
    await page.waitForTimeout(400);
  }
  await shot('7-offers');
  const box = (name) => page.getByRole('textbox', { name });
  await button('احسب المشوار').click();
  await box(/هيوفّر كام/).fill('2');
  await box(/كيلو زيادة/).fill('20');
  await box(/دقايق زيادة/).fill('30');
  await box(/سعر لتر/).fill('2.33');
  await box(/لتر لكل/).fill('10');
  await box(/قيمة ساعتك/).fill('30');
  await button('احسب', ).last().click();
  await page.waitForTimeout(300);
  notes.push('far trip rejected=' + (await page.getByText('ما يستاهلش. اشتري من القريب.').count()));
  await page.getByText('ما يستاهلش. اشتري من القريب.').scrollIntoViewIfNeeded();
  await shot('22-trip-worth');
  await shut();
  await page.waitForTimeout(500);
  await button('أضف متجر').click();
  await box('اسم المتجر أو السوق').fill('سوق قريب (تجريبي)');
  await button('احفظ المتجر').click();
  await page.waitForTimeout(500);
  await button('أضف متجر').click();
  await box('اسم المتجر أو السوق').fill('سوق بعيد (تجريبي)');
  await box(/كيلو زيادة/).fill('20');
  await box(/دقايق زيادة/).fill('30');
  await button('احفظ المتجر').click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'هشتري منه', exact: true }).first().click();
  await page.getByText('متاجري', { exact: true }).scrollIntoViewIfNeeded();
  await shot('24-shops');
  notes.push('shops listed=' + (await page.getByText(/تجريبي/).count()));

  await tab('اليوم');
  await page.waitForTimeout(900);
  await shot('1-today');
  await page.getByText('ناقص تشتريه').scrollIntoViewIfNeeded();
  await shot('1b-today-lower');
  await button('سجّل حاجة اترمت').scrollIntoViewIfNeeded();
  await button('سجّل حاجة اترمت').click();
  await page.getByRole('textbox', { name: 'إيه اللي اترمى؟' }).fill('خيار');
  await page.getByRole('textbox', { name: /كان بكام/ }).fill('6');
  await page.getByRole('button', { name: 'سجّل', exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByText('تقرير الأسبوع', { exact: true }).scrollIntoViewIfNeeded();
  await shot('25-week-report');
  notes.push('waste in report=' + (await page.getByText('اترمى 1 صنف بـ 6 ريال.').count()));

  await button('الإعدادات').scrollIntoViewIfNeeded();
  await button('الإعدادات').click();
  await shot('4-settings');
  for (const word of ['بصل', 'ثوم', 'فلفل رومي', 'كرنب', 'قرنبيط', 'بروكلي', 'حليب']) {
    await page.getByRole('button', { name: word, exact: true }).click();
  }
  await page.getByRole('button', { name: 'حليب', exact: true }).scrollIntoViewIfNeeded();
  await shot('18-avoids');
  await button('ارجع لشاشة اليوم').click();

  await tab('الوجبات');
  notes.push('kabsa flagged for baba=' + (await page.getByText('مش مناسبة لـ بابا').count()));
  await page.getByRole('button', { name: 'بوكس الشغل', exact: true }).click();
  await page.getByRole('button', { name: 'بابا', exact: true }).click();
  await button('جهّز بوكسات الأسبوع').click();
  await page.waitForTimeout(400);
  await shot('19-workbox');
  notes.push('add-dish fab hidden in work view=' + ((await button('أضف أكلة').count()) === 0));
  notes.push('onion lunch not offered for box=' + ((await page.getByText(/وبينفع بوكس/).count()) === 0));
  await page.getByText('تجهيز الجمعة', { exact: true }).scrollIntoViewIfNeeded();
  await shot('26-prep');
  notes.push('prep tasks=' + (await page.getByText(/ وجبة$/).count()));
  await page.getByRole('button', { name: 'الأحد', exact: true }).scrollIntoViewIfNeeded();
  await button(/^غدا الشغل: /).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'تمام', exact: true }).click();
  await shot('20-workbox-sheet');
  await shut();
  await page.waitForTimeout(500);
  await button('أضف مشتريات البوكس للقائمة').click();
  await page.waitForTimeout(400);
  await page.getByText('ميزانية أكل الشغل').scrollIntoViewIfNeeded();
  await shot('21-workbox-budget');
  notes.push('work items toast=' + (await page.getByText(/اتضاف \d+ صنف للقائمة/).count()));
  await page.getByRole('button', { name: 'من الموجود', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'من الموجود', exact: true }).click();
  await page.getByRole('textbox', { name: /اكتب اللي موجود/ }).fill('بيض وجبنة وخبز وطماطم وموز');
  await page.waitForTimeout(6000);
  await shot('27-cook-from-have');
  notes.push('cook ready=' + (await page.getByText('تتعمل دلوقتي').count()) + ' nearly=' + (await page.getByText('ناقصها حاجة أو اتنين').count()));
  await page.getByRole('button', { name: 'أكل البيت', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'أكل البيت', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await tab('الوجبات');
  await shot('3b-meals-dark');
  await tab('القائمة');
  await shot('6-list-dark');
  notes.push('font=' + (await page.evaluate(() => document.fonts.check('16px IBMPlexSansArabic_700Bold'))));
  return notes.join(' | ');
}
