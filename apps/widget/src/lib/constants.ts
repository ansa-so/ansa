/**
 * Widget Z-Index Constants
 *
 * The widget will be embedded on external websites with unknown z-index values.
 * We use the maximum safe integer (2^31 - 1) to ensure the widget always appears
 * above all other elements, including modals, overlays, and navigation menus.
 *
 * This value is the highest z-index that browsers reliably support across all platforms.
 */
export const WIDGET_Z_INDEX = 2147483647;
