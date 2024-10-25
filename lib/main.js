'use babel'

import { CompositeDisposable, Disposable } from 'atom'

export default {

  config: {
    wheelDir: {
      order: 1,
      title: 'Mouse wheel scroll direction',
      type: 'integer',
      enum: [
        { value: +1, description: 'Normal'  },
        { value: -1, description: 'Reverse' },
      ],
      default: +1,
    },
    wheelDiv: {
      order: 2,
      title: 'Mouse wheel smooth divider',
      type: 'number',
      default: 7,
      minimum: 1,
      maximum: 20,
    },
    wheelPos: {
      order: 3,
      title: 'Mouse wheel step factor',
      type: 'number',
      default: 1,
      minimum: 0.1,
      maximum: 10,
    },
    wheelAlt: {
      order: 4,
      title: 'Mouse wheel alternative step factor',
      type: 'number',
      default: 5,
      minimum: 0.1,
      maximum: 10,
    },
    scrollDiv: {
      order: 5,
      title: 'Scroll command smooth divider',
      type: 'number',
      default: 20,
      minimum: 1,
      maximum: 50,
    },
    scrollPos: {
      order: 6,
      title: 'Scroll command step factor',
      type: 'number',
      default: 1,
      minimum: 1/2/2/2/2/2,
      maximum: 1*2*2*2*2*2,
    },
  },

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
        'smooth-scroll:increase-step-factor':
          () => this.increaseStepFactor(),
        'smooth-scroll:decrease-step-factor':
          () => this.decreaseStepFactor(),
        'smooth-scroll:scroll-up':
          () => this.scrollUp(),
        'smooth-scroll:scroll-down':
          () => this.scrollDown(),
        'smooth-scroll:scroll-to-last-cursor':
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
      if (stepX = pendingScrollX/divider) {
        pendingScrollX -= stepX
        isChangedX = component.setScrollLeft(component.scrollLeft+stepX)
      }
      if (stepY = pendingScrollY/divider) {
        pendingScrollY -= stepY
        isChangedY = component.setScrollTop(component.scrollTop+stepY)
      }
      if (isChangedX || isChangedY) {
        component.updateSync(true)
      } else {
        resetValues()
      }
      if (pendingScrollX || pendingScrollY) {
        animationID = requestAnimationFrame(scrollAnimation)
      } else {
        if (animationID) { cancelAnimationFrame(animationID) ; animationID = false }
        isScrolling = false
        if (element.saveFocusBufferRow) { element.saveFocusBufferRow() } // keep-focus
      }
    }

    element.smoothScrollListener = (e) => {
      let scroll = -this.wheelDir*e.wheelDeltaY*editor.getScrollSensitivity()/100
      if (e.altKey) {
        scroll *= this.wheelAlt
      } else {
        scroll *= this.wheelPos
      }
      if (e.shiftKey) {
        valueX = scroll ; valueY = 0
      } else {
        valueX = 0 ; valueY = scroll
      }
      element.scrollAnimation({ valueX, valueY, divider:'wheel' })
    }

    element.addEventListener('wheel', element.smoothScrollListener )

    element.removeSmoothScroll = () => {
      element.removeEventListener('wheel', element.smoothScrollListener )
      delete element.smoothScrollPatch
    }

    editor.disposables.add(new Disposable(() => {
      if (element.smoothScrollPatch) { element.removeSmoothScroll() }
    }))
  },

  increaseStepFactor() {
    atom.config.set('smooth-scroll.scrollPos', atom.config.get('smooth-scroll.scrollPos')*2)
  },

  decreaseStepFactor() {
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
    let element = editor.getElem
    if (!element || !element.smoothScrollPatch) { return }
    element.scrollAnimation({ lastCursor:true })
  }
}
