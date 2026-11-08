/*
 Публикуемый на GitHub Pages справочник подтвержденных цен и доступности.
 Пустой список offers — сознательное решение: по поколениям нет утвержденного прайса.
 Для добавления услуги заполните объект только после проверки данных в техцентре.
 Изменения в этом файле видны всем посетителям: не храните здесь личные сведения.
*/
window.AR46_PRICE_CATALOG = {
  catalog_version: '2026-11-09',
  published_general_prices: {
    diagnostic_removed_rack_from: 1200,
    mechanical_repair_from: 8000,
    hydraulic_repair_from: 12000,
    electric_repair_from: 15000
  },
  offers: [],
  // Пользовательский скриншот страницы-образца; не является прайсом АвтоРейка46.
  reference_examples: [{
    brand: 'Daihatsu', model: 'Applause', generation_label: '(A101/A111) · гидро',
    source_name: 'Сайт-образец GS Service',
    source_url: 'https://gs-service.ru/remont/remont-rulevykh-reek/brand-daihatsu/daihatsu-applause/daihatsu-applause-a101-a111-1989-2000-gidro/',
    services: {repair: 9600, install: 7000}
  }]
};
