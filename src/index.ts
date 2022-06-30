'use strict'
import { installProviderProxyFor, BRAVE } from '@synaps-io/web3-provider'
interface Color {
  primary: string;
  secondary: number;
}
/**
 * @class SynapsClient
 */

export  default class SynapsClient {
    baseURL: string
    sessionID: string
    service: string
    elementID: null | string
    colors: Color | undefined | null
    type: string
    lang: string
    tier: null
    callbacks: {[key: string]: (() => void)}
    isOpen: boolean
    alreadyInit: boolean
    styles: string
    iframe: HTMLIFrameElement | undefined | null
    loaderElement: any
    loader:  HTMLDivElement | undefined | null
    providerProxyUninstaller: (() => void) | undefined | null
    /**
   * Partial data for the colors.
   * @typedef {Object} Colors
   * @property {string} [primary]
   * @property {string} [secondary]
   */

    /**
   * Partial data for the options.
   * @typedef {Object} Options
   * @property {'modal' | 'embed'} [type] The type used
   * @property {string} [element_id] The element used for the model, or the embed
   * @property {Colors} [colors] The colors of the Verify UI
   * @property {string} [lang] The default language
   * @property {int} [tier] The tier
   */

    /**
   * Interaction with the Verify UI.
   * @param {string} [sessionID] The session ID
   * @param {'individual' | 'corporate'} [service] The service
   */
    constructor (sessionID: string, service: ('individual' | 'corporate'), url:(string|undefined)=undefined) {
        if (!sessionID || !service) { throw new Error('"sessionID" and "service" are required.') }
        if (!url) {
            this.baseURL = 'https://verify.synaps.io'
            if (service === 'corporate') {
                this.baseURL = 'https://verify-v3.synaps.io'
            }
        } else {
            this.baseURL = url
        }
        this.sessionID = sessionID
        this.service = service
        this.elementID = null
        this.type = 'modal'
        this.lang = 'en'
        this.tier = null
        this.callbacks = {}
        this.isOpen = false
        this.alreadyInit = false
        this.styles =
      '.sdk-synaps-loader-modal{position:fixed;left:0;top:0;width:100%;height:100%;z-index:9999}.sdk-synaps-loader-embed{position:relative;left:0;top:0;width:100%;height:100%;z-index:9999}.sdk-synaps-loader-logo{background-image:url(https://storage.googleapis.com/synaps-static-assets/white-loader.svg),url(https://storage.googleapis.com/synaps-static-assets/synaps-logo-white.svg);background-size:75px,25px;background-repeat:no-repeat,no-repeat;background-position:center center,center center;background-color:rgb(0 0 0 / 50%)}.sdk-synaps-container{width:100%;height:100%;border-color:transparent;border-width:0;border-style:none;left:0;top:0;-webkit-tap-highlight-color:transparent}@media(max-width:700px){.sdk-synaps-container{width:98%}}'
        this._initStyle()
    }

    _initStyle () {
        const styleSheet = document.createElement('style')
        styleSheet.type = 'text/css'
        styleSheet.innerText = this.styles
        document.head.appendChild(styleSheet)
    }
    /**
   * Setup, and init the different modules and settings.
   * @param {Options} [options] The options
   */

    init (options?: any) {
        if (!this.alreadyInit) {
            if (
                options !== null &&
        options !== void 0 &&
        options.type &&
        !['modal', 'embed'].includes(options.type)
            ) { throw new Error('The type must be either "modal" or "embed".') }
            this.elementID =
        options === null || options === void 0 ? void 0 : options.element_id
            this.colors =
        (options === null || options === void 0 ? void 0 : options.colors) || {}
            this.type =
        (options === null || options === void 0 ? void 0 : options.type) ||
        'modal'
            this.lang =
        (options === null || options === void 0 ? void 0 : options.lang) || 'en'
            this.tier = options === null || options === void 0 ? void 0 : options.tier
            this.iframe = document.createElement('iframe')
            if (!this.elementID) { this.elementID = this.type === 'modal' ? 'synaps-btn' : 'synaps-embed' }

            this._initLoad()
            this.alreadyInit = true
        }
    }
    /**
   * Initialization loader
   * @return {string}
   * @private
   */

    _initLoad () {
        this[this.type === 'modal' ? '_initModal' : '_initEmbed']()
        let eventInited = false
        window.addEventListener('message', ({ data }) => {
            if (data.type === 'ready') {
                this.loaderElement?.removeChild(this.loader)
                if(this.iframe?.contentWindow) {
                    this.providerProxyUninstaller = installProviderProxyFor([BRAVE], this.iframe.contentWindow, this._formatURL())
                }
                if (this.type === 'embed') {
                    this.iframe?.removeAttribute('style')
                }
                if (!eventInited) {
                    this._initEvents()
                    eventInited = true
                }
            }
        })
    }
    /**
   * Generate the URL of the verify UI.
   * @return {string}
   * @private
   */

