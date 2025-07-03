// Gtk import not needed if only using intrinsics and not Gtk enums/classes directly
// import { Gtk } from 'ags/gtk4';
// No import for <box> intrinsic

export default function ConfigGap({
    vertical = true,
    size = 5,
    className = '',
    ...rest
}) {
    const gapClassName = `config-gap ${vertical ? 'gap-v' : 'gap-h'}-${size} ${className}`;

    // This component relies on CSS classes to define the actual gap/spacing.
    // e.g., .gap-v-5 { margin-top: 5px; margin-bottom: 5px; } or min-height: 10px;
    return (
        <box
            {...rest}
            class={gapClassName.trim()}
            // If explicit sizing is needed and not purely by CSS:
            // css={vertical ? `min-height: ${size * 2}px;` : `min-width: ${size * 2}px;`}
        />
    );
}
