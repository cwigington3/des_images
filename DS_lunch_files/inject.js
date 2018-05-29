(function inject() {
  let prefs = {
    disableAutoplay: true,
    disablePreload: true,
  };

  let preventingPreload = false;
  let monitoringUserInput = false;

  let lastCall = -2000;

  const events = {
    play: new Event('play'),
    playing: new Event('playing'),
    pause: new Event('pause'),
  };

  const originalMediaPrototypePlay = HTMLMediaElement.prototype.play;

  const userInputMonitor = {
    keydown: false,
    mousedown: false,
    touchstart: false,
    events: [['keydown', 'keyup'], ['mousedown', 'mouseup'], ['touchstart', 'touchend']],
    inputStatus: { keydown: false, mousedown: false, touchstart: false },
    listeners: {},

    init() {
      this.events.forEach(([event1, event2]) => {
        this.listeners[event1] = this.onKeyDownMouseDownToushStart.bind(this);
        this.listeners[event2] = this.onKeyUpMouseUpTouchEnd.bind(this, event1);
        window.addEventListener(event1, this.listeners[event1], true);
        window.addEventListener(event2, this.listeners[event2], true);
      });
      this.listeners.message = this.onMessage.bind(this);
      window.addEventListener('message', this.listeners.message);
    },

    uninit() {
      this.events.forEach(([event1, event2]) => {
        window.removeEventListener(event1, this.listeners[event1], true);
        window.removeEventListener(event2, this.listeners[event2], true);
      });
      window.removeEventListener('message', this.listeners.message);
    },

    onKeyDownMouseDownToushStart(event) {
      if (event.type === 'keydown' && event.keyCode !== 13 && event.keyCode !== 32) {
        return;
      }
      this.inputStatus[event.type] = true;
      postMessage({
        msg: 'dh5a:send-msg-to-frames',
        msgToSend: {
          msg: 'input-recieved',
          event: event.type,
          value: true,
        },
      }, '*');
    },

    onKeyUpMouseUpTouchEnd(statusName, event) {
      if (event.type === 'keyup' && event.keyCode !== 13 && event.keyCode !== 32) {
        return;
      }
      setTimeout(() => {
        this.inputStatus[statusName] = false;
        postMessage({
          msg: 'dh5a:send-msg-to-frames',
          msgToSend: {
            msg: 'input-recieved',
            event: statusName,
            value: false,
          },
        }, '*');
      }, 5000);
    },

    onMessage(event) {
      if (event.source === window && event.data.msg === 'dh5a:input-recieved') {
        this.inputStatus[event.data.event] = event.data.value;
      }
    },

    inputRecieved() {
      return this.inputStatus.keydown || this.inputStatus.mousedown || this.inputStatus.touchstart;
    },
  };

  function findPlayerType(el) {
    if (el.classList.contains('jw-video')
    && el.parentElement.classList.contains('jw-media')
    && el.parentElement.parentElement.classList.contains('jwplayer')
    && Object.prototype.hasOwnProperty.call(window, 'jwplayer')) {
      return 'JWPlayer';
    }
    return 'unknownPlayer';
  }

  const stopVideo = {
    JWPlayer(el) {
      const jwinstance = window.jwplayer(el.parentElement.parentElement);
      jwinstance.stop();
    },
    unknownPlayer(el) {
      if (!el.autoplay && el.preload === 'none') {
        return;
      }

      if (el.autoplay) {
        el.autoplay = false;
      }

      if (el.preload !== 'none') {
        el.preload = 'none';
      }

      el.src = el.currentSrc;
    },
  };

  function disableAutoplay(el) {
    stopVideo[findPlayerType(el)](el);
  }

  function onMediaLoadStart(event) {
    if (event.target instanceof HTMLMediaElement && !userInputMonitor.inputRecieved()) {
      disableAutoplay(event.target);
    }
  }

  function mediaPrototypePlay() {
    if (!prefs.disableAutoplay || userInputMonitor.inputRecieved()) {
      return originalMediaPrototypePlay.call(this);
    } else if (findPlayerType(this) === 'JWPlayer') {
      const jwinstance = window.jwplayer(this.parentElement.parentElement);
      jwinstance.pause();
    } else if ((performance.now() - lastCall) > 10
    && ((events.play.eventPhase
      + events.playing.eventPhase
      + events.pause.eventPhase) === Event.NONE)
    ) {
      lastCall = performance.now();
      this.dispatchEvent(events.play);
      this.dispatchEvent(events.playing);
      if (this.paused === true) {
        setTimeout(() => this.dispatchEvent(events.pause), 100);
      }
    }
    return Promise.resolve();
  }

  function init(data) {
    prefs = data;
    if (prefs.disableAutoplay && prefs.disablePreload) {
      document.querySelectorAll('audio, video').forEach(disableAutoplay);
    }
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: false,
      enumerable: true,
      value: mediaPrototypePlay,
    });
  }

  function prefsUpdated() {
    if (monitoringUserInput && !prefs.disableAutoplay) {
      userInputMonitor.uninit();
      monitoringUserInput = false;
    } else if (!monitoringUserInput && prefs.disableAutoplay) {
      userInputMonitor.init();
      monitoringUserInput = true;
    }
    if (preventingPreload && (!prefs.disableAutoplay || !prefs.disablePreload)) {
      window.removeEventListener('loadstart', onMediaLoadStart, true);
      preventingPreload = false;
    } else if (!preventingPreload && prefs.disableAutoplay && prefs.disablePreload) {
      window.addEventListener('loadstart', onMediaLoadStart, true);
      preventingPreload = true;
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) {
      return;
    }

    switch (event.data.msg) {
      case 'dh5a:init': init(event.data.prefs); break;
      case 'dh5a:domain-prefs-changed': prefs[event.data.prefName] = event.data.value; break;
      default:
    }

    if (event.data.msg === 'dh5a:init' || event.data.msg === 'dh5a:domain-prefs-changed') {
      prefsUpdated();
    }
  });

  postMessage({ msg: 'dh5a:script-injected' }, '*');
}());
