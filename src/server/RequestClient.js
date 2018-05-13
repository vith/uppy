'use strict'

require('whatwg-fetch')

module.exports = class RequestClient {
  constructor (uppy, opts) {
    this.uppy = uppy
    this.opts = opts
    this.onReceiveResponse = this.onReceiveResponse.bind(this)
  }

  get hostname () {
    const uppyServer = this.uppy.state.uppyServer || {}
    const host = this.opts.host
    return uppyServer[host] || host
  }

  get defaultHeaders () {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }

  onReceiveResponse (response) {
    const uppyServer = this.uppy.state.uppyServer || {}
    const host = this.opts.host
    const headers = response.headers
    // Store the self-identified domain name for the uppy-server we just hit.
    if (headers.has('i-am') && headers.get('i-am') !== uppyServer[host]) {
      this.uppy.setState({
        uppyServer: Object.assign({}, uppyServer, {
          [host]: headers.get('i-am')
        })
      })
    }
    return response
  }

  get (path) {
    return fetch(this._getUrl(path), {
      method: 'get',
      headers: this.defaultHeaders
    })
      // @todo validate response status before calling json
      .then(this.onReceiveResponse)
      .then((res) => res.json())
  }

  post (path, data) {
    return fetch(this._getUrl(path), {
      method: 'post',
      headers: this.defaultHeaders,
      body: JSON.stringify(data)
    })
      .then(this.onReceiveResponse)
      .then((res) => {
        if (res.status < 200 || res.status > 300) {
          throw new Error(res.statusText)
        }
        return res.json()
      })
  }

  _getUrl (url) {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      return url
    }
    return `${this.hostname}/${url}`
  }
}
