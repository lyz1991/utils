// import Vue from 'vue'
const DEFAULT_DATA = {
  apiList: ['onMenuShareTimeline',
    'onMenuShareAppMessage',
    'onMenuShareQQ',
    'onMenuShareWeibo',
    'onMenuShareQZone',
    'getLocation',
    'openLocation',
    'checkJsApi'],
  errorType: [
    {code: '1', msg: '分享成功'},
    {code: '2', msg: '微信客户端版本过低，请升级最新版本'},
    {code: '3', msg: '获取接口的签名失效，请重新调用方法获取API授权签名'},
    {code: '4', msg: '微信分享失败，请重新分享'},
    {code: '5', msg: '接口访问失败'},
    {code: '6', msg: 'jsApi配置成功'}
  ],
  errorCb: '',
  successCb: '',
  errorCbDefault (msg) {
    console.log(msg)
  },
  successCbDefault (msg) {
    console.log(msg)
  },
  domain: {
    'test': '',
    'product': ''
  },
  count: '1'
}
/**
 * [getUrl 获取当前页面的url]
 * @return {[string]}
 */
export function getUrl () {
  let url = window.location.href.replace(window.location.hash, '')
  return url
}
/**
 * [getResource]
 * 获取当前的公众号类型，默认为测试线
 * @return {[string]} [description]
 */
export function getResource () {
  let resource = 't'
  return resource
}
/**
 * [isSupported description]
 * @jsApiList  {[Array]}   [需要检测的JS接口列表，所有JS接口列表见附录2,]
 * @success  {[Fuction]}   [以键值对的形式返回，可用的api值true，不可用为false,如：{"checkResult":{"chooseImage":true},"errMsg":"checkJsApi:ok"}]
 * @fail  {[Fuction]}  options.errorCb [description]
 */
export function isSupported () {
  window.wx.checkJsApi({
    jsApiList: DEFAULT_DATA.jsApiList,
    success (res) {
      // wxGetTicket()
      console.log(res)
    },
    fail (res) {
      DEFAULT_DATA.errorCb(DEFAULT_DATA.errorType[1])
      console.log('fail')
    }
  })
  console.log('rtext')
}
/**
 * [wxGetTicket 获取微信接口授权所需的签名]
 */
export function wxGetTicket () {
  pull.post('/sss/article/getJsSdk', {url: getUrl()}).then((res) => {
    // console.log(res.data)
    if (res.errCode === 0) {
      wxConfig(res.data)
    } else {
      DEFAULT_DATA.errorCb(DEFAULT_DATA.errorType[4])
      console.log('testLiangsheng')
    }
  })
}
/**
 * [wxConfig wx jsAPI 配置]
 * @debug  {[type]} data [开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。]
 * @appId  {[type]} data [必填，公众号的唯一标识]
 * @timestamp  {[type]} data [必填，生成签名的时间戳]
 * @nonceStr  {[type]} data [必填，生成签名的随机串]
 * @signature  {[type]} data [必填，签名，见附录1]
 * @jsApiList  {[Array]} data [必填，需要使用的JS接口列表，所有JS接口列表见附录2]
 * @fail  {[function]}
 * @success  {[function]}
 */
export function wxConfig (data) {
  window.wx.config({
    debug: false,
    appId: data.appId,
    timestamp: data.timestamp,
    nonceStr: data.nonceStr,
    signature: data.signature,
    jsApiList: DEFAULT_DATA.apiList,
    fail () {
      DEFAULT_DATA.errorCb(DEFAULT_DATA.errorType[2])
      console.log('wxConfigFail')
    },
    success () {
      DEFAULT_DATA.successCb(DEFAULT_DATA.errorType[5])
      console.log('wxConfigSucces')
    }
  })
}

export function wxApiAuth ({errorCb = '', successCb = '', url = ''} = {}) {
  DEFAULT_DATA.errorCb = errorCb || DEFAULT_DATA.errorCbDefault
  DEFAULT_DATA.successCb = successCb || DEFAULT_DATA.successCbDefault
  wxGetTicket()
  // isSupported()
}

export function wxShare ({title = '', desc = '', link = '', imgUrl = '', success = '', cancel = '', fail = ''} = {}) {
  window.wx.ready(function () {
    wxShareConfig({title, desc, link, imgUrl, success, cancel, fail})
  })
}

export function wxShareT ({title = '', desc = '', link = '', imgUrl = '', success = '', cancel = '', fail = ''} = {}) {
  wxShareConfig({title, desc, link, imgUrl, success, cancel, fail})
}

export function wxShareConfig ({title, desc, link, imgUrl, success, cancel, fail}) {
  let data = {
    title,
    desc,
    link,
    imgUrl,
    success () {
      // window.alert('成功')
      // alert(link)
      console.log('分享接口配置成功')
    },
    cancel,
    fail () {
      console.log('分享接口配置失败')
    }
  }
  console.log(data)
  window.wx.onMenuShareTimeline(data)
  window.wx.onMenuShareAppMessage(data)
  window.wx.onMenuShareQQ(data)
  window.wx.onMenuShareWeibo(data)
  window.wx.onMenuShareQZone(data)
}
export function wxMap ({latitude = '', longitude = '', name = '', imgUrl = '', address = '', scale = '', infoUrl = ''} = {}) {
  window.wx.openLocation({
    latitude,
    longitude,
    name,
    address,
    scale,
    infoUrl
  })
}
export function wxLocate (callback) {
  window.wx.ready(function () {
    window.wx.getLocation({
      type: 'wgs84', // 默认为wgs84的gps坐标，如果要返回直接给openLocation用的火星坐标，可传入'gcj02'
      success: function (res) {
        callback(res)
      }
    })
  })
}
export function wxError () {
  window.wx.error((res) => {
    DEFAULT_DATA.count++
    if (DEFAULT_DATA.count < 6) {
      wxGetTicket()
    } else {
      console.log(JSON.stringify(res))
    }
  })
}
