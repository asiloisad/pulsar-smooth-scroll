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
      atom.config.observe("smooth-scroll.scrollAllWithCtrl", (value) => {
        this.scrollAllWithCtrl = value;
      }),
      atom.config.observe("smooth-scroll.useAltMultiplier", (value) => {
        this.useAltMultiplier = value;
      }),
      atom.config.observe("smooth-scroll.horizontalWithShift", (value) => {
        this.horizontalWithShift = value;
      }),
      atom.config.observe("smooth-scroll.reverseWheelDirection", (value) => {
        this.reverseWheelDirection = value;
      }),
      atom.config.observe("smooth-scroll.wheelSmoothness", (value) => {
        this.wheelSmoothness = value;
      }),
      atom.config.observe("smooth-scroll.wheelMultiplier", (value) => {
        this.wheelMultiplier = value;
      }),
      atom.config.observe("smooth-scroll.altWheelMultiplier", (value) => {
        this.altWheelMultiplier = value;
      }),
      atom.config.observe("smooth-scroll.commandSmoothness", (value) => {
        this.commandSmoothness = value;
      }),
      atom.config.observe("smooth-scroll.commandDistance", (value) => {
        this.commandDistance = value;
      }),
      atom.commands.add("atom-text-editor:not([mini])", {
        "smooth-scroll:increase-command-distance": () => this.increaseCommandDistance(),
        "smooth-scroll:decrease-command-distance": () => this.decreaseCommandDistance(),
        "smooth-scroll:scroll-up": () => this.scrollUpOne(),
        "smooth-scroll:scroll-up-all": () => this.scrollUpAll(),
        "smooth-scroll:scroll-down": () => this.scrollDownOne(),
        "smooth-scroll:scroll-down-all": () => this.scrollDownAll(),
        "smooth-scroll:scroll-to-cursor": () => this.scrollToLastCursor(),
      }),
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
    let lastAnimationTime = false;
    let pendingScrollX = 0;
    let pendingScrollY = 0;
    let targetScrollLeft = component.scrollLeft;
    let targetScrollTop = component.scrollTop;
    let virtualScrollLeft = component.scrollLeft;
    let virtualScrollTop = component.scrollTop;
    let smoothness = this.wheelSmoothness;

    const resetValues = () => {
      pendingScrollX = 0;
      pendingScrollY = 0;
      targetScrollLeft = component.scrollLeft;
      targetScrollTop = component.scrollTop;
      virtualScrollLeft = component.scrollLeft;
      virtualScrollTop = component.scrollTop;
    };

    const stopAnimation = () => {
      if (animationID) {
        cancelAnimationFrame(animationID);
        animationID = false;
      }
      lastAnimationTime = false;
      isScrolling = false;
      resetValues();
    };

    const normalizeWheelDelta = (event) => {
      let deltaX = event.deltaX;
      let deltaY = event.deltaY;

      if (typeof deltaX !== "number" && typeof event.wheelDeltaX === "number") {
        deltaX = -event.wheelDeltaX;
      }
      if (typeof deltaY !== "number" && typeof event.wheelDeltaY === "number") {
        deltaY = -event.wheelDeltaY;
      } else if (typeof deltaY !== "number" && typeof event.wheelDelta === "number") {
        deltaY = -event.wheelDelta;
      }

      deltaX = deltaX || 0;
      deltaY = deltaY || 0;

      if (event.deltaMode === 1) {
        const lineHeight = editor.getLineHeightInPixels();
        deltaX *= lineHeight;
        deltaY *= lineHeight;
      } else if (event.deltaMode === 2) {
        deltaX *= element.offsetWidth;
        deltaY *= element.offsetHeight;
      }

      return {
        x: deltaX / 100,
        y: deltaY / 100,
      };
    };

    element.scrollAnimation = (props) => {
      if (props.reset) {
        resetValues();
      } else if (!isScrolling) {
        targetScrollLeft = component.scrollLeft;
        targetScrollTop = component.scrollTop;
        virtualScrollLeft = component.scrollLeft;
        virtualScrollTop = component.scrollTop;
      }
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
          targetScrollTop = pixelPosition.top - scrollMargin;
        } else {
          let scrollDelta = pixelPosition.top - component.scrollTop - element.offsetHeight / 2;
          const scrollMargin =
            component.getScrollContainerClientHeight() / 2 -
            component.getVerticalAutoscrollMargin();
          if (scrollDelta > 0) {
            scrollDelta = Math.max(0, scrollDelta - scrollMargin + component.getLineHeight());
          } else {
            scrollDelta = Math.min(0, scrollDelta + scrollMargin);
          }
          targetScrollTop = component.scrollTop + scrollDelta;
        }
      }
      if (Object.prototype.hasOwnProperty.call(props, "scrollLeft")) {
        // absolute
        targetScrollLeft = props.scrollLeft;
      } else if (Object.prototype.hasOwnProperty.call(props, "valueX")) {
        // relative
        targetScrollLeft += props.valueX;
      }
      if (Object.prototype.hasOwnProperty.call(props, "scrollTop")) {
        // absolute
        targetScrollTop = props.scrollTop;
      } else if (Object.prototype.hasOwnProperty.call(props, "valueY")) {
        // relative
        targetScrollTop += props.valueY;
      }
      if (Object.prototype.hasOwnProperty.call(props, "smoothness")) {
        if (props.smoothness === "wheel") {
          smoothness = this.wheelSmoothness;
        } else if (props.smoothness === "command") {
          smoothness = this.commandSmoothness;
        } else if (props.smoothness !== 0) {
          smoothness = props.smoothness;
        } else {
          return console.error("smoothness is not supported");
        }
      } else {
        smoothness = this.commandSmoothness;
      }

      targetScrollLeft = Math.max(0, Math.min(component.getMaxScrollLeft(), targetScrollLeft));
      targetScrollTop = Math.max(0, Math.min(component.getMaxScrollTop(), targetScrollTop));
      pendingScrollX = targetScrollLeft - virtualScrollLeft;
      pendingScrollY = targetScrollTop - virtualScrollTop;

      if (pendingScrollX || pendingScrollY) {
        editor.emitter.emit("scroll-animation-started");
      }
      if (isScrolling) {
        return;
      }
      isScrolling = true;
      animationID = requestAnimationFrame(scrollAnimation);
    };

    const scrollAnimation = (timestamp) => {
      let isChangedX = false,
        isChangedY = false;
      if (!lastAnimationTime) {
        lastAnimationTime = timestamp;
      }
      const elapsed = timestamp - lastAnimationTime || 1000 / 60;
      lastAnimationTime = timestamp;

      pendingScrollX = targetScrollLeft - virtualScrollLeft;
      pendingScrollY = targetScrollTop - virtualScrollTop;

      let stepX = this.calculateStep(pendingScrollX, smoothness, elapsed);
      if (stepX) {
        virtualScrollLeft += stepX;
        isChangedX = component.setScrollLeft(virtualScrollLeft);
      } else {
        pendingScrollX = 0;
      }
      let stepY = this.calculateStep(pendingScrollY, smoothness, elapsed);
      if (stepY) {
        virtualScrollTop += stepY;
        isChangedY = component.setScrollTop(virtualScrollTop);
      } else {
        pendingScrollY = 0;
      }
      if (isChangedX || isChangedY) {
        component.updateSync();
        editor.emitter.emit("scroll-animation-updated");
      }

      pendingScrollX = targetScrollLeft - virtualScrollLeft;
      pendingScrollY = targetScrollTop - virtualScrollTop;

      if (pendingScrollX || pendingScrollY) {
        animationID = requestAnimationFrame(scrollAnimation);
      } else {
        animationID = false;
        lastAnimationTime = false;
        isScrolling = false;
        editor.emitter.emit("scroll-animation-ended");
      }
    };

    element.smoothScrollListener = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }

      const direction = this.reverseWheelDirection ? -1 : 1;
      let wfactor =
        this.useAltMultiplier && e.altKey ? this.altWheelMultiplier : this.wheelMultiplier;
      let wheelDelta = normalizeWheelDelta(e);
      let valueX = wfactor * direction * wheelDelta.x;
      let valueY = wfactor * direction * wheelDelta.y;
      if (this.horizontalWithShift && e.shiftKey) {
        valueX += valueY;
        valueY = 0;
      }
      if (this.scrollAllWithCtrl && e.ctrlKey) {
        for (let pane of atom.workspace.getCenter().getPanes()) {
          let item = pane.getActiveItem();
          if (!atom.workspace.isTextEditor(item)) {
            continue;
          }
          if (!item.element || !item.element.scrollAnimation) {
            continue;
          }
          let sv = item.getScrollSensitivity();
          item.element.scrollAnimation({
            valueX: valueX * sv,
            valueY: valueY * sv,
            smoothness: "wheel",
          });
        }
      } else {
        let sv = editor.getScrollSensitivity();
        element.scrollAnimation({
          valueX: valueX * sv,
          valueY: valueY * sv,
          smoothness: "wheel",
        });
      }
    };

    element.addEventListener("wheel", element.smoothScrollListener, {
      passive: false,
    });

    element.removeSmoothScroll = () => {
      element.removeEventListener("wheel", element.smoothScrollListener, {
        passive: false,
      });
      stopAnimation();
      delete element.smoothScrollPatch;
      delete element.scrollAnimation;
      delete element.smoothScrollListener;
    };

    editor.disposables.add(
      new Disposable(() => {
        if (element.smoothScrollPatch) {
          element.removeSmoothScroll();
        }
      }),
    );
  },

  /**
   * Doubles the keyboard scroll command distance.
   */
  increaseCommandDistance() {
    atom.config.set(
      "smooth-scroll.commandDistance",
      atom.config.get("smooth-scroll.commandDistance") * 2,
    );
  },

  /**
   * Halves the keyboard scroll command distance.
   */
  decreaseCommandDistance() {
    atom.config.set(
      "smooth-scroll.commandDistance",
      atom.config.get("smooth-scroll.commandDistance") / 2,
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
    let valueY = -element.offsetHeight * this.commandDistance;
    element.scrollAnimation({ valueY, smoothness: "command", reset: true });
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
    let valueY = +element.offsetHeight * this.commandDistance;
    element.scrollAnimation({ valueY, smoothness: "command", reset: true });
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
   * @param {number} smoothness - The animation smoothness
   * @param {number} elapsed - Time elapsed since the last frame in milliseconds
   * @returns {number} The calculated step size
   */
  calculateStep(pending, smoothness, elapsed) {
    const completionThreshold = 0.01;
    if (!pending || Math.abs(pending) < completionThreshold) {
      return pending;
    }
    if (smoothness <= 1) {
      return pending;
    }

    const frameDuration = 1000 / 60;
    const frameRatio = Math.min(Math.max(elapsed / frameDuration, 0), 6);
    const frameFactor = Math.min(1, 2 / smoothness);
    const step = pending * (1 - Math.pow(1 - frameFactor, frameRatio));

    if (Math.abs(step) < completionThreshold) {
      return pending;
    }
    return step;
  },
};
