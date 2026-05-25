# smooth-scroll

Smooth scrolling for text editors via mouse and keyboard. Uses `requestAnimationFrame` with time-based target scrolling for smooth animations with alternative speed and horizontal scroll modes. A legacy divider-based scroll computation mode is also available.

![demo](https://github.com/asiloisad/pulsar-smooth-scroll/blob/master/assets/demo.gif?raw=true)

## Features

- **Smooth animation**: Uses time-based target scrolling instead of CSS, with an optional legacy divider mode.
- **Mouse wheel**: Scroll with configurable modifiers.
- **Keyboard scrolling**: PageUp/PageDown with customizable distance.
- **Multi-editor sync**: Scroll all visible editors.
- **Horizontal scroll**: Hold modifier to scroll horizontally.

## Installation

To install `smooth-scroll` search for [smooth-scroll](https://web.pulsar-edit.dev/packages/smooth-scroll) in the Install pane of the Pulsar settings or run `ppm install smooth-scroll`. Alternatively, you can run `ppm install asiloisad/pulsar-smooth-scroll` to install a package directly from the GitHub repository.

## Commands

Scrolling text-editor is done by mouse wheel. Modifiers can be used:

- Use <kbd>Ctrl</kbd> to scroll all visible text editors,
- Use <kbd>Alt</kbd> to use the alternative mouse wheel distance multiplier,
- Use <kbd>Shift</kbd> to change scroll to horizontal direction.

Commands available in `atom-text-editor:not([mini])`:

- `smooth-scroll:scroll-up`: scroll current text-editor up,
- `smooth-scroll:scroll-up-all`: scroll all pane-active text-editor up,
- `smooth-scroll:scroll-down`: scroll current text-editor down,
- `smooth-scroll:scroll-down-all`: scroll all pane-active text-editor down,
- `smooth-scroll:increase-command-distance`: increase keyboard scroll distance,
- `smooth-scroll:decrease-command-distance`: decrease keyboard scroll distance,
- `smooth-scroll:scroll-to-cursor`: scroll current text-editor to last added cursor.

## Tuning

Use `scrollComputation` to choose the animation math:

- `time-based`: frame-rate independent target scrolling. This is the default.
- `divider`: legacy frame-based divider scrolling for users who prefer the older feel.

Use `wheelSmoothness` and `commandSmoothness` to tune animation feel. In `time-based` mode, lower values catch the target faster and higher values create a longer easing tail. In `divider` mode, these values are used as the legacy frame divider.

Set `scrollComputation` to `divider` and the relevant smoothness value to `1` to use Pulsar's native scroll step while keeping this package's modifier behavior, such as Ctrl multi-editor scroll, Alt multiplier, Shift horizontal scroll, and reverse direction.

Use `wheelMultiplier`, `altWheelMultiplier`, and `commandDistance` to tune scroll distance. These settings change how far the target moves, not how long the animation takes.

## Notes

Pulsar's text editor uses virtual scrolling and snaps scroll positions to physical-pixel boundaries internally. This package keeps a floating-point target while Pulsar renders the nearest valid scroll position, which avoids the abrupt final step that can happen with frame-based pixel increments.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