    _formatURL () {
        let url = `${this.baseURL}?session_id=${this.sessionID}&service=${
            this.service
        }&type=${this.type}&lang=${this.lang || 'en'}`
        if (this.colors?.primary) url += `&primary_color=${this.colors.primary}`
        if (this.colors?.secondary) url += `&secondary=${this.colors.secondary}`
        if (this.tier) url += `&tier=${this.tier}`
        return url
    }
    /**
   * Initialize events.
   * @private
   */

    _initEvents () {
        window.addEventListener('message', ({ data }) => {
            if (!['finish', 'close'].includes(data.type)) return
            if (this.type === 'modal') this.closeFlow()
            if (typeof this.callbacks[data.type] === 'function') { this.callbacks[data.type]() }
        })
    }
    /**
   * Initialize the modal.
   * @private
   */

    _initModal () {
        document.addEventListener('click', ({ target: element }) => {
            let _element$attributes$i

            if (
                ['button', 'a'].includes((element as any)?.tagName.toLowerCase()) &&
        ((_element$attributes$i = (element as any)?.attributes.id) === null ||
        _element$attributes$i === void 0
            ? void 0
            : _element$attributes$i.value) === this.elementID &&
        !this.isOpen
            ) { this.openSession() }
        })
    }
    /**
   * Initialize the embed.
   * @return {void}
   * @private
   */

    _initEmbed (): void | NodeJS.Timeout {
        if(this.elementID) {
            const element = document.getElementById(this.elementID)
            if (!element) return setTimeout(() => this._initEmbed(), 500)
            const flow = this.getFlow()
            flow?.setAttribute('class', 'sdk-synaps-container')
            flow && element.appendChild(flow)
            this.loader = document.createElement('div')
            this.loaderElement = document.getElementById(this.elementID)
            this.loader.setAttribute(
                'class',
                'sdk-synaps-loader-embed sdk-synaps-loader-logo'
            )
            this.loaderElement.appendChild(this.loader)
            this.isOpen = true
        }
    }
    /**
   * Listen to an event.
   * @param {'finish'} [type] The event name
   * @param {function} [callback] The callback
   */

    on (type: string, callback: () => void) {
        this.callbacks[type] = callback
    }
    /**
   * Open a verify UI session.
   */

    openSession () {
        if (this.isOpen) return
        this.loader = document.createElement('div')
        this.loaderElement = document.getElementsByTagName('body')[0]
        this.loader?.setAttribute(
            'class',
            'sdk-synaps-loader-modal sdk-synaps-loader-logo'
        )
        this.loaderElement.appendChild(this.loader)
        const html = document.getElementsByTagName('html')[0]

        const src = this._formatURL()

        html.style.overflow = 'hidden'
        this.isOpen = true
        this.iframe?.setAttribute('src', src)
        this.iframe?.setAttribute(
            'allow',
            'microphone; camera; midi; encrypted-media; usb'
        )
        this.iframe?.setAttribute('allowtransparency', 'true')
        this.iframe?.setAttribute('allowfullscreen', 'true')
        this.iframe?.setAttribute('frameborder', 'none')
        this.iframe?.setAttribute('border', '0')
        this.iframe?.setAttribute('resize', 'none')
        this.iframe?.setAttribute(
            'style',
            'z-index: 99999999; overflow: hidden auto; visibility: visible; margin: 0px; padding: 0px; position: fixed; border-color: transparent; border-width: 0; border-style: none; left: 0px; top: 0px; width: 100%; height: 100%; -webkit-tap-highlight-color: transparent;'
        )
        this.iframe && document.body.appendChild(this.iframe)
    }
    /**
   * Get the flow.
   * @return {HTMLIFrameElement}
   */

    getFlow (): (HTMLIFrameElement | undefined | null) {
        this.iframe?.setAttribute('src', this._formatURL())
        this.iframe?.setAttribute(
            'allow',
            'microphone; camera; midi; encrypted-media; usb'
        )
        this.iframe?.setAttribute('allowtransparency', 'true')
        this.iframe?.setAttribute('allowfullscreen', 'true')
        this.iframe?.setAttribute('frameborder', 'none')
        this.iframe?.setAttribute('border', '0')
        this.iframe?.setAttribute('resize', 'none')
        this.iframe?.setAttribute(
            'style',
            'height:0px;width:0px;position:absolute;'
        )
        return this.iframe
    }
    /**
   * Close the verify UI session.
   */

    closeFlow () {
        const html = document.getElementsByTagName('html')[0]
        const body = document.getElementsByTagName('body')[0]
        html.style.removeProperty('overflow')
        body.style.removeProperty('overflow')
        html.style.removeProperty('margin')
        body.style.removeProperty('margin')
        this.isOpen = false
        this.iframe && document.body.removeChild(this.iframe)
        if(this.providerProxyUninstaller) {
            this.providerProxyUninstaller()
            this.providerProxyUninstaller = null
        }
    }
}
