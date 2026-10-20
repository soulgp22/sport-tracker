// Le module natif AndroidWidget n'existe pas sous Jest (TurboModuleRegistry
// leverait a l'import). Les primitives rendent null : on teste la logique
// (instantane, mise a jour demandee), pas le rendu natif du widget.
module.exports = {
  FlexWidget: () => null,
  TextWidget: () => null,
  SvgWidget: () => null,
  ImageWidget: () => null,
  WidgetPreview: () => null,
  registerWidgetTaskHandler: jest.fn(),
  requestWidgetUpdate: jest.fn(() => Promise.resolve()),
  getWidgetInfo: jest.fn(() => Promise.resolve([])),
};
