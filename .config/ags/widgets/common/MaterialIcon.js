// No direct import needed for <label> intrinsic from 'ags/widgets'
// import Gtk from 'gi://Gtk'; // Only if specific Gtk.Label properties not covered by intrinsic are needed

/**
 * A simple widget for displaying Material Icons using a label.
 * Assumes a Material Icons font is set up and will render icons based on ligatures.
 * @param {object} props
 * @param {string} props.icon The icon name (ligature, e.g., "search", "settings").
 * @param {'small' | 'norm' | 'big' | 'large' | 'huge' | 'hugeass' | string} props.size
 *        A predefined size string that maps to a CSS class like 'txt-small', 'txt-norm', etc.
 *        Can also be a custom string if corresponding CSS class exists.
 * @param {string=} props.className Additional CSS classes to apply.
 * @param {object=} props.props Other properties to pass to the Label widget.
 */
export default function MaterialIcon({ icon, size, className = '', ...props }) {
    const sizeClass = size ? `txt-${size}` : 'txt-norm';
    const combinedClassName = `icon-material ${sizeClass} ${className}`.trim();

    return <label class={combinedClassName} label={icon} {...props} />;
}
