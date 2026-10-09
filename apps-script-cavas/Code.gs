function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Control de Cavas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function incluir(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}
