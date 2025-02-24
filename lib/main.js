const { CompositeDisposable, Disposable } = require('atom')

module.exports = {

  activate () {
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.textEditors.observe((editor) => {
        if (!editor.mini) { this.patchEditor(editor) }
      }),
      atom.config.observe('smooth-scroll.wheelDir', (value) => {
        this.wheelDir = value
      }),
      atom.config.observe('smooth-scroll.wheelDiv', (value) => {
        this.wheelDiv = value
      }),
      atom.config.observe('smooth-scroll.wheelPos', (value) => {
        this.wheelPos = value
      }),
      atom.config.observe('smooth-scroll.wheelAlt', (value) => {
        this.wheelAlt = value
      }),
      atom.config.observe('smooth-scroll.scrollDiv', (value) => {
        this.scrollDiv = value
      }),
      atom.config.observe('smooth-scroll.scrollPos', (value) => {
        this.scrollPos = value
      }),
      atom.commands.add('atom-text-editor:not([mini])', {
        'smooth-scroll:increase-step':
          () => this.increaseStep(),
        'smooth-scroll:decrease-step':
          () => this.decreaseStep(),
        'smooth-scroll:scroll-up':
          () => this.scrollUp(),
        'smooth-scroll:scroll-down':
          () => this.scrollDown(),
        'smooth-scroll:scroll-to-cursor':
          () => this.scrollToLastCursor(),
      })
    )
  },

  deactivate () {
    this.disposables.dispose()
    if (elements = document.querySelectorAll('atom-text-editor')) {
      for (let element of elements) {
        if (element.smoothScrollPatch) { element.removeSmoothScroll() }
      }
    }
  },

  patchEditor(editor) {
    const element = editor.getElement()
    if (element.smoothScrollPatch) { return } else { element.smoothScrollPatch = true }
    const component = editor.component
    let isScrolling = false
    let animationID = false
    let pendingScrollX = 0
    let pendingScrollY = 0
    let divider = this.wheelDiv

    const resetValues = () => { pendingScrollX = 0 ; pendingScrollY = 0 }

    element.scrollAnimation = (props) => {
      if (props.reset) {
        resetValues()
      }
      if (props.lastCursor) {
        let screenPosition = editor.getLastCursor().getScreenPosition()
        let pixelPosition = component.pixelPositionForScreenPosition({ row:screenPosition.row, column:screenPosition.column })
        pendingScrollY = pixelPosition.top-component.scrollTop - element.offsetHeight/2
        if (!props.center) {
          const scrollMargin = component.getScrollContainerClientHeight()/2-component.getVerticalAutoscrollMargin()
          if (pendingScrollY>0) {
            pendingScrollY = Math.max(0, pendingScrollY-scrollMargin+component.getLineHeight())
          } else {
            pendingScrollY = Math.min(0, pendingScrollY+scrollMargin)
          }
        }
      }
      if (props.hasOwnProperty('scrollLeft')) { // absolute
        pendingScrollX = props.scrollLeft-component.scrollLeft
      } else if (props.hasOwnProperty('valueX')) { // relative
        pendingScrollX += props.valueX
      }
      if (props.hasOwnProperty('scrollTop')) { // absolute
        pendingScrollY = props.scrollTop-component.scrollTop
      } else if (props.hasOwnProperty('valueY')) { // relative
        pendingScrollY += props.valueY
      }
      if (props.hasOwnProperty('divider')) {
        if (props.divider==='wheel') {
          divider = this.wheelDiv
        } else if (props.divider==='scroll') {
          divider = this.scrollDiv
        } else if (props.divider!==0) {
          divider = props.divider
        } else {
          return console.error('divider is not supported')
        }
      } else {
        divider = this.scrollDiv
      }
      if (isScrolling) { return }
      scrollAnimation()
    }

    const scrollAnimation = () => {
      let isChangedX = false, isChangedY = false
      isScrolling = true
      if (stepX = this.calculateStep(pendingScrollX, divider)) {
        pendingScrollX -= stepX
        isChangedX = component.setScrollLeft(component.scrollLeft+stepX)
      } else {
        pendingScrollX = 0
      }
      if (stepY = this.calculateStep(pendingScrollY, divider)) {
        pendingScrollY -= stepY
        isChangedY = component.setScrollTop(component.scrollTop+stepY)
      } else {
        pendingScrollY = 0
      }
      if (isChangedX || isChangedY) {
        component.updateSync()
      } else {
        resetValues()
      }
      if (pendingScrollX || pendingScrollY) {
        animationID = requestAnimationFrame(scrollAnimation)
      } else {
        if (animationID) { cancelAnimationFrame(animationID) ; animationID = false }
        isScrolling = false
        if (editor.sp) { editor.sp.wheel() } // scroll-position
      }
    }

    element.smoothScrollListener = (e) => {
      let wfactor = e.altKey ? this.wheelAlt : this.wheelPos
      let sensiti = editor.getScrollSensitivity()
      let valueX = wfactor*this.wheelDir*sensiti*-e.wheelDeltaX/100
      let valueY = wfactor*this.wheelDir*sensiti*-e.wheelDeltaY/100
      if (e.shiftKey) { valueX += valueY ; valueY = 0 }
      element.scrollAnimation({ valueX, valueY, divider:'wheel' })
    }

    element.addEventListener('wheel', element.smoothScrollListener, { passive:true })

    element.removeSmoothScroll = () => {
      element.removeEventListener('wheel', element.smoothScrollListener, { passive:true })
      delete element.smoothScrollPatch
    }

    editor.disposables.add(new Disposable(() => {
      if (element.smoothScrollPatch) { element.removeSmoothScroll() }
    }))
  },

  increaseStep() {
    atom.config.set('smooth-scroll.scrollPos', atom.config.get('smooth-scroll.scrollPos')*2)
  },

  decreaseStep() {
    atom.config.set('smooth-scroll.scrollPos', atom.config.get('smooth-scroll.scrollPos')/2)
  },

  scrollUp() {
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) { return }
    let element = editor.getElement()
    if (!element || !element.smoothScrollPatch) { return }
    let valueY = -element.offsetHeight*this.scrollPos
    element.scrollAnimation({ valueY, divider:'scroll', reset:true })
  },

  scrollDown() {
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) { return }
    let element = editor.getElement()
    if (!element || !element.smoothScrollPatch) { return }
    let valueY = +element.offsetHeight*this.scrollPos
    element.scrollAnimation({ valueY, divider:'scroll', reset:true })
  },

  scrollToLastCursor() {
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) { return }
    let element = editor.getElement()
    if (!element || !element.smoothScrollPatch) { return }
    element.scrollAnimation({ lastCursor:true })
  },

  calculateStep(pending, divider) {
    return Math.trunc(pending/divider)
  },
}
