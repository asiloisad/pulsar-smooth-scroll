const { CompositeDisposable, Disposable } = require("atom");

/**
 * Smooth Scroll Package
 * Provides smooth scrolling animations for text editors in Pulsar/Atom.
 * Supports configurable scroll behavior, keyboard shortcuts, and multi-pane scrolling.
 */
module.exports = {
  /**
   * Activates the package and sets up all event listeners and commands.
   */
  activate() {
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.textEditors.observe((editor) => {
        if (!editor.mini) {
          this.patchEditor(editor);
        }
      }),
      atom.config.observe("smooth-scroll.ctrlMode", (value) => {
        this.ctrlMode = value;
      }),
      atom.config.observe("smooth-scroll.altMode", (value) => {
        this.altMode = value;
      }),
      atom.config.observe("smooth-scroll.shiftMode", (value) => {
        this.shiftMode = value;
      }),
      atom.config.observe("smooth-scroll.wheelDir", (value) => {
        this.wheelDir = value;
      }),
      atom.config.observe("smooth-scroll.wheelDiv", (value) => {
        this.wheelDiv = value;
      }),
      atom.config.observe("smooth-scroll.wheelPos", (value) => {
        this.wheelPos = value;
      }),
      atom.config.observe("smooth-scroll.wheelAlt", (value) => {
        this.wheelAlt = value;
      }),
      atom.config.observe("smooth-scroll.scrollDiv", (value) => {
        this.scrollDiv = value;
      }),
      atom.config.observe("smooth-scroll.scrollPos", (value) => {
        this.scrollPos = value;
      }),
      atom.commands.add("atom-text-editor:not([mini])", {
        "smooth-scroll:increase-step": () => this.increaseStep(),
        "smooth-scroll:decrease-step": () => this.decreaseStep(),
        "smooth-scroll:scroll-up": () => this.scrollUpOne(),
        "smooth-scroll:scroll-up-all": () => this.scrollUpAll(),
        "smooth-scroll:scroll-down": () => this.scrollDownOne(),
        "smooth-scroll:scroll-down-all": () => this.scrollDownAll(),
        "smooth-scroll:scroll-to-cursor": () => this.scrollToLastCursor(),
      })
    );
  },

  /**
   * Deactivates the package and removes all smooth scroll patches from editors.
   */
  deactivate() {
    this.disposables.dispose();
    const elements = document.querySelectorAll("atom-text-editor");
    if (elements) {
      for (let element of elements) {
        if (element.smoothScrollPatch) {
          element.removeSmoothScroll();
        }
      }
    }
  },

  /**
   * Patches an editor element with smooth scroll functionality.
   * @param {TextEditor} editor - The text editor to patch
   */
  patchEditor(editor) {
    const element = editor.getElement();
    if (element.smoothScrollPatch) {
      return;
    } else {
      element.smoothScrollPatch = true;
    }
    const component = editor.component;
    let isScrolling = false;
    let animationID = false;
    let pendingScrollX = 0;
    let pendingScrollY = 0;
    let divider = this.wheelDiv;

    const resetValues = () => {
      pendingScrollX = 0;
      pendingScrollY = 0;
    };

    element.scrollAnimation = (props) => {
      if (props.reset) {
        resetValues();
      }
      let wasX = pendingScrollX;
      let wasY = pendingScrollY;
      if (props.lastCursor) {
        let screenPosition = editor.getLastCursor().getScreenPosition();
        let pixelPosition = component.pixelPositionForScreenPosition({
          row: screenPosition.row,
          column: screenPosition.column,
        });
        if (props.center) {
          const scrollMargin =
            (component.getScrollContainerClientHeight() -
              component.getVerticalAutoscrollMargin() +
              editor.getLineHeightInPixels()) /
            2;
          pendingScrollY =
            pixelPosition.top - component.scrollTop - scrollMargin;
        } else {
          pendingScrollY =
            pixelPosition.top - component.scrollTop - element.offsetHeight / 2;
          const scrollMargin =
            component.getScrollContainerClientHeight() / 2 -
            component.getVerticalAutoscrollMargin();
          if (pendingScrollY > 0) {
            pendingScrollY = Math.max(
              0,
              pendingScrollY - scrollMargin + component.getLineHeight()
            );
          } else {
            pendingScrollY = Math.min(0, pendingScrollY + scrollMargin);
          }
        }
      }
      if (Object.prototype.hasOwnProperty.call(props, "scrollLeft")) {
        // absolute
        pendingScrollX = props.scrollLeft - component.scrollLeft;
      } else if (Object.prototype.hasOwnProperty.call(props, "valueX")) {
        // relative
        pendingScrollX += props.valueX;
      }
      if (Object.prototype.hasOwnProperty.call(props, "scrollTop")) {
        // absolute
        pendingScrollY = props.scrollTop - component.scrollTop;
      } else if (Object.prototype.hasOwnProperty.call(props, "valueY")) {
        // relative
        pendingScrollY += props.valueY;
      }
      if (Object.prototype.hasOwnProperty.call(props, "divider")) {
        if (props.divider === "wheel") {
          divider = this.wheelDiv;
        } else if (props.divider === "scroll") {
          divider = this.scrollDiv;
        } else if (props.divider !== 0) {
          divider = props.divider;
        } else {
          return console.error("divider is not supported");
        }
      } else {
        divider = this.scrollDiv;
      }
      if (
        pendingScrollX &&
        (wasX === 0 || Math.sign(wasX) !== Math.sign(pendingScrollX))
      ) {
        pendingScrollX += (divider - 1) * Math.sign(pendingScrollX);
      }
      if (
        pendingScrollY &&
        (wasY === 0 || Math.sign(wasY) !== Math.sign(pendingScrollY))
      ) {
        pendingScrollY += (divider - 1) * Math.sign(pendingScrollY);
      }
      if (isScrolling) {
        return;
      }
      scrollAnimation();
    };

    const scrollAnimation = () => {
      let isChangedX = false,
        isChangedY = false;
      isScrolling = true;
      let stepX = this.calculateStep(pendingScrollX, divider);
      if (stepX) {
        pendingScrollX -= stepX;
        isChangedX = component.setScrollLeft(component.scrollLeft + stepX);
      } else {
        pendingScrollX = 0;
      }
      let stepY = this.calculateStep(pendingScrollY, divider);
      if (stepY) {
        pendingScrollY -= stepY;
        isChangedY = component.setScrollTop(component.scrollTop + stepY);
      } else {
        pendingScrollY = 0;
      }
      if (isChangedX || isChangedY) {
        component.updateSync();
      } else {
        resetValues();
      }
      if (pendingScrollX || pendingScrollY) {
        animationID = requestAnimationFrame(scrollAnimation);
      } else {
        if (animationID) {
          cancelAnimationFrame(animationID);
          animationID = false;
        }
        isScrolling = false;
        editor.emitter.emit("scroll-animation-ended");
      }
    };

    element.smoothScrollListener = (e) => {
      let wfactor = this.altMode && e.altKey ? this.wheelAlt : this.wheelPos;
      let valueX = (wfactor * this.wheelDir * -e.wheelDeltaX) / 100;
      let valueY = (wfactor * this.wheelDir * -e.wheelDeltaY) / 100;
      if (this.shiftMode && e.shiftKey) {
        valueX += valueY;
        valueY = 0;
      }
      if (this.ctrlMode && e.ctrlKey) {
        for (let pane of atom.workspace.getCenter().getPanes()) {
          let item = pane.getActiveItem();
          if (!atom.workspace.isTextEditor(item)) {
            continue;
          }
          let sv = item.getScrollSensitivity();
          item.element.scrollAnimation({
            valueX: valueX * sv,
            valueY: valueY * sv,
            divider: "wheel",
          });
        }
      } else {
        let sv = editor.getScrollSensitivity();
        element.scrollAnimation({
          valueX: valueX * sv,
          valueY: valueY * sv,
          divider: "wheel",
        });
      }
    };

    element.addEventListener("wheel", element.smoothScrollListener, {
      passive: true,
    });

    element.removeSmoothScroll = () => {
      element.removeEventListener("wheel", element.smoothScrollListener, {
        passive: true,
      });
      delete element.smoothScrollPatch;
    };

    editor.disposables.add(
      new Disposable(() => {
        if (element.smoothScrollPatch) {
          element.removeSmoothScroll();
        }
      })
    );
  },

  /**
   * Doubles the scroll step size.
   */
  increaseStep() {
    atom.config.set(
      "smooth-scroll.scrollPos",
      atom.config.get("smooth-scroll.scrollPos") * 2
    );
  },

  /**
   * Halves the scroll step size.
   */
  decreaseStep() {
    atom.config.set(
      "smooth-scroll.scrollPos",
      atom.config.get("smooth-scroll.scrollPos") / 2
    );
  },

  /**
   * Scrolls the specified editor upward.
   * @param {TextEditor} editor - The editor to scroll
   */
  scrollUp(editor) {
    if (!atom.workspace.isTextEditor(editor)) {
      return;
    }
    let element = editor.getElement();
    if (!element || !element.smoothScrollPatch) {
      return;
    }
    let valueY = -element.offsetHeight * this.scrollPos;
    element.scrollAnimation({ valueY, divider: "scroll", reset: true });
  },

  /**
   * Scrolls the active editor upward.
   */
  scrollUpOne() {
    this.scrollUp(atom.workspace.getActiveTextEditor());
  },

  /**
   * Scrolls all pane editors upward.
   */
  scrollUpAll() {
    for (let pane of atom.workspace.getPanes()) {
      this.scrollUp(pane.getActiveItem());
    }
  },

  /**
   * Scrolls the specified editor downward.
   * @param {TextEditor} editor - The editor to scroll
   */
  scrollDown(editor) {
    if (!atom.workspace.isTextEditor(editor)) {
      return;
    }
    let element = editor.getElement();
    if (!element || !element.smoothScrollPatch) {
      return;
    }
    let valueY = +element.offsetHeight * this.scrollPos;
    element.scrollAnimation({ valueY, divider: "scroll", reset: true });
  },

  /**
   * Scrolls the active editor downward.
   */
  scrollDownOne() {
    this.scrollDown(atom.workspace.getActiveTextEditor());
  },

  /**
   * Scrolls all pane editors downward.
   */
  scrollDownAll() {
    for (let pane of atom.workspace.getPanes()) {
      this.scrollDown(pane.getActiveItem());
    }
  },

  /**
   * Scrolls the active editor to center the last cursor position.
   */
  scrollToLastCursor() {
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }
    let element = editor.getElement();
    if (!element || !element.smoothScrollPatch) {
      return;
    }
    element.scrollAnimation({ lastCursor: true });
  },

  /**
   * Calculates the scroll step for smooth animation.
   * @param {number} pending - The pending scroll distance
   * @param {number} divider - The animation divider
   * @returns {number} The calculated step size
   */
  calculateStep(pending, divider) {
    return Math.trunc(pending / divider);
  },
};
