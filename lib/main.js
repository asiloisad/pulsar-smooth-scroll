'use babel'

import { CompositeDisposable } from 'atom'

export default {

  config: {
    wheelDir: {
      order: 1,
      title: 'Scroll direction',
      type: 'integer',
      enum: [
        { value: +1, description: 'Normal'  },
        { value: -1, description: 'Reverse' },
      ],
      default: +1,
    },
    wheelDiv: {
      order: 2,
      title: 'Scroll divider',
      type: 'integer',
      default: 7,
      minimum: 1,
      maximum: 20,
    },
    normalMode: {
      order: 3,
      title: 'Normal mode step factor',
      type: 'integer',
      default: 1,
      minimum: 1,
      maximum: 10,
    },
    speedMode: {
      order: 4,
      title: 'Speed mode step factor',
      type: 'integer',
      default: 5,
      minimum: 1,
      maximum: 10,
    },
    lineCount: {
      order: 5,
      title: 'Line count keyboard scroll',
      type: 'integer',
      default: 20,
      minimum: 1,
    },
    pageFactor: {
      order: 6,
      title: 'Speed factor of page scroll commands',
      type: 'integer',
      default: 3,
      minimum: 1,
      maximum: 10,
    },
    lineFactor: {
      order: 7,
      title: 'Speed factor of line scroll commands',
      type: 'integer',
      default: 3,
      minimum: 1,
      maximum: 10,
    },
  },

  activate () {
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.workspace.observePaneItems((item) => {
        if (atom.workspace.isTextEditor(item)) {
          this.patchEditor(item)
        }
        // } else if (elements = atom.views.getView(item).querySelectorAll('atom-text-editor:not([mini])')) {
        //   for (let element of elements) {
        //     this.patchEditor(element.getModel())
        //   }
        // }
      }),
      atom.config.observe('smooth-scroll.wheelDir', (value) => {
        this.wheelDir = value
      }),
      atom.config.observe('smooth-scroll.wheelDiv', (value) => {
        this.wheelDiv = value
      }),
      atom.config.observe('smooth-scroll.normalMode', (value) => {
        this.normalMode = value
      }),
      atom.config.observe('smooth-scroll.speedMode', (value) => {
        this.speedMode = value
      }),
      atom.config.observe('smooth-scroll.lineCount', (value) => {
        this.lineCount = value
      }),
      atom.config.observe('smooth-scroll.pageFactor', (value) => {
        this.pageFactor = value
      }),
      atom.config.observe('smooth-scroll.lineFactor', (value) => {
        this.lineFactor = value
      }),
      atom.commands.add('atom-text-editor:not([mini])', {
        'smooth-scroll:page-up':
          (e) => this.scrollPageUp(e),
        'smooth-scroll:page-down':
          (e) => this.scrollPageDown(e),
        'smooth-scroll:line-up':
          () => this.scrollUpByCountOfLines(),
        'smooth-scroll:line-down':
          () => this.scrollDownByCountOfLines(),
        'smooth-scroll:line-left':
          () => this.scrollLeftByCountOfLines(),
        'smooth-scroll:line-right':
          () => this.scrollRightByCountOfLines(),
      })
    )
  },

  deactivate () {
    this.disposables.dispose()
    if (elements = atom.views.getView(atom.workspace).querySelectorAll('atom-text-editor:not([mini])')) {
      for (let element of elements) {
        element.removeEventListener('wheel', element.wheelListener )
      }
    }
  },

  patchEditor(editor) {
    let component = editor.component
    let element = editor.element
    let isScrolling = false
    let animationFrameId = false
    let pendingScrollX = 0
    let pendingScrollY = 0

    editor.scrollAnimation = (valueX=0, valueY=0, scrollStep=0, resetValues=false) => {
      if (resetValues) {
        pendingScrollX  = parseInt(valueX, 10)
        pendingScrollY  = parseInt(valueY, 10)
      } else {
        pendingScrollX += parseInt(valueX, 10)
        pendingScrollY += parseInt(valueY, 10)
      }
      editor.scrollStep = parseInt(scrollStep, 10)
      if (isScrolling) { return }
      return scrollAnimation()
    }

    let scrollAnimation = () => {
      let isChangedX, isChangedY
      isScrolling = true
      let stepX = this.parseStep(pendingScrollX, editor.scrollStep)
      if (stepX) {
        pendingScrollX -= stepX
        isChangedX = component.setScrollLeft(component.scrollLeft+stepX)
      }
      let stepY = this.parseStep(pendingScrollY, editor.scrollStep)
      if (stepY) {
        pendingScrollY -= stepY
        isChangedY = component.setScrollTop(component.scrollTop+stepY)
      }
      if (isChangedX || isChangedY) {
        component.scheduleUpdate()
      } else {
        pendingScrollX = 0 ; pendingScrollY = 0
      }
      if (pendingScrollX || pendingScrollY) {
        animationFrameId = requestAnimationFrame(scrollAnimation)
      } else {
        if (animationFrameId) { cancelAnimationFrame(animationFrameId) }
        isScrolling = false
        if (element.saveFocusBufferRow) { element.saveFocusBufferRow() } // keep-focus
      }
      return isChangedX || isChangedY
    }

    element.wheelListener = (e) => {
      let scroll = -this.wheelDir*e.wheelDeltaY*editor.getScrollSensitivity()/100
      if (e.altKey) { scroll *= this.speedMode } else { scroll *= this.normalMode }
      if (e.shiftKey) {
        valueX = scroll ; valueY = 0
      } else {
        valueX = 0 ; valueY = scroll
      }
      let isChanged = editor.scrollAnimation(valueX, valueY, 0, false)
      if (isChanged) { e.preventDefault() }
      return isChanged
    }
    element.addEventListener('wheel', element.wheelListener )
  },

  parseStep(value, scrollStep) {
    if (!value) { return 0}
    scrollStep = Math.abs(scrollStep)
    if (scrollStep>0) {
      if (Math.abs(value)<scrollStep) {
        return value
      } else {
        return Math.sign(value)*scrollStep
      }
    } else {
      if (Math.abs(value)<this.wheelDiv) {
        return Math.max(Math.sign(value), parseInt(value/2, 10))
      } else {
        return parseInt(value/this.wheelDiv, 10)
      }
    }
  },

  scrollPageUp(e) {
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) { return atom.commands.dispatch(e.target, 'core:page-up') }
    let offset = -editor.element.offsetHeight
    return editor.scrollAnimation(0, offset, parseInt(offset*this.pageFactor/100, 10), true)
  },

  scrollPageDown(e) {
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) { return atom.commands.dispatch(e.target, 'core:page-down') }
    let offset = +editor.element.offsetHeight
    return editor.scrollAnimation(0, offset, parseInt(offset*this.pageFactor/100, 10), true)
  },

  scrollUpByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor() ; if (!editor) { return }
    let offset = -editor.lineHeightInPixels*this.lineCount
    return editor.scrollAnimation(0, offset, parseInt(offset*this.lineFactor/100, 10), true)
  },

  scrollDownByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor() ; if (!editor) { return }
    let offset = +editor.lineHeightInPixels*this.lineCount
    return editor.scrollAnimation(0, offset, parseInt(offset*this.lineFactor/100, 10), true)
  },

  scrollLeftByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor() ; if (!editor) { return }
    let offset = -editor.lineHeightInPixels*this.lineCount
    return editor.scrollAnimation(offset, 0, parseInt(offset*this.lineFactor/100, 10), true)
  },

  scrollRightByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor() ; if (!editor) { return }
    let offset = +editor.lineHeightInPixels*this.lineCount
    return editor.scrollAnimation(offset, 0, parseInt(offset*this.lineFactor/100, 10), true)
  },
}
