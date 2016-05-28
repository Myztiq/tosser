/**
 * Tosser allows for easy frame to frame communication
 */
class Tosser {
  /**
   * Creates a new Tosser class
   */
  constructor () {
    this.registeredMessages = {}
    this.pendingMessages = {}
    this.messageSendTimeout = {}
    this.clientWindows = []
    this.onceRegisteredMessages = {}

    window.$('iframe').each((index, frame) => {
      return this.clientWindows.push({
        window: frame.contentWindow,
        element: window.$(frame)
      })
    })

    window.$(window).on('message', (evt) => {
      let e = evt.originalEvent

      if (!e.data) {
        return
      }

      // Parse out the data which should be a JSON string
      try {
        var data = JSON.parse(e.data)
      } catch (e) {
        // Its not valid JSON so obviously its not us talking :)
        return
      }

      // Set the default received from to have no element
      let receivedFrom = {
        element: null,
        window: e.source
      }

      // Figure out who sent us this message so we can target them if we have an element to target
      this.clientWindows.forEach((clientWindow) => {
        if (clientWindow.window === e.source) {
          receivedFrom.element = clientWindow.element
        }
      })

      if (data.ack) {
        let message = this.pendingMessages[ data.ack ]
        delete this.pendingMessages[ data.ack ]
        return message.callback(true) // Send ACK
      } else if (data.type) {
        this._sendMessage({ ack: data.id }, receivedFrom.window)
        if (this.onceRegisteredMessages[ data.type ]) {
          this.onceRegisteredMessages[ data.type ].forEach((callback) => {
            callback(data.body, receivedFrom.element)
          })
          delete this.onceRegisteredMessages[ data.type ]
        }

        if (this.registeredMessages[ data.type ]) {
          this.registeredMessages[ data.type ].forEach((callback) => {
            callback(data.body, receivedFrom.element)
          })
        }
      }
    })
  }

  _sendMessage (body, targetWindow) {
    // Make sure the message that we send out is a string and not an object.
    // IE does not like sending objects across
    body = JSON.stringify(body)
    if (targetWindow.window) {
      targetWindow.window.postMessage(body, '*')
    } else {
      let frames = this._getAllFramesEverywhere()
      frames.forEach((clientWindow) => {
        if (clientWindow.window) {
          clientWindow.window.postMessage(body, '*')
        }
      })
    }
    return this._checkMessagePool()
  }

  _getAllFramesEverywhere () {
    const _getWindowsFrames = (window) => {
      let rtn = []
      window.frames.forEach((frame) => {
        rtn.push(frame)
        rtn = rtn.concat(_getWindowsFrames(frame))
      })
      return rtn
    }

    let rtn = _getWindowsFrames(window.top)
    rtn.push(window.top)
    return rtn
  }

  _checkMessagePool () {
    clearTimeout(this.messageSendTimeout)
    this.messageSendTimeout = setTimeout(() => {
      this.pendingMessages.forEach((pendingMessage, index) => {
        pendingMessage.message.attempt++
        if (pendingMessage.message.attempt > 20) {
          delete this.pendingMessages[ index ]
          pendingMessage.callback(false) // send NACK
        } else {
          this._sendMessage(pendingMessage.message, pendingMessage.target)
        }
      })
    }, 250)
  }

  _prepMessage (type, content = '') {
    let message = {
      type,
      body: content,
      id: Math.random(),
      attempt: 0
    }
    return message
  }

  /**
   * Trigger a message as if it was just received from a remote source
   * @param type
   * @param content
   */
  trigger (type, content = '') {
    if (this.registeredMessages[ type ]) {
      this.registeredMessages[ type ].forEach((callback) => {
        callback(content)
      })
    }
  }

  /**
   * Broadcast a message to every frame
   * @param type
   * @param content
   * @param callback
   * @returns {*}
   */
  broadcast (type, content = '', callback = () => {}) {
    let message = this._prepMessage(type, content, callback)
    this.pendingMessages[ message.id ] = {
      message,
      callback,
      target: null
    }
    return this._sendMessage(message)
  }

  /**
   * Send a message just to the parent frame
   * @param type
   * @param content
   * @param callback
   * @returns {*}
   */
  sendToParent (type, content = '', callback = () => {}) {
    if (window.parent && window.parent !== window) {
      let message = this._prepMessage(type, content, callback)
      this.pendingMessages[ message.id ] = {
        message,
        callback,
        target: window.parent
      }
      return this._sendMessage(message, window.parent)
    }
  }

  /**
   * Send a message to direct children
   * @param type
   * @param content
   * @param callback
   */
  sendToChildren (type, content = '', callback = () => {}) {
    let message = this._prepMessage(type, content, callback)
    this.clientWindows.forEach((targetWindow) => {
      this.pendingMessages[ message.id ] = {
        message,
        callback,
        target: targetWindow
      }

      return this._sendMessage(message, targetWindow)
    })
  }

  /**
   * Send a message to a target window
   * @param type
   * @param content
   * @param targetWindow
   * @param callback
   * @returns {*}
   */
  sendToWindow (type, content = '', targetWindow, callback = () => {}) {
    let message = this._prepMessage(type, content, callback)

    this.pendingMessages[ message.id ] = {
      message,
      callback,
      target: targetWindow
    }

    return this._sendMessage(message, targetWindow)
  }

  /**
   * Listen for a single message to be sent to the current frame
   * @param type
   * @param callback
   * @returns {Number}
   */
  once (type, callback) {
    if (!this.onceRegisteredMessages[ type ]) {
      this.onceRegisteredMessages[ type ] = []
    }
    return this.onceRegisteredMessages[ type ].push(callback)
  }

  /**
   * Listen for any messages sent to this frame
   * @param type
   * @param callback
   * @returns {Number}
   */
  on (type, callback) {
    if (!this.registeredMessages[ type ]) {
      this.registeredMessages[ type ] = []
    }
    return this.registeredMessages[ type ].push(callback)
  }
}

module.exports = Tosser
