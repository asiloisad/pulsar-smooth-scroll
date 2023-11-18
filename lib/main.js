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
      atom.workspace.observeTextEditors((editor) => { this.patchEditor(editor) }),
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
      atom.commands.add('atom-text-editor', {
        'smooth-scroll:line-up':
          () => this.scrollUpByCountOfLines(),
        'smooth-scroll:line-down':
          () => this.scrollDownByCountOfLines(),
        'smooth-scroll:line-left':
          () => this.scrollLeftByCountOfLines(),
        'smooth-scroll:line-right':
          () => this.scrollRightByCountOfLines(),
        'smooth-scroll:page-up':
          () => this.scrollPageUp(),
        'smooth-scroll:page-down':
          () => this.scrollPageDown(),
      })
    )
  },

  deactivate () {
    for (let editor of atom.workspace.getTextEditors()) {
      editor.element.removeEventListener('wheel', editor.element.wheelListener )
    }
    this.disposables.dispose()
  },

  patchEditor(editor) {
    let component = editor.component
    let element = editor.element
    let isScrolling = false
    let animationFrameId = false

    editor.pendingScrollX = 0
    editor.pendingScrollY = 0

    editor.scrollAnimation = (valueX=0, valueY=0, scrollStep=0, resetValues=false) => {
      if (resetValues) {
        editor.pendingScrollX  = parseInt(valueX, 10)
        editor.pendingScrollY  = parseInt(valueY, 10)
      } else {
        editor.pendingScrollX += parseInt(valueX, 10)
        editor.pendingScrollY += parseInt(valueY, 10)
      }
      editor.scrollStep = parseInt(scrollStep, 10)
      if (isScrolling) { return }
      return editor._scrollAnimation()
    }

    editor._scrollAnimation = () => {
      let isChangedX, isChangedY
      isScrolling = true
      let stepX = this.parseStep(editor.pendingScrollX, editor.scrollStep)
      if (stepX) {
        editor.pendingScrollX -= stepX
        isChangedX = component.setScrollLeft(component.scrollLeft+stepX)
      }
      let stepY = this.parseStep(editor.pendingScrollY, editor.scrollStep)
      if (stepY) {
        editor.pendingScrollY -= stepY
        isChangedY = component.setScrollTop(component.scrollTop+stepY)
      }
      if (isChangedX || isChangedY) {
        component.scheduleUpdate()
      } else {
        editor.pendingScrollX = 0
        editor.pendingScrollY = 0
      }
      if (editor.pendingScrollX || editor.pendingScrollY) {
        animationFrameId = requestAnimationFrame(editor._scrollAnimation)
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

  scrollPageUp() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = -editor.element.offsetHeight
    return editor.scrollAnimation(0, offset, parseInt(offset/100*this.pageFactor, 10), true)
  },

  scrollPageDown() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = +editor.element.offsetHeight
    return editor.scrollAnimation(0, offset, parseInt(offset/100*this.pageFactor, 10), true)
  },

  scrollUpByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = -editor.lineHeightInPixels*this.lineCount
    return editor.scrollAnimation(0, offset, parseInt(offset/100*this.lineFactor, 10), true)
  },

  scrollDownByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = +editor.lineHeightInPixels*this.lineCount
    return editor.scrollAnimation(0, offset, parseInt(offset/100*this.lineFactor, 10), true)
  },

  scrollLeftByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = -editor.lineHeightInPixels*this.lineCount
    return editor.scrollAnimation(offset, 0, parseInt(offset/100*this.lineFactor, 10), true)
  },

  scrollRightByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = +editor.lineHeightInPixels*this.lineCount
    return editor.scrollAnimation(offset, 0, parseInt(offset/100*this.lineFactor, 10), true)
  },
}
