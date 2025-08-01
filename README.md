# smooth-scroll

Smooth scroll of text-editor by mouse & keybord. It's provided via `requestAnimationFrame` instead of CSS. Alternative scroll mode (different speed) and horizontal scroll mode included.

![demo](https://github.com/asiloisad/pulsar-smooth-scroll/blob/master/assets/demo.gif?raw=true)

## Installation

To install `smooth-scroll` search for [smooth-scroll](https://web.pulsar-edit.dev/packages/smooth-scroll) in the Install pane of the Pulsar settings or run `ppm install smooth-scroll`. Alternatively, you can run `ppm install asiloisad/pulsar-smooth-scroll` to install a package directly from the GitHub repository.

## Commands

Scrolling text-editor by mouse wheel:

- `MouseWheel`: vertical page scrolling
- `Alt-MouseWheel`: vertical page scrolling (alternative)
- `Shift-MouseWheel`: horizontal page scrolling
- `Alt-Shift-MouseWheel`: horizontal page scrolling (alternative)

In `atom-text-editor:not([mini])` there are available commands:

- `smooth-scroll:scroll-up`: (default `Alt-PageUp`) scroll current text-editor up
- `smooth-scroll:scroll-up-all`: scroll all pane-active text-editor up
- `smooth-scroll:scroll-down`: (default `Alt-PageDown`) scroll current text-editor down
- `smooth-scroll:scroll-down-all`: scroll all pane-active text-editor down
- `smooth-scroll:increase-step`: (default `Alt-Shift-PageUp`) increase scroll step of `scroll-up` and `scroll-up-all`
- `smooth-scroll:decrease-step`: (default `Alt-Shift-PageDown`) decrease scroll step of `scroll-down` and `scroll-down-all`
- `smooth-scroll:scroll-to-cursor`: scroll current text-editor to last added cursor

# Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback’s welcome!
